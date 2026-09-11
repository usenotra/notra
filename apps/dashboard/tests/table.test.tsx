import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { Table } from "@/components/motion/table";

describe("shared dashboard table", () => {
  test("only actionable rows receive pointer styling and a keyboard stop", () => {
    const html = renderToStaticMarkup(
      <Table
        columns={[{ key: "label", header: "Invoice" }]}
        data={[
          {
            id: "hosted",
            label: "Hosted invoice",
            url: "https://example.com/invoice",
          },
          { id: "missing", label: "Missing URL", url: null },
          { id: "empty", label: "Empty URL", url: "" },
        ]}
        getRowId={(row) => row.id}
        isRowClickable={(row) => Boolean(row.url)}
        onRowClick={() => undefined}
        rowSizing="content"
      />
    );
    const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g) ?? [];
    const hosted = rows.find((row) => row.includes("Hosted invoice"));
    expect(hosted).toContain("cursor-pointer");
    expect(hosted).toContain('tabindex="0"');
    for (const label of ["Missing URL", "Empty URL"]) {
      const row = rows.find((markup) => markup.includes(label));
      expect(row).toBeDefined();
      expect(row).not.toContain("cursor-pointer");
      expect(row).not.toContain("tabindex");
    }
  });

  test("content-sized rows retain every entry beyond the fixed-row viewport", () => {
    const data = Array.from({ length: 40 }, (_, index) => ({
      id: `receipt-${index}`,
      description: `Complete receipt ${index}: multiple changes and competitors`,
    }));
    const html = renderToStaticMarkup(
      <Table
        columns={[{ key: "description", header: "Changes", width: "1fr" }]}
        data={data}
        getRowId={(row) => row.id}
        height={156}
        rowHeight={52}
        rowSizing="content"
      />
    );

    for (const row of data) {
      expect(html).toContain(row.description);
    }
    expect(html).toContain("min-height:52px");
    expect(html).toContain("max-height:104px");
    expect(html).toContain("whitespace-normal");
  });

  test("refreshing a content-sized table does not collapse existing multiline rows", () => {
    const html = renderToStaticMarkup(
      <Table
        columns={[{ key: "description", header: "Description" }]}
        data={[{ id: "invoice", description: "Full invoice description" }]}
        getRowId={(row) => row.id}
        height={208}
        loading
        rowHeight={52}
        rowSizing="content"
      />
    );

    expect(html).toContain("Full invoice description");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("max-height:156px");
  });

  test("numeric date sorting preserves row identity and selection", () => {
    const data = [
      { id: "older", timestamp: 2, label: "Older invoice" },
      { id: "newer", timestamp: 10, label: "Newer invoice" },
    ];
    const html = renderToStaticMarkup(
      <Table
        columns={[
          {
            key: "createdAt",
            header: "Date",
            sortable: true,
            sortValue: (row) => row.timestamp,
            cell: (row) => row.label,
          },
        ]}
        data={data}
        getRowId={(row) => row.id}
        selectedRowIds={["older"]}
        sort={{ key: "createdAt", direction: "desc" }}
      />
    );

    expect(html.indexOf("Newer invoice")).toBeLessThan(
      html.indexOf("Older invoice")
    );
    expect(html).toMatch(
      /<tr[^>]*data-selected="true"[^>]*>[\s\S]*?Older invoice/
    );
    expect(html).toContain('aria-sort="descending"');
    expect(data.map((row) => row.id)).toEqual(["older", "newer"]);
  });

  test("empty content-sized tables keep the shared empty-state surface", () => {
    const html = renderToStaticMarkup(
      <Table
        columns={[{ key: "description", header: "Description" }]}
        data={[]}
        emptyState="No invoices yet"
        height={104}
        rowHeight={52}
        rowSizing="content"
      />
    );

    expect(html).toContain("No invoices yet");
    expect(html).toContain("height:52px");
    expect(html).toContain('aria-busy="false"');
  });
});
