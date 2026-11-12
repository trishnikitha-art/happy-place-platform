"use client";

import { useTextCopySource } from "@/components/text-copy";
import type { TextKey } from "@/lib/text-contract";

type Line = { key: TextKey; text: string; number?: number };
type Block = { kind: "h2" | "p" | "ul" | "ol"; lines: Line[] };

function formattedText({ key, text }: Line) {
  return (
    <span data-text-key={key} data-formatted-text="">
      {text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
        index % 2 ? <strong key={index}>{part.slice(2, -2)}</strong> : part
      )}
    </span>
  );
}

export function BlogArticleBody({ body }: { titleKey: TextKey; body: readonly (TextKey | null)[] }) {
  const { read, isPreview } = useTextCopySource();
  const blocks: Block[] = [];
  let activeList: Block | undefined;
  let firstLine = true;

  for (const key of body) {
    if (!key) {
      activeList = undefined;
      continue;
    }
    const text = read(key).trim();
    // The leading source heading and page title are independently editable.
    const sourceTitle = firstLine ? /^#\s+(.+)$/.exec(text) : null;
    if (sourceTitle) {
      firstLine = false;
      // Keep the separately editable source title available in Workbench.
      if (isPreview) blocks.push({ kind: "p", lines: [{ key, text: sourceTitle[1] }] });
      continue;
    }
    firstLine = false;
    const item = /^(-|([1-9]\d*)\.)\s+(.+)$/.exec(text);
    if (item) {
      const kind = item[2] ? "ol" : "ul";
      if (activeList?.kind !== kind) {
        activeList = { kind, lines: [] };
        blocks.push(activeList);
      }
      activeList.lines.push({ key, text: item[3], number: item[2] ? Number(item[2]) : undefined });
      continue;
    }
    activeList = undefined;
    const heading = /^#{1,2}\s+(.+)$/.exec(text);
    blocks.push({ kind: heading ? "h2" : "p", lines: [{ key, text: heading?.[1] ?? text }] });
  }

  return (
    <article className="max-w-[66ch] space-y-4 text-base text-text">
      {blocks.map(({ kind, lines }) => {
        const first = lines[0];
        switch (kind) {
          case "h2":
            return <h2 key={first.key} className="mt-9 font-display text-2xl font-bold">{formattedText(first)}</h2>;
          case "p":
            return <p key={first.key}>{formattedText(first)}</p>;
          case "ul":
          case "ol": {
            const List = kind;
            return (
              <List key={first.key} className={kind === "ol" ? "list-decimal space-y-2 ps-6" : "list-disc space-y-2 ps-6"}>
                {lines.map(line => <li key={line.key} value={line.number}>{formattedText(line)}</li>)}
              </List>
            );
          }
        }
      })}
    </article>
  );
}
