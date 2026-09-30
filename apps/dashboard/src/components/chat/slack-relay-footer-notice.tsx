"use client";

import { Slack } from "@notra/ui/components/ui/svgs/slack";
import { useTranslations } from "next-intl";

import type { SlackRelayInputMode } from "@/types/slack-relay";

export function SlackRelayFooterNotice({ threadUrl }: SlackRelayInputMode) {
  const t = useTranslations("chat.slackRelay");
  return (
    <div className="text-muted-foreground flex min-w-0 items-center gap-2 px-1.5 text-xs">
      <Slack className="size-3.5 shrink-0" />
      <span className="truncate">{t("notice")}</span>
      {threadUrl && (
        <a
          className="text-foreground shrink-0 font-medium underline-offset-2 hover:underline"
          href={threadUrl}
          rel="noopener"
          target="_blank"
        >
          {t("openInSlack")}
        </a>
      )}
    </div>
  );
}
