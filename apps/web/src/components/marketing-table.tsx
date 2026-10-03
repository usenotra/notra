"use client";

/* Bare table primitives for marketing mockups, which draw their own frames.
 * App tables use `@notra/ui/components/ui/table` and `data-table`. */

import { cn } from "@notra/ui/lib/utils";
import * as React from "react";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      className="relative w-full overflow-x-auto"
      data-slot="table-container"
    >
      <table
        className={cn(
          "w-full caption-bottom border-separate border-spacing-0 text-sm tabular-nums",
          className
        )}
        data-slot="table"
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("bg-muted/80 text-foreground [&_tr]:border-b", className)}
      data-slot="table-header"
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn(
        "[&>tr>td]:bg-background [&>tr:hover>td]:bg-muted/50 bg-transparent [&_tr:first-child>td]:shadow-[inset_0_1px_0_var(--border)] [&_tr:last-child]:border-0 [&>tr>td]:transition-colors",
        className
      )}
      data-slot="table-body"
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-border/60 hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      data-slot="table-row"
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "text-foreground h-10 px-3 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      data-slot="table-head"
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      data-slot="table-cell"
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
