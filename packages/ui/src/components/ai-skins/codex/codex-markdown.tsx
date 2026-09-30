import { CODEX_COLORS } from "@notra/ui/constants/codex-skin";
import { cn } from "@notra/ui/lib/utils";
import type { CodexListProps, CodexTableProps } from "@notra/ui/types/codex-skin";
import type * as React from "react";

export function CodexCode({ children }: { children: React.ReactNode }) {
  return <code style={{ color: CODEX_COLORS.green }}>{children}</code>;
}

export function CodexList({ items, className }: CodexListProps) {
  return (
    <ul className={cn("grid grid-cols-[2ch_minmax(0,1fr)]", className)}>
      {items.map((item, index) => (
        // Markdown list items have no identity beyond their position.
        // oxlint-disable-next-line react/no-array-index-key
        <li className="contents" key={index}>
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
  const cellStyle = (isLastRow: boolean): React.CSSProperties => ({
    borderBottom: isLastRow ? undefined : `1px solid ${CODEX_COLORS.rule}`,
  });

  return (
    <div className={cn("-ml-[2ch] max-w-[calc(100%+2ch)] overflow-x-auto", className)}>
      <table
        className="border-separate text-left"
        style={{ borderSpacing: "2ch 0" }}
      >
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                className="px-[1ch] pb-[0.65em] font-bold"
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
          {rows.map((row, rowIndex) => (
            <tr key={row.join("|")}>
              {row.map((cell, columnIndex) => (
                <td
                  className="px-[1ch] py-[0.65em] align-top"
                  key={headers[columnIndex] ?? columnIndex}
                  style={{
                    ...cellStyle(rowIndex === rows.length - 1),
                    color: codeColumns.includes(columnIndex)
                      ? CODEX_COLORS.green
                      : undefined,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
