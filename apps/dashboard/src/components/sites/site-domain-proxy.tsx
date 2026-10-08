"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { CodeSnippet, CopyPromptButton } from "@/components/geo/code-snippet";
import type { SiteProxySetupProps } from "@/types/components/sites";
import type { SiteProxyRecipeId } from "@/types/sites";
import { displayUrl } from "@/utils/site-links";
import { buildSiteProxyAgentPrompt } from "@/utils/site-proxy-agent-prompt";
import { buildProxyRecipes, mountedPaths } from "@/utils/site-proxy-recipes";

export function SiteProxySetup({
  hostname,
  aliasOrigin,
  mounts,
  checkAction,
}: SiteProxySetupProps) {
  const t = useTranslations("sites.domainsPage.proxy");
  const recipes = buildProxyRecipes(aliasOrigin, mounts);
  const [activeId, setActiveId] = useState<SiteProxyRecipeId>("vercel");
  const active = recipes.find((recipe) => recipe.id === activeId) ?? recipes[0];
  const paths = mountedPaths(mounts);
  const prompt = buildSiteProxyAgentPrompt(hostname, aliasOrigin, mounts);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm text-pretty">
          {t("agentPromptDescription")}
        </p>
        <div className="flex items-center gap-2">
          <CopyPromptButton prompt={prompt} />
          {checkAction}
        </div>
      </div>
      <details>
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
          {t("viewPrompt")}
        </summary>
        <div className="pt-2">
          <Textarea
            aria-label={t("agentPromptLabel")}
            className="field-sizing-fixed resize-none"
            readOnly
            rows={6}
            value={prompt}
          />
        </div>
      </details>
      <details>
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
          {t("manualSetup")}
        </summary>
        <div className="space-y-3 pt-3">
          <p className="text-muted-foreground text-sm text-pretty">
            {t.rich("description", {
              paths: paths.join(", "),
              origin: displayUrl(aliasOrigin),
              code: (chunks) => (
                <code className="text-foreground font-mono text-xs">
                  {chunks}
                </code>
              ),
            })}
          </p>
          {active ? (
            <CodeSnippet
              code={active.code}
              filename={active.filename}
              headerEnd={
                <Select
                  onValueChange={(value: string | null) => {
                    const next = recipes.find((recipe) => recipe.id === value);
                    if (next) {
                      setActiveId(next.id);
                    }
                  }}
                  value={active.id}
                >
                  <SelectTrigger
                    aria-label={t("platform")}
                    size="sm"
                    variant="ghost"
                  >
                    <SelectValue>
                      {(value: string) => {
                        const recipe = recipes.find(
                          (candidate) => candidate.id === value
                        );
                        return recipe ? t(`recipes.${recipe.id}`) : value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="end">
                    {recipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {t(`recipes.${recipe.id}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          ) : null}
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs text-pretty">
            <HugeiconsIcon
              aria-hidden="true"
              className="mt-px size-3.5 shrink-0"
              icon={InformationCircleIcon}
              strokeWidth={1.5}
            />
            {t("noCookies")}
          </p>
        </div>
      </details>
    </div>
  );
}
