import { cn } from "@notra/ui/lib/utils";
import type { ReactNode } from "react";

interface DiagramProps {
  label?: string;
  caption?: string;
  children: ReactNode;
}

export function Diagram({ label, caption, children }: DiagramProps) {
  return (
    <figure className="not-prose my-10 font-mono text-sm">
      {label ? (
        <div className="text-muted-foreground mb-4 text-xs tracking-widest uppercase">
          {label}
        </div>
      ) : null}
      {children}
      {caption ? (
        <figcaption className="text-muted-foreground mt-5 text-center font-sans text-sm">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

interface PanelProps {
  title?: ReactNode;
  aside?: ReactNode;
  step?: number;
  accent?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Panel({
  title,
  aside,
  step,
  accent = false,
  className,
  children,
}: PanelProps) {
  return (
    <div
      className={cn(
        "bg-card overflow-hidden rounded-xl border",
        accent ? "border-primary/50 bg-primary/[0.04]" : "border-border",
        className
      )}
    >
      {title ? (
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3",
            children ? "border-b" : null,
            accent ? "border-primary/30" : "border-border"
          )}
        >
          {step === undefined ? null : <StepSquare>{step}</StepSquare>}
          <span className="text-foreground min-w-0 flex-1 truncate">
            {title}
          </span>
          {aside ? (
            <span
              className={cn(
                "shrink-0",
                accent ? "text-primary" : "text-muted-foreground"
              )}
            >
              {aside}
            </span>
          ) : null}
        </div>
      ) : null}
      {children ? <div className="px-4 py-3">{children}</div> : null}
    </div>
  );
}

interface RowProps {
  k: ReactNode;
  v: ReactNode;
  accent?: boolean;
  muted?: boolean;
}

export function Row({ k, v, accent = false, muted = false }: RowProps) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-1.5",
        muted ? "opacity-50" : null
      )}
    >
      <span className="text-muted-foreground">{k}</span>
      <span
        className={cn(
          "text-right",
          accent ? "text-primary" : "text-foreground"
        )}
      >
        {v}
      </span>
    </div>
  );
}

export function StepSquare({ children }: { children: ReactNode }) {
  return (
    <span className="border-primary/40 text-primary bg-primary/10 grid size-5 shrink-0 place-items-center rounded-sm border text-xs">
      {children}
    </span>
  );
}

function StepCircle({
  children,
  accent,
}: {
  children: ReactNode;
  accent: boolean;
}) {
  return (
    <span
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full border text-xs",
        accent
          ? "border-primary/60 text-primary"
          : "border-muted-foreground/50 text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

interface ConnectorProps {
  step?: number;
  label?: ReactNode;
  dashed?: boolean;
  accent?: boolean;
  className?: string;
}

/** Vertical arrow between two stacked panels, with an optional numbered label. */
export function Connector({
  step,
  label,
  dashed = false,
  accent = !dashed,
  className,
}: ConnectorProps) {
  return (
    <div className={cn("flex h-14 items-stretch gap-4 pl-8", className)}>
      <div className="relative flex w-px flex-col items-center">
        <span
          className={cn(
            "w-0 flex-1 border-l",
            dashed ? "border-dashed" : null,
            accent ? "border-primary" : "border-muted-foreground/60"
          )}
        />
        <ArrowHead accent={accent} />
      </div>
      {label ? (
        <div className="flex items-center gap-2.5">
          {step === undefined ? null : (
            <StepCircle accent={accent}>{step}</StepCircle>
          )}
          <span className={accent ? "text-primary" : "text-muted-foreground"}>
            {label}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ArrowHead({ accent }: { accent: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "-mt-px shrink-0",
        accent ? "text-primary" : "text-muted-foreground/60"
      )}
      height="6"
      viewBox="0 0 10 6"
      width="10"
    >
      <path d="M0 0 L5 6 L10 0 Z" fill="currentColor" />
    </svg>
  );
}

export function Legend({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
      {children}
    </div>
  );
}
