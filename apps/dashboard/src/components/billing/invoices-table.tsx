"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { useFormatter, useTranslations } from "use-intl";

import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_MAX_HEIGHT, TABLE_ROW_HEIGHT } from "@/constants/table";
import type { BillingInvoice, InvoicesTableProps } from "@/types/billing/plan";
import { getInvoiceDescription } from "@/utils/billing-plans";
import { tableHeightFor } from "@/utils/table";

export function InvoicesTable({ invoices, plans }: InvoicesTableProps) {
  const t = useTranslations("billing.invoices");
  const tCommon = useTranslations("common");
  const tBilling = useTranslations("billing");
  const format = useFormatter();
  const columns: TableColumn<BillingInvoice>[] = [
    {
      key: "createdAt",
      header: tCommon("labels.date"),
      width: "9rem",
      sortable: true,
      sortValue: (invoice) =>
        invoice.createdAt ? new Date(invoice.createdAt).getTime() : 0,
      cell: (invoice) =>
        invoice.createdAt
          ? format.dateTime(new Date(invoice.createdAt), {
              dateStyle: "short",
            })
          : "-",
    },
    {
      key: "description",
      header: tCommon("labels.description"),
      width: "1fr",
      minWidth: "14rem",
      cell: (invoice) => (
        <span className="wrap-break-word">
          {getInvoiceDescription(invoice.planIds, plans, tBilling)}
        </span>
      ),
    },
    {
      key: "total",
      header: tCommon("labels.amount"),
      width: "8rem",
      cell: (invoice) => (
        <span className="tabular-nums">
          {invoice.total !== undefined
            ? format.number(invoice.total, {
                style: "currency",
                currency: "USD",
              })
            : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: tCommon("labels.status"),
      width: "8rem",
      cell: (invoice) => (
        <Badge variant={invoice.status === "paid" ? "success" : "secondary"}>
          {t("statusValue", { status: invoice.status ?? "pending" })}
        </Badge>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={invoices}
      defaultSort={{ key: "createdAt", direction: "desc" }}
      emptyState={t("empty")}
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
