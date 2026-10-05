import { Spinner } from "@notra/ui/components/ui/spinner";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import { cn } from "@notra/ui/lib/utils";
import type {
  InstrumentEmptyProps,
  InstrumentModuleProps,
} from "@notra/ui/types/instrument";

export function InstrumentModule({
  eyebrow,
  description,
  readout,
  action,
  children,
  className,
  bodyClassName,
  variant = "flat",
  bareBody = false,
}: InstrumentModuleProps) {
  if (variant === "panel") {
    return (
      <Card
        className={cn(
          "min-w-0 flex-1 overflow-visible rounded-2xl bg-transparent p-0 ring-0",
          className
        )}
      >
        <CardHeader
          className={
            bareBody
              ? "px-1"
              : "min-h-24 content-start rounded-t-2xl border border-border border-b-0 bg-muted pt-4 pb-9"
          }
        >
          <CardTitle>{eyebrow}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
          {(readout || action) && (
            <CardAction className="flex min-w-0 items-center gap-2">
              {readout && (
                <span className="truncate text-muted-foreground text-xs tabular-nums">
                  {readout}
                </span>
              )}
              {action}
            </CardAction>
          )}
        </CardHeader>
        <CardContent
          className={cn(
            bareBody
              ? "flex flex-1 flex-col p-0"
              : "-mt-9 relative flex flex-1 flex-col rounded-2xl border border-border bg-card p-6",
            bodyClassName
          )}
        >
          {children}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("min-w-0 flex-1", className)}>
      <CardHeader className="items-center">
        <CardTitle className="text-sm capitalize">{eyebrow}</CardTitle>
        {(readout || action) && (
          <CardAction className="flex min-w-0 items-center gap-2 self-center">
            {readout && (
              <span className="truncate text-muted-foreground text-xs capitalize tabular-nums">
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
  readout,
  action,
  children,
  className,
  bodyClassName,
}: InstrumentModuleProps) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div
        className={cn(
          "flex min-w-0 justify-between gap-2",
          description ? "items-start" : "items-center"
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
              "font-medium text-foreground text-sm capitalize",
              !description && (readout || action) && "leading-none"
            )}
          >
            {eyebrow}
          </h2>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {(readout || action) && (
          <div className="flex min-w-0 items-center gap-2">
            {readout && (
              <span className="truncate text-muted-foreground text-xs capitalize tabular-nums">
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
          className="pointer-events-none absolute inset-0 select-none opacity-40 [mask-image:linear-gradient(to_bottom,transparent_0%,black_24%,black_70%,transparent_100%)]"
        >
          {preview}
        </div>
      ) : null}
      <div
        className={cn(
          "relative z-10 flex items-center justify-center gap-2",
          preview &&
            "rounded-full bg-background/85 px-3 py-1.5 shadow-xs backdrop-blur-[2px]"
        )}
      >
        {busy ? (
          <Spinner className="text-muted-foreground" />
        ) : null}
        <p className="text-muted-foreground text-sm capitalize">{message}</p>
      </div>
      {action && !busy ? <div className="relative z-10">{action}</div> : null}
    </div>
  );
}
