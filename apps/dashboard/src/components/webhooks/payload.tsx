"use client";
import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import type { WebhookPayloadProps } from "@/types/webhooks/outbound";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";

export function WebhookPayload({ payload }: WebhookPayloadProps) {
  const t = useTranslations("settings.panes.webhooks.details");
  const tActions = useTranslations("common.actions");
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t("payload")}
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => copyTextToClipboard(payload, t("payloadCopied"))}
        >
          <HugeiconsIcon icon={Copy01Icon} className="size-4" />
          {tActions("copy")}
        </Button>
      </div>
      <pre className="bg-muted/30 overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
        {payload}
      </pre>
    </section>
  );
}
