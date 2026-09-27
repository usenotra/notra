import { DEFAULT_AUTH_OR_DIVIDER_LABEL } from "@notra/ui/constants/auth-labels";
import type { AuthOrDividerProps } from "@notra/ui/types/auth";

export function AuthOrDivider({
  label = DEFAULT_AUTH_OR_DIVIDER_LABEL,
}: AuthOrDividerProps) {
  return (
    <div className="relative flex items-center">
      <span className="inline-block h-px w-full border-t bg-border" />
      <span className="shrink-0 px-2 text-muted-foreground text-xs uppercase">
        {label}
      </span>
      <span className="inline-block h-px w-full border-t bg-border" />
    </div>
  );
}
