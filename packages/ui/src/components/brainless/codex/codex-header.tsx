import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { cn } from "@notra/ui/lib/utils";

const FG = "#ececec";
const DIM = "#8a8a8a";
const GREEN = "#2f9d63";

export function CodexHeader({
  version = "0.92.0",
  model = "gpt-6-astra",
  cwd = "~/acme/web",
  className,
}: {
  version?: string;
  model?: string;
  cwd?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 font-mono text-[13px] leading-[1.55]",
        className
      )}
      style={{ color: FG }}
    >
      <div className="flex items-center gap-2">
        <Openai aria-hidden className="size-3.5 shrink-0 fill-current" />
        <span>
          OpenAI Codex{" "}
          <span style={{ color: DIM }}>{version}</span>
        </span>
      </div>
      <div style={{ color: DIM }}>
        <span style={{ color: GREEN }}>{model}</span>
        <span> · {cwd}</span>
      </div>
    </div>
  );
}
