"use client";

import type * as React from "react";

import {
  TABLE_CARD_CELLS_CLASS,
  TABLE_FRAME_CLASS,
  TABLE_INNER_RADIUS_CLASS,
} from "@notra/ui/constants/table";
import { cn } from "@notra/ui/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      className={cn(TABLE_FRAME_CLASS, "relative w-full min-w-0")}
      data-slot="table-container"
    >
      <div className={cn("w-full overflow-x-auto", TABLE_INNER_RADIUS_CLASS)}>
        <table
          className={cn(
            "w-full caption-bottom border-separate border-spacing-0 text-sm tabular-nums",
            TABLE_CARD_CELLS_CLASS,
            className
          )}
          data-slot="table"
          {...props}
        />
      </div>
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={className} data-slot="table-header" {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={className} data-slot="table-body" {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      className={cn("text-muted-foreground font-medium", className)}
      data-slot="table-footer"
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("group/row transition-colors", className)}
      data-slot="table-row"
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "text-muted-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap",
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
        "text-foreground h-12 px-4 align-middle whitespace-nowrap",
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
      className={cn("text-muted-foreground px-4 py-2.5 text-sm", className)}
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
