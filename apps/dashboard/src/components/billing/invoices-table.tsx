"use client";

import { Badge } from "@notra/ui/components/ui/badge";

import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_MAX_HEIGHT, TABLE_ROW_HEIGHT } from "@/constants/table";
import type { BillingInvoice, InvoicesTableProps } from "@/types/billing/plan";
import { getInvoiceDescription } from "@/utils/billing-plans";
import { tableHeightFor } from "@/utils/table";

export function InvoicesTable({ invoices, plans }: InvoicesTableProps) {
  const columns: TableColumn<BillingInvoice>[] = [
    {
      key: "createdAt",
      header: "Date",
      width: "9rem",
      sortable: true,
      sortValue: (invoice) =>
        invoice.createdAt ? new Date(invoice.createdAt).getTime() : 0,
      cell: (invoice) =>
        invoice.createdAt
          ? new Date(invoice.createdAt).toLocaleDateString()
          : "-",
    },
    {
      key: "description",
      header: "Description",
      width: "1fr",
      minWidth: "14rem",
      cell: (invoice) => (
        <span className="wrap-break-word">
          {getInvoiceDescription(invoice.planIds, plans)}
        </span>
      ),
    },
    {
      key: "total",
      header: "Amount",
      width: "8rem",
      cell: (invoice) => (
        <span className="tabular-nums">
          {invoice.total !== undefined ? `$${invoice.total.toFixed(2)}` : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "8rem",
      cell: (invoice) => (
        <Badge variant={invoice.status === "paid" ? "success" : "secondary"}>
          {(invoice.status ?? "pending").charAt(0).toUpperCase() +
            (invoice.status ?? "pending").slice(1)}
        </Badge>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={invoices}
      defaultSort={{ key: "createdAt", direction: "desc" }}
      emptyState="No invoices yet"
      getRowId={(invoice, index) =>
        invoice.hostedInvoiceUrl ??
        `${invoice.createdAt}-${invoice.total}-${index}`
      }
      height={invoices.length > 0 ? TABLE_MAX_HEIGHT : tableHeightFor(0)}
      isRowClickable={(invoice) => Boolean(invoice.hostedInvoiceUrl)}
      onRowClick={(invoice) => {
        if (invoice.hostedInvoiceUrl) {
          window.open(
            invoice.hostedInvoiceUrl,
            "_blank",
            "noopener,noreferrer"
          );
        }
      }}
      rowHeight={TABLE_ROW_HEIGHT}
      rowSizing="content"
    />
  );
}
