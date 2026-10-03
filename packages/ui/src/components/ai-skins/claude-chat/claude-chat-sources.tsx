import { cn } from "@notra/ui/lib/utils";

export interface ClaudeChatSourcePill {
  label: string;
  extra?: number;
}

export function ClaudeChatSources({
  sources,
  className,
}: {
  sources: readonly ClaudeChatSourcePill[];
  className?: string;
}) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {sources.map((source) => (
        <span
          className="inline-flex items-center rounded-full border border-black/8 bg-[#f3f2ee] px-2.5 py-1 font-sans text-[12px] leading-none text-[#5c5a55] dark:border-white/10 dark:bg-white/8 dark:text-muted-foreground"
          key={source.label}
        >
          {source.label}
          {source.extra ? ` + ${source.extra}` : null}
        </span>
      ))}
    </div>
  );
}
