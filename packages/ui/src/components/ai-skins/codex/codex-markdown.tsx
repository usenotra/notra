import { CODEX_COLORS } from "@notra/ui/constants/codex-skin";
import { cn } from "@notra/ui/lib/utils";
import type { CodexListProps, CodexTableProps } from "@notra/ui/types/codex-skin";
import type * as React from "react";
import type { ReactNode } from "react";

/** Keys items by their text, counting repeats so duplicate rows stay unique. */
const withTextKeys = <T,>(items: readonly T[], toText: (item: T) => string) => {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const text = toText(item);
    const count = (seen.get(text) ?? 0) + 1;
    seen.set(text, count);
    return { item, key: `${text}#${count}` };
  });
};

const nodeText = (node: ReactNode): string =>
  typeof node === "string" || typeof node === "number" ? String(node) : "";

export function CodexCode({ children }: { children: React.ReactNode }) {
  return <code style={{ color: CODEX_COLORS.green }}>{children}</code>;
}

export function CodexList({ items, className }: CodexListProps) {
  return (
    <ul className={cn("grid grid-cols-[2ch_minmax(0,1fr)]", className)}>
      {withTextKeys(items, nodeText).map(({ item, key }) => (
        <li className="contents" key={key}>
          <span aria-hidden="true">•</span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function CodexTable({
  headers,
  rows,
  codeColumns = [],
  className,
}: CodexTableProps) {
  const codeColumnSet = new Set(codeColumns);
  const cellStyle = (isLastRow: boolean): React.CSSProperties => ({
    borderBottom: isLastRow ? undefined : `1px solid ${CODEX_COLORS.rule}`,
  });

  // The skin mirrors the Codex terminal, so it renders a bare table instead
  // of the app's framed one.
  return (
    <div
      className={cn(
        "-ml-[2ch] max-w-[calc(100%+2ch)] overflow-x-auto",
        className
      )}
    >
      <table
        className="w-auto border-separate text-left text-[length:inherit] normal-nums"
        style={{ borderSpacing: "2ch 0" }}
      >
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                className="px-[1ch] pb-[0.65em] align-middle font-bold"
                key={header}
                scope="col"
                style={{
                  borderBottom: `2px solid ${CODEX_COLORS.rule}`,
                  color: CODEX_COLORS.yellow,
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {withTextKeys(rows, (row) => row.map(nodeText).join("|")).map(
            ({ item: row, key }, rowIndex) => (
              <tr key={key}>
                {row.map((cell, columnIndex) => (
                  <td
                    className="px-[1ch] py-[0.65em] align-top"
                    key={headers[columnIndex] ?? `extra-${columnIndex}`}
                    style={{
                      ...cellStyle(rowIndex === rows.length - 1),
                      color: codeColumnSet.has(columnIndex)
                        ? CODEX_COLORS.green
                        : undefined,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
