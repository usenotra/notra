import { Loading03Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import type { PersonaPromptsProps } from "@/types/geo-personas-ui";

export function PersonaPrompts({
  prompts,
  disabled,
  isGenerating,
  onGenerate,
}: PersonaPromptsProps) {
  const t = useTranslations("geo.personaPrompts");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{t("title")}</h3>
          <p className="text-muted-foreground text-sm leading-6">
            {t("description")}
          </p>
        </div>
        {prompts.length > 0 ? (
          <ol className="space-y-3">
            {prompts.map((prompt, index) => (
              <li className="rounded-xl border p-4" key={`${index}:${prompt}`}>
                <p className="text-muted-foreground mb-2 text-xs font-medium tabular-nums">
                  {t("message", { number: index + 1 })}
                </p>
                <p className="text-sm leading-6 wrap-anywhere">{prompt}</p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="bg-muted/30 space-y-4 rounded-xl border px-4 py-5">
            <p className="text-muted-foreground text-sm">
              {t("emptyDescription")}
            </p>
            <Button
              disabled={disabled}
              onClick={onGenerate}
              size="sm"
              type="button"
            >
              <HugeiconsIcon
                className={isGenerating ? "animate-spin" : undefined}
                icon={isGenerating ? Loading03Icon : SparklesIcon}
                size={14}
              />
              {isGenerating ? t("generating") : tGeoShared("generatePrompts")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
