import { cn } from "cn";
import type { ComponentProps } from "react";

import type { CodexListProps, CodexTableProps } from "../types/codex";

export const CodexCode = ({ className, ...props }: ComponentProps<"code">) => (
  <code
    className={cn("text-codex-green font-[inherit]", className)}
    data-slot="codex-code"
    {...props}
  />
);

export const CodexList = ({ className, items, ...props }: CodexListProps) => (
  <ul
    className={cn("grid grid-cols-[2ch_minmax(0,1fr)]", className)}
    data-slot="codex-list"
    {...props}
  >
    {items.map((item, index) => (
      <li className="contents" key={index}>
        <span aria-hidden="true">•</span>
        <span className="min-w-0">{item}</span>
      </li>
    ))}
  </ul>
);

export const CodexTable = ({
  className,
  codeColumns = [],
  headers,
  rows,
  ...props
}: CodexTableProps) => (
  <div className="-ms-[2ch] max-w-[calc(100%+2ch)] overflow-x-auto">
    <table
      className={cn(
        "border-separate border-spacing-x-[2ch] border-spacing-y-0 text-start",
        className
      )}
      data-slot="codex-table"
      {...props}
    >
      <thead>
        <tr>
          {headers.map((header) => (
            <th
              className="border-codex-rule text-codex-yellow border-b-2 px-[1ch] pb-[0.65em] text-start font-bold"
              key={header}
              scope="col"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr className="group/codex-row" key={rowIndex}>
            {row.map((cell, columnIndex) => (
              <td
                className={cn(
                  "border-codex-rule border-b px-[1ch] py-[0.65em] align-top group-last/codex-row:border-b-0",
                  codeColumns.includes(columnIndex) && "text-codex-green"
                )}
                key={columnIndex}
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
