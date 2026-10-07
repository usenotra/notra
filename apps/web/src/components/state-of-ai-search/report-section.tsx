import { InstrumentSection } from "@notra/ui/components/instrument/instrument-module";
import { TABLE_BODY_CLASS, TABLE_FRAME_CLASS } from "@notra/ui/constants/table";
import { cn } from "@notra/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * Every block on the report: the dashboard's title row, then one dualtone
 * surface (a framed table or a ReportPanel). No other wrappers.
 */
export function ReportBlock({
  title,
  description,
  readout,
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  readout?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <InstrumentSection
      className={className}
      description={description}
      eyebrow={title}
      readout={readout}
    >
      {children}
    </InstrumentSection>
  );
}

/**
 * The table frame for content that is not a table: the shell row carries the
 * labels, the lifted card carries the content, same as a table's header and
 * rows.
 */
export function ReportPanel({
  header,
  className,
  bodyClassName,
  children,
}: {
  header?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(TABLE_FRAME_CLASS, "flex min-w-0 flex-col", className)}>
      {header ? (
        <div className="text-muted-foreground flex h-10 shrink-0 items-center gap-2 px-4 text-sm font-medium">
          {header}
        </div>
      ) : null}
      <div className={cn(TABLE_BODY_CLASS, "flex-1", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
