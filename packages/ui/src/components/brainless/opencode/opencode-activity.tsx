import { OPENCODE_COLORS } from "@notra/ui/constants/brainless-opencode";
import type { OpencodeActivityProps } from "@notra/ui/types/brainless-opencode";
import { cn } from "@notra/ui/lib/utils";

export function OpencodeActivity({
  kind = "tool",
  label,
  detail,
  duration,
  className,
}: OpencodeActivityProps) {
  const thought = kind === "thought";

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2 font-mono text-[12px] leading-[1.55]",
        className
      )}
      style={{ color: thought ? OPENCODE_COLORS.orange : `var(--opencode-source-muted, ${OPENCODE_COLORS.muted})` }}
    >
      <span aria-hidden className="shrink-0">
        {thought ? "+" : "⚙"}
      </span>
      <span className="min-w-0 break-words">
        {thought ? <span>Thought: </span> : null}
        <span>{label}</span>
        {detail ? <span> [{detail}]</span> : null}
        {duration ? <span> · {duration}</span> : null}
      </span>
    </div>
  );
}
