"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";

import { TwitterPost } from "@/components/twitter-post";
import { useSelectedSocialAccount } from "@/lib/hooks/use-selected-social-account";
import { twitterAuthorFromAccount } from "@/utils/twitter";

import type { ContentEditorProps } from "./types";

const VIEW_OPTIONS = ["preview", "raw"] as const;
type ViewOption = (typeof VIEW_OPTIONS)[number];

const VIEW_OPTIONS_SET = new Set<string>(VIEW_OPTIONS);

function isViewOption(value: string): value is ViewOption {
  return VIEW_OPTIONS_SET.has(value);
}

export function TwitterEditor({
  content,
  state,
  actions,
  organization,
  organizationId,
  writeFocusNonce = 0,
}: ContentEditorProps) {
  const t = useTranslations("content.editors");
  const tCommon = useTranslations("common");
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(VIEW_OPTIONS).withDefault("preview")
  );

  const titleInputRef = useRef<HTMLInputElement>(null);

  const { accounts, selectedAccount, selectAccount } = useSelectedSocialAccount(
    organizationId ?? "",
    "twitter"
  );
  const author = selectedAccount
    ? twitterAuthorFromAccount(selectedAccount)
    : {
        name: organization?.name ?? tCommon("labels.yourName"),
        avatar: organization?.logo ?? undefined,
        handle: (organization?.name ?? "yourname")
          .toLowerCase()
          .replace(/\s+/g, ""),
      };

  useEffect(() => {
    if (writeFocusNonce === 0) {
      return;
    }
    setView("preview").catch(() => undefined);
  }, [setView, writeFocusNonce]);

  const currentMarkdown = state.editedMarkdown ?? content.markdown ?? "";
  const title = state.editingTitle ?? state.serverTitle;

  return (
    <Tabs
      className="w-full"
      onValueChange={(value) => {
        if (!isViewOption(value)) {
          return;
        }
        setView(value);
      }}
      value={view}
    >
      <TitleCard
        action={
          <TabsList variant="line">
            <TabsTrigger value="preview">
              {tCommon("labels.preview")}
            </TabsTrigger>
            <TabsTrigger value="raw">{t("raw")}</TabsTrigger>
          </TabsList>
        }
        heading={
          <input
            aria-label={tCommon("labels.postTitle")}
            className="w-full bg-transparent outline-none focus:ring-0"
            onChange={(e) => actions.setEditingTitle(e.target.value)}
            onFocus={(e) => {
              if (state.editingTitle === null) {
                actions.setEditingTitle(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                titleInputRef.current?.blur();
              }
              if (e.key === "Escape") {
                actions.setEditingTitle(null);
                titleInputRef.current?.blur();
              }
            }}
            ref={titleInputRef}
            type="text"
            value={title}
          />
        }
      >
        <TabsContent className="mt-0 flex justify-center py-4" value="preview">
          <TwitterPost
            accountSelector={{
              accounts,
              onSelect: selectAccount,
            }}
            author={author}
            className="w-full max-w-lg"
            content={currentMarkdown}
            onContentChange={(value) => actions.setEditedMarkdown(value)}
            onSelectionChange={actions.onSelectionChange}
            timestamp={tCommon("labels.justNow")}
          />
        </TabsContent>
        <TabsContent className="mt-0" value="raw">
          <textarea
            aria-label={t("twitterContentEditor")}
            className="selection:bg-primary/30 field-sizing-content w-full resize-none rounded-lg border-0 bg-transparent font-mono text-sm whitespace-pre-wrap focus:ring-0 focus:outline-none"
            onChange={(e) => {
              actions.setEditedMarkdown(e.target.value);
            }}
            value={currentMarkdown}
          />
        </TabsContent>
      </TitleCard>
    </Tabs>
  );
}
