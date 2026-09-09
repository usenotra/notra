"use client";

import type * as React from "react";

import { cn } from "@notra/ui/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      className="relative w-full overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10"
      data-slot="table-container"
    >
      <table
        className={cn(
          "w-full caption-bottom border-separate border-spacing-0 text-sm",
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
      className={cn("text-muted-foreground", className)}
      data-slot="table-header"
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn(
        "[&>tr>td]:bg-card [&>tr>td]:transition-colors [&>tr:hover>td]:bg-muted/40 [&_tr:first-child>td]:shadow-[inset_0_1px_0_var(--border)] [&_tr:last-child>td:first-child]:rounded-bl-xl [&_tr:last-child>td:last-child]:rounded-br-xl",
        className
      )}
      data-slot="table-body"
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      data-slot="table-footer"
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "transition-colors data-[state=selected]:[&>td]:bg-muted/50",
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
        "h-9 bg-card px-4 text-left align-middle font-medium text-xs uppercase tracking-wide whitespace-nowrap first:rounded-tl-xl last:rounded-tr-xl [&:has([role=checkbox])]:pr-0",
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
        "px-4 py-3.5 align-middle [&:has([role=checkbox])]:pr-0",
        className
      )}
      data-slot="table-cell"
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      data-slot="table-caption"
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
