"use client";

import { DashboardSquare01Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/button";
import type { GuidelinesTokensSectionProps } from "@/types/brand-identity";
import type { BrandGuidelineToken } from "@/types/hooks/brand-guidelines";
import { groupTokensByType } from "@/utils/brand-guideline-display";

import { GuidelinesTokenEditDialog } from "./guidelines-token-edit-dialog";

export function GuidelinesTokensSection({
  tokens,
  organizationId,
  voiceId,
}: GuidelinesTokensSectionProps) {
  const t = useTranslations("brand.guidelines");
  const tCommon = useTranslations("common");
  const [editing, setEditing] = useState<BrandGuidelineToken | null>(null);

  if (tokens.length === 0) {
    return null;
  }

  const groups = groupTokensByType(tokens);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={DashboardSquare01Icon}
        />
        <h2 className="text-sm font-semibold">{t("tokens.title")}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {tokens.length}
        </span>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div className="space-y-2" key={group.type}>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {group.type === "unknown"
                ? tCommon("labels.other")
                : t(`tokenTypes.${group.type}`)}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.tokens.map((token) => (
                <div
                  className="flex items-center gap-1 rounded-lg border py-1 pr-1 pl-3"
                  key={token.id}
                >
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {token.name}
                  </span>
                  <span
                    className="text-muted-foreground max-w-[45%] truncate font-mono text-xs tabular-nums"
                    title={token.value}
                  >
                    {token.value}
                  </span>
                  <Button
                    aria-label={tCommon("labels.editName", {
                      name: token.name,
                    })}
                    className="shrink-0"
                    onClick={() => setEditing(token)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <HugeiconsIcon className="size-3" icon={Edit02Icon} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <GuidelinesTokenEditDialog
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null);
            }
          }}
          open
          organizationId={organizationId}
          token={editing}
          voiceId={voiceId}
        />
      ) : null}
    </section>
  );
}
