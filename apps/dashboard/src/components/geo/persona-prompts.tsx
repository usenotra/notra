import { SparklesIcon } from "@hugeicons/core-free-icons";
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
  // Two turns can share the same text, so number repeats to keep keys unique.
  const occurrences = new Map<string, number>();
  const items = prompts.map((prompt) => {
    const occurrence = (occurrences.get(prompt) ?? 0) + 1;
    occurrences.set(prompt, occurrence);
    return { prompt, key: `${occurrence}:${prompt}` };
  });
  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{t("title")}</h3>
          <p className="text-muted-foreground text-sm text-pretty">
            {t("description")}
          </p>
        </div>
        {prompts.length > 0 ? (
          <ol>
            {items.map(({ prompt, key }, index) => (
              <li
                className="group/turn relative flex gap-4 pb-6 last:pb-0"
                key={key}
              >
                <span
                  aria-hidden="true"
                  className="bg-border absolute top-11 bottom-2 left-3.5 w-px group-last/turn:hidden"
                />
                <span
                  aria-hidden="true"
                  className="bg-muted text-muted-foreground relative mt-2 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="sr-only">
                    {t("message", { number: index + 1 })}
                  </span>
                  <p className="bg-muted/40 rounded-lg rounded-tl-sm px-3.5 py-2.5 text-sm leading-6 text-pretty wrap-anywhere">
                    {prompt}
                  </p>
                </div>
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
              loading={isGenerating}
              onClick={onGenerate}
              size="sm"
              type="button"
            >
              <HugeiconsIcon icon={SparklesIcon} size={14} />
              {tGeoShared("generatePrompts")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
