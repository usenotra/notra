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
import { useTranslations } from "next-intl";
import { useState } from "react";

import { CodeSnippet } from "@/components/geo/code-snippet";
import type { SiteProxyRecipeId, SiteProxySetupProps } from "@/types/sites";
import { displayUrl } from "@/utils/site-links";
import { buildProxyRecipes, mountedPaths } from "@/utils/site-proxy-recipes";

/** Ready-to-paste rewrites for the customer's platform, picked from a select in the code header. */
export function SiteProxySetup({
  aliasOrigin,
  mounts,
  showHeading = true,
}: SiteProxySetupProps) {
  const t = useTranslations("sites.domainsPage.proxy");
  const recipes = buildProxyRecipes(aliasOrigin, mounts);
  const [activeId, setActiveId] = useState<SiteProxyRecipeId>("vercel");
  const active = recipes.find((recipe) => recipe.id === activeId) ?? recipes[0];
  const paths = mountedPaths(mounts);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {showHeading ? (
          <h3 className="text-sm font-medium">{t("title")}</h3>
        ) : null}
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
      </div>
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
  );
}
