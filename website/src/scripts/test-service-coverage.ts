/**
 * Test script to audit service media coverage
 * Run with: npx tsx src/scripts/test-service-coverage.ts
 */

import { loadMediaManifest } from "@/lib/media";
import { loadProjectsManifest } from "@/lib/projects";
import { loadServicesRegistry } from "@/lib/registries";
import { validateServicesAuthority } from "@/lib/validation-engine";

function main() {
  console.log("=== Service Media Coverage Audit ===\n");

  const media = loadMediaManifest();
  const projects = loadProjectsManifest();
  const services = loadServicesRegistry();

  console.log(`Services: ${services.services.length}`);
  console.log(`Projects: ${projects.projects.length}`);
  console.log(`Media entries: ${media.media.length}\n`);

  const findings = validateServicesAuthority(services, projects, media);

  console.log("=== Validation Findings ===\n");

  if (findings.length === 0) {
    console.log("✅ All services have authority-backed media coverage");
  } else {
    console.log(`Found ${findings.length} issues:\n`);

    findings.forEach(finding => {
      const icon = finding.severity === "high" ? "🔴" : finding.severity === "medium" ? "🟡" : "🟢";
      console.log(`${icon} [${finding.severity.toUpperCase()}] ${finding.message}`);
      console.log(`   Rule: ${finding.rule}`);
      console.log(`   Path: ${finding.path}\n`);
    });
  }

  console.log("\n=== Service Coverage Summary ===\n");

  services.services.forEach(service => {
    const serviceProjects = projects.projects.filter(
      p => p.service === service.slug && p.status === 'completed'
    );

    const hasProject = serviceProjects.length > 0;
    const hasHero = hasProject && serviceProjects.some(p => p.media.hero);
    const heroMediaExists = hasHero && media.media.some(m => m.id === serviceProjects.find(p => p.media.hero)?.media.hero);

    const status = hasProject && hasHero && heroMediaExists ? "✅" : "✗";
    const details = hasProject 
      ? (hasHero ? (heroMediaExists ? "hero media exists" : "hero media missing") : "no hero media")
      : "no projects";

    console.log(`${status} ${service.name.padEnd(20)} ${details}`);
  });
}

main();
