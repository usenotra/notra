"use client";

import { CpuIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CommandGroup, CommandItem } from "@notra/ui/components/ui/command";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { CHAT_CONTEXT_SUGGESTED_INTEGRATIONS } from "@/constants/chat-context";
import { buildOrganizationIntegrationConnectPath } from "@/lib/integrations/deeplink";
import { useRouter } from "@/lib/navigation";
import type {
  ChatContextConnectSuggestionsProps,
  ChatContextSuggestedIntegrationId,
} from "@/types/components/chat-input";

const SUGGESTION_ICONS: Record<ChatContextSuggestedIntegrationId, ReactNode> = {
  github: <Github className="size-4 shrink-0" />,
  linear: <Linear className="size-4 shrink-0" />,
  mcp: <HugeiconsIcon className="size-4 shrink-0" icon={CpuIcon} />,
};

export function ChatContextConnectSuggestions({
  organizationSlug,
  onSelect,
}: ChatContextConnectSuggestionsProps) {
  const router = useRouter();
  const t = useTranslations("chat.connectSuggestions");
  const tCommon = useTranslations("common.actions");

  return (
    <CommandGroup heading={t("heading")}>
      {CHAT_CONTEXT_SUGGESTED_INTEGRATIONS.map((integration) => {
        const href = buildOrganizationIntegrationConnectPath(
          organizationSlug,
          integration.href
        );
        return (
          <CommandItem
            key={integration.id}
            keywords={[...integration.keywords]}
            onSelect={() => {
              onSelect();
              router.push(href);
            }}
            value={integration.id}
          >
            {SUGGESTION_ICONS[integration.id]}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm">{integration.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {t(`descriptions.${integration.id}`)}
              </span>
            </span>
            <span
              className="text-muted-foreground ml-auto text-xs"
              data-slot="command-shortcut"
            >
              {tCommon("connect")}
            </span>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
