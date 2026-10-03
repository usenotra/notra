import { cn } from "@/lib/utils";
import type { JourneyEmptyProps } from "@/types/geo";

export function JourneyEmpty({
  title,
  description,
  media,
  action,
  className,
}: JourneyEmptyProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-56 flex-col items-center justify-center gap-3 text-center",
        className
      )}
    >
      <div aria-hidden="true" className="relative mb-3 size-12">
        <span className="bg-card border-border/80 absolute inset-0 origin-bottom-left -translate-x-1 scale-85 -rotate-10 rounded-lg border" />
        <span className="bg-card border-border/80 absolute inset-0 origin-bottom-right translate-x-1 scale-85 rotate-10 rounded-lg border" />
        <span className="bg-card text-foreground relative flex size-12 items-center justify-center rounded-lg border shadow-sm">
          {media}
        </span>
      </div>
      <h3 className="text-foreground text-base font-semibold text-balance">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-md px-4 text-sm leading-relaxed text-pretty">
        {description}
      </p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
