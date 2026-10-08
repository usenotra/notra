"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { CopyButton } from "@notra/ui/components/ui/copy-button";
import { useTranslations } from "use-intl";

import { trackEvent } from "@/lib/analytics/posthog-client";
import type { AgentReadinessCopyPromptButtonProps } from "@/types/agent-readiness";
import { toastCopyError } from "@/utils/copy-to-clipboard";

export function AgentReadinessCopyPromptButton({
  prompt,
  label,
  copyKind,
  checkId,
  variant = "outline",
  size = "sm",
}: AgentReadinessCopyPromptButtonProps) {
  const tCommon = useTranslations("common");

  return (
    <CopyButton
      copiedLabel={tCommon("actions.copied")}
      onClick={() => {
        trackEvent(POSTHOG_EVENTS.AGENT_READINESS_FIX_COPIED, {
          check_id: checkId ?? null,
          kind: copyKind,
        });
      }}
      onCopyError={toastCopyError}
      size={size}
      value={prompt}
      variant={variant}
    >
      {label}
    </CopyButton>
  );
}
