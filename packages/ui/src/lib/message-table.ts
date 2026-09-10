import type {
  MessageTableCopyFormat,
  MessageTableData,
} from "@notra/ui/types/message-table";

function escapeDelimitedCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function escapeMarkdownTableCell(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("|", "\\|");
}

function tableRows(data: MessageTableData) {
  return [data.headers, ...data.rows].filter((row) => row.length > 0);
}

export function tableDataToCsv(data: MessageTableData) {
  return tableRows(data)
    .map((row) => row.map(escapeDelimitedCell).join(","))
    .join("\n");
}

export function tableDataToMarkdown(data: MessageTableData) {
  const columnCount = Math.max(
    data.headers.length,
    ...data.rows.map((row) => row.length),
    1
  );
  const headers = Array.from(
    { length: columnCount },
    (_, index) => data.headers[index] ?? ""
  );
  const divider = Array.from({ length: columnCount }, () => "---");
  const rows = data.rows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? "")
  );

  return [headers, divider, ...rows]
    .map((row) => `| ${row.map(escapeMarkdownTableCell).join(" | ")} |`)
    .join("\n");
}

export function tableDataToPlain(data: MessageTableData) {
  return tableRows(data)
    .map((row) => row.join("\t"))
    .join("\n");
}

export function tableDataToCopyFormat(
  data: MessageTableData,
  format: MessageTableCopyFormat
) {
  if (format === "csv") {
    return tableDataToCsv(data);
  }
  if (format === "plain") {
    return tableDataToPlain(data);
  }
  return tableDataToMarkdown(data);
}
