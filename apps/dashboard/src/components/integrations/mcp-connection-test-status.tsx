import { Alert01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "use-intl";

import type { McpConnectionTestStatusProps } from "@/types/integrations/mcp";

export function McpConnectionTestStatus({
  message,
  status,
}: McpConnectionTestStatusProps) {
  const t = useTranslations("integrations.mcp.testStatus");
  if (status === "idle") {
    return null;
  }
  return (
    <output
      aria-live="polite"
      className="border-border/80 bg-muted/40 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
    >
      {status === "testing" ? (
        <>
          <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
          <span className="text-muted-foreground">{t("testing")}</span>
        </>
      ) : null}
      {status === "success" ? (
        <>
          <HugeiconsIcon
            className="text-success size-4 shrink-0"
            icon={CheckmarkCircle02Icon}
          />
          <span className="min-w-0 wrap-anywhere">
            {message || t("success")}
          </span>
        </>
      ) : null}
      {status === "error" ? (
        <>
          <HugeiconsIcon
            className="text-destructive size-4 shrink-0"
            icon={Alert01Icon}
          />
          <span className="text-destructive min-w-0 wrap-anywhere">
            {message || t("error")}
          </span>
        </>
      ) : null}
    </output>
  );
}
