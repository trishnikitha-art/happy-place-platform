import { readdirSync } from "node:fs";
import { join } from "node:path";
import { resolveRobots, resolveSitemap } from "next/dist/build/webpack/loaders/metadata/resolve-route-data";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

type Rule = { allow: boolean; path: string };
type Group = { agents: string[]; rules: Rule[] };

// Read Next's generated robots.txt, including specific-agent precedence.
// These policies use literal path prefixes; longest match wins, with Allow
// taking precedence over an equally specific Disallow.
function parseRobots(text: string): Group[] {
  return text.split(/\n\s*\n/).map(block => {
    const group: Group = { agents: [], rules: [] };
    for (const line of block.split("\n")) {
      const match = line.match(/^(User-Agent|Allow|Disallow):\s*(.*)$/i);
      if (!match) continue;
      const [, directive, value] = match;
      if (directive.toLowerCase() === "user-agent") group.agents.push(value.toLowerCase());
      else if (value) group.rules.push({ allow: directive.toLowerCase() === "allow", path: value });
    }
    return group;
  }).filter(group => group.agents.length > 0);
}

function applicableGroups(groups: Group[], agent: string): Group[] {
  const name = agent.toLowerCase();
  const specificity = (group: Group) => Math.max(0, ...group.agents
    .filter(value => value !== "*" && name.includes(value)).map(value => value.length));
  const bestMatch = Math.max(0, ...groups.map(specificity));
  return groups.filter(group => bestMatch ? specificity(group) === bestMatch : group.agents.includes("*"));
}

function isAllowed(groups: Group[], agent: string, path: string): boolean {
  const matches = applicableGroups(groups, agent).flatMap(group => group.rules)
    .filter(rule => path.startsWith(rule.path))
    .sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return matches[0]?.allow ?? true;
}

function routePaths(directory: string, prefix: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) return routePaths(join(directory, entry.name), `${prefix}/${entry.name}`);
    return /^(page|route)\.tsx?$/.test(entry.name) ? [prefix] : [];
  });
}

const searchAgents = ["Googlebot", "OAI-SearchBot", "PerplexityBot"];
const privateRoots = [
  "/admin", "/workbench", "/api", "/dashboard", "/customers",
  "/estimates", "/photos", "/settings", "/logs", "/integrations",
];
const generatedRobots = resolveRobots(robots());
const groups = parseRobots(generatedRobots);
const sitemapPaths = Array.from(resolveSitemap(sitemap()).matchAll(/<loc>([^<]+)<\/loc>/g))
  .map(match => new URL(match[1]).pathname);
const actualPrivatePaths = ["/admin", "/workbench", "/api"].flatMap(prefix =>
  routePaths(join(process.cwd(), "src/app", prefix.slice(1)), prefix));
const slashVariants = (path: string) => [...new Set([path, path.endsWith("/") ? path : `${path}/`])];

describe("generated crawler policy", () => {
  it("advertises the canonical sitemap and host", () => {
    expect(generatedRobots).toContain("Sitemap: https://happyplacecarpentry.com/sitemap.xml");
    expect(generatedRobots).toContain("Host: https://happyplacecarpentry.com");
  });

  it("uses explicit search-agent groups without relying on wildcard inheritance", () => {
    for (const agent of ["OAI-SearchBot", "PerplexityBot"]) {
      const selected = applicableGroups(groups, agent);
      expect(selected).toHaveLength(1);
      expect(selected[0].agents).toContain(agent.toLowerCase());
      expect(selected[0].agents).not.toContain("*");
    }
  });

  it.each(searchAgents)("allows every generated sitemap entry for %s", agent => {
    expect(sitemapPaths).toContain("/contact");
    expect(sitemapPaths.some(path => path.startsWith("/projects/"))).toBe(true);
    for (const path of ["/projects", ...sitemapPaths].flatMap(slashVariants)) {
      expect({ agent, path, allowed: isAllowed(groups, agent, path) })
        .toEqual({ agent, path, allowed: true });
    }
  });

  it.each(searchAgents)("excludes actual private routes and legacy private roots for %s", agent => {
    expect(actualPrivatePaths.length).toBeGreaterThan(0);
    for (const path of [...privateRoots, ...actualPrivatePaths].flatMap(slashVariants)) {
      expect({ agent, path, allowed: isAllowed(groups, agent, path) })
        .toEqual({ agent, path, allowed: false });
      expect(sitemapPaths).not.toContain(path);
    }
  });

  it("blocks GPTBot training access across public and private paths", () => {
    const selected = applicableGroups(groups, "GPTBot");
    expect(selected).toHaveLength(1);
    expect(selected[0].agents).toEqual(["gptbot"]);
    expect(selected[0].rules).toEqual([{ allow: false, path: "/" }]);
    for (const path of ["/", "/projects", ...sitemapPaths, ...actualPrivatePaths].flatMap(slashVariants)) {
      expect({ path, allowed: isAllowed(groups, "GPTBot", path) }).toEqual({ path, allowed: false });
    }
  });
});
