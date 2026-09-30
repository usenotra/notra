"use client";

import { trackedPromptScanId } from "@notra/geo-core/geo/prompts";
import { Switch } from "@notra/ui/components/ui/switch";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/button";
import { LanguageLabel } from "@/components/geo/geo-language-picker";
import {
  useGeoPromptTranslationMutations,
  useGeoPromptTranslations,
} from "@/lib/hooks/use-geo-prompt-translations";
import { useLanguageLabel } from "@/lib/hooks/use-language-label";
import type {
  PromptTranslationRowProps,
  PromptTranslationsSectionProps,
} from "@/types/geo";

function PromptTranslationRow({
  plan,
  promptId,
  limit,
  busy,
  translating,
  onSelect,
  onSave,
  onReset,
}: PromptTranslationRowProps) {
  const t = useTranslations("geo.promptTranslations");
  const languageLabel = useLanguageLabel();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const entry = plan.entries.find((item) => item.promptId === promptId);
  const language = languageLabel(plan.language);
  const full = !entry && plan.entries.length >= limit;
  const last = Boolean(entry) && plan.entries.length <= 1;
  let hint: string | null = null;
  if (full) {
    hint = t("full", { limit, language });
  } else if (last) {
    hint = t("last", { language });
  }

  return (
    <li className="space-y-1.5">
      <div className="flex items-center gap-2">
        <LanguageLabel language={plan.language} />
        <span className="text-muted-foreground text-xs tabular-nums">
          {t("count", { count: plan.entries.length, limit })}
        </span>
        <Switch
          aria-describedby={hint ? `${id}-hint` : undefined}
          aria-label={t("scanIn", { language })}
          checked={Boolean(entry)}
          className="ml-auto"
          disabled={busy || full || last}
          onCheckedChange={(selected) => onSelect(plan.language, selected)}
        />
      </div>
      {hint ? (
        <p className="text-muted-foreground text-xs" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {entry && draft !== null ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(plan.language, draft);
            setDraft(null);
          }}
        >
          <Textarea
            aria-label={t("translationIn", { language })}
            autoFocus
            className="min-h-16 text-sm"
            disabled={busy}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setDraft(null);
              }
            }}
            value={draft}
          />
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setDraft(null)}
              size="xs"
              type="button"
              variant="ghost"
            >
              {t("cancel")}
            </Button>
            <Button disabled={busy || !draft.trim()} size="xs" type="submit">
              {t("save")}
            </Button>
          </div>
        </form>
      ) : null}
      {entry && draft === null ? (
        <div className="flex items-start gap-2">
          {entry.text && !(entry.needsTranslation && translating) ? (
            <p className="text-muted-foreground min-w-0 flex-1 text-sm break-words">
              {entry.text}
            </p>
          ) : (
            <p className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1.5 text-sm">
              {translating ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : null}
              {translating ? t("translating") : t("translatedOnScan")}
            </p>
          )}
          {entry.edited ? (
            <Button
              disabled={busy}
              onClick={() => onReset(plan.language)}
              size="xs"
              variant="ghost"
            >
              {t("reset")}
            </Button>
          ) : null}
          <Button
            disabled={busy || !entry.text}
            onClick={() => setDraft(entry.text ?? "")}
            size="xs"
            variant="ghost"
          >
            {t("edit")}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Which other tracked languages scan this prompt, and the stored translation
 * each of them asks. Missing translations are made on open.
 */
export function PromptTranslationsSection({
  organizationId,
  row,
  open,
}: PromptTranslationsSectionProps) {
  const t = useTranslations("geo.promptTranslations");
  const headingId = useId();
  const promptId = trackedPromptScanId(row);
  const { data } = useGeoPromptTranslations(organizationId, open);
  const { select, update, reset, translate } =
    useGeoPromptTranslationMutations(organizationId);
  const requestedRef = useRef(false);
  const needsTranslation = Boolean(
    data?.languages.some((plan) =>
      plan.entries.some(
        (entry) => entry.promptId === promptId && entry.needsTranslation
      )
    )
  );

  useEffect(() => {
    if (!needsTranslation || requestedRef.current) {
      return;
    }
    requestedRef.current = true;
    translate.mutate();
  }, [needsTranslation, translate]);

  if (!(data && row.enabled) || data.languages.length === 0) {
    return null;
  }

  const busy = select.isPending || update.isPending || reset.isPending;
  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <h3 className="text-sm font-medium" id={headingId}>
        {t("title")}
      </h3>
      <ul className="space-y-3">
        {data.languages.map((plan) => (
          <PromptTranslationRow
            busy={busy}
            key={plan.language}
            limit={data.limit}
            onReset={(language) =>
              reset.mutate(
                { promptId, language },
                { onSuccess: () => translate.mutate() }
              )
            }
            onSave={(language, text) =>
              update.mutate({ promptId, language, text })
            }
            onSelect={(language, selected) =>
              select.mutate(
                { promptId, language, selected },
                {
                  onSuccess: () => {
                    if (selected) {
                      translate.mutate();
                    }
                  },
                }
              )
            }
            plan={plan}
            promptId={promptId}
            translating={translate.isPending}
          />
        ))}
      </ul>
    </section>
  );
}
