"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import { Spinner } from "@notra/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useUiLabels } from "@notra/ui/components/shared/ui-labels-provider";
import { INSTRUMENT_SURFACE_CLASSES } from "@notra/ui/constants/instrument";
import { cn } from "@notra/ui/lib/utils";
import type {
  InstrumentEmptyProps,
  InstrumentHintProps,
  InstrumentModuleProps,
} from "@notra/ui/types/instrument";

function EyebrowHint({ hint }: InstrumentHintProps) {
  const { moreInfo } = useUiLabels();
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={moreInfo}
        className="text-muted-foreground hover:text-foreground inline-flex cursor-help"
      >
        <HugeiconsIcon icon={InformationCircleIcon} size={14} />
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="max-w-64 text-xs">{hint}</div>
      </TooltipContent>
    </Tooltip>
  );
}

function DualtoneModule({
  eyebrow,
  description,
  hint,
  readout,
  action,
  children,
  className,
  bodyClassName,
  variant,
  bareBody = false,
}: InstrumentModuleProps & {
  variant: Exclude<InstrumentModuleProps["variant"], "flat" | undefined>;
}) {
  const tableHeader = variant === "table";
  const surface = INSTRUMENT_SURFACE_CLASSES[bareBody ? "bare" : variant];

  return (
    <Card
      className={cn(
        "min-w-0 flex-1 overflow-visible rounded-2xl bg-transparent p-0 ring-0",
        (tableHeader || !bareBody) && "gap-0",
        !bareBody && "border-shell-border bg-shell border p-0.5",
        className
      )}
    >
      <CardHeader className={surface.header}>
        <CardTitle className={tableHeader ? "text-sm" : undefined}>
          <span className="inline-flex items-center gap-1.5">
            {eyebrow}
            {hint ? <EyebrowHint hint={hint} /> : null}
          </span>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {(readout || action) && (
          <CardAction
            className={cn(
              "flex min-w-0 items-center gap-2",
              tableHeader && "row-span-1 self-center"
            )}
          >
            {readout && (
              <span className="text-muted-foreground truncate text-xs tabular-nums">
                {readout}
              </span>
            )}
            {action}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className={cn(surface.content, bodyClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

export function InstrumentModule({
  eyebrow,
  description,
  hint,
  readout,
  action,
  children,
  className,
  bodyClassName,
  variant = "flat",
  bareBody = false,
}: InstrumentModuleProps) {
  if (variant !== "flat") {
    return (
      <DualtoneModule
        action={action}
        bareBody={bareBody}
        bodyClassName={bodyClassName}
        className={className}
        description={description}
        eyebrow={eyebrow}
        hint={hint}
        readout={readout}
        variant={variant}
      >
        {children}
      </DualtoneModule>
    );
  }

  return (
    <Card className={cn("min-w-0 flex-1", className)}>
      <CardHeader className="items-center">
        <CardTitle className="text-sm">
          <span className="inline-flex items-center gap-1.5">
            {eyebrow}
            {hint ? <EyebrowHint hint={hint} /> : null}
          </span>
        </CardTitle>
        {(readout || action) && (
          <CardAction className="flex min-w-0 items-center gap-2 self-center">
            {readout && (
              <span className="text-muted-foreground truncate text-xs tabular-nums first-letter:uppercase">
                {readout}
              </span>
            )}
            {action}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className={cn("min-w-0 flex-1", bodyClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

export function InstrumentSection({
  eyebrow,
  description,
  hint,
  readout,
  action,
  children,
  className,
  bodyClassName,
}: InstrumentModuleProps) {
  return (
    <section
      className={cn(
        "@container/instrument flex min-w-0 flex-col gap-3",
        className
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2 @min-[32rem]/instrument:flex-row @min-[32rem]/instrument:justify-between",
          description
            ? "@min-[32rem]/instrument:items-start"
            : "@min-[32rem]/instrument:items-center"
        )}
      >
        <div
          className={cn(
            "min-w-0",
            description
              ? "space-y-1"
              : (readout || action) && "flex h-7 items-center"
          )}
        >
          <h2
            className={cn(
              "text-foreground flex items-center gap-1.5 text-sm font-medium",
              !description && (readout || action) && "leading-none"
            )}
          >
            {eyebrow}
            {hint ? <EyebrowHint hint={hint} /> : null}
          </h2>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {(readout || action) && (
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 @min-[32rem]/instrument:w-auto @min-[32rem]/instrument:justify-end">
            {readout && (
              <span className="text-muted-foreground truncate text-xs tabular-nums first-letter:uppercase">
                {readout}
              </span>
            )}
            {action}
          </div>
        )}
      </div>
      <div className={cn("min-w-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

export function InstrumentEmpty({
  message,
  className,
  busy = false,
  action,
  preview,
}: InstrumentEmptyProps) {
  return (
    <div
      aria-busy={busy}
      aria-live={busy ? "polite" : undefined}
      className={cn(
        "relative flex h-full min-h-56 flex-col items-center justify-center gap-3 text-center",
        preview && "overflow-hidden",
        className
      )}
    >
      {preview ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_24%,black_70%,transparent_100%)] opacity-40 select-none"
        >
          {preview}
        </div>
      ) : null}
      {message || busy ? (
        <div
          className={cn(
            "relative z-10 flex items-center justify-center gap-2",
            preview &&
              "bg-background/85 rounded-full px-3 py-1.5 shadow-xs backdrop-blur-[2px]"
          )}
        >
          {busy ? <Spinner className="text-muted-foreground" /> : null}
          <p className="text-muted-foreground text-sm first-letter:uppercase">
            {busy && message ? <Shimmer as="span">{message}</Shimmer> : message}
          </p>
        </div>
      ) : null}
      {action && !busy ? <div className="relative z-10">{action}</div> : null}
    </div>
  );
}
