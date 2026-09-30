import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { CodexListProps, CodexTableProps } from "../types/codex";

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
    {withTextKeys(items, nodeText).map(({ item, key }) => (
      <li className="contents" key={key}>
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
}: CodexTableProps) => {
  const codeColumnSet = new Set(codeColumns);

  return (
    <div className="-ms-[2ch] max-w-[calc(100%+2ch)]">
      <Table
        className={cn(
          "w-auto border-separate border-spacing-x-[2ch] border-spacing-y-0 text-start text-[length:inherit]",
          className
        )}
        data-slot="codex-table"
        {...props}
      >
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((header) => (
              <TableHead
                className="border-codex-rule text-codex-yellow h-auto border-b-2 px-[1ch] pb-[0.65em] text-start font-bold whitespace-normal"
                key={header}
                scope="col"
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {withTextKeys(rows, (row) => row.map(nodeText).join("|")).map(
            ({ item: row, key }) => (
              <TableRow
                className="group/codex-row hover:bg-transparent"
                key={key}
              >
                {row.map((cell, columnIndex) => (
                  <TableCell
                    className={cn(
                      "border-codex-rule border-b px-[1ch] py-[0.65em] align-top whitespace-normal group-last/codex-row:border-b-0",
                      codeColumnSet.has(columnIndex) && "text-codex-green"
                    )}
                    key={headers[columnIndex] ?? `extra-${columnIndex}`}
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    </div>
  );
};
