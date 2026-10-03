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
  PromptTranslationEditorProps,
  PromptTranslationRowProps,
  PromptTranslationsSectionProps,
  PromptTranslationTextProps,
} from "@/types/geo";

/** Why this prompt's switch is locked for a language, if it is. */
function pickLock(
  picked: boolean,
  pickCount: number,
  limit: number
): "full" | "last" | null {
  if (!picked && pickCount >= limit) {
    return "full";
  }
  if (picked && pickCount <= 1) {
    return "last";
  }
  return null;
}

function PromptTranslationEditor({
  language,
  initialText,
  busy,
  onSave,
  onClose,
}: PromptTranslationEditorProps) {
  const t = useTranslations("geo.promptTranslations");
  const [draft, setDraft] = useState(initialText);
  const save = async () => {
    // A failed save keeps the draft so nothing has to be typed again.
    if (await onSave(draft)) {
      onClose();
    }
  };
  return (
    <div className="space-y-2">
      <Textarea
        aria-label={t("translationIn", { language })}
        autoFocus
        className="min-h-16 text-sm"
        disabled={busy}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
        value={draft}
      />
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} size="xs" type="button" variant="ghost">
          {t("cancel")}
        </Button>
        <Button
          disabled={busy || !draft.trim()}
          onClick={() => {
            void save();
          }}
          size="xs"
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

function PromptTranslationText({
  entry,
  busy,
  translating,
  onEdit,
  onReset,
}: PromptTranslationTextProps) {
  const t = useTranslations("geo.promptTranslations");
  const waiting = !entry.text || (entry.needsTranslation && translating);
  return (
    <div className="flex items-start gap-2">
      {waiting ? (
        <p className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          {translating ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : null}
          {translating ? t("translating") : t("translatedOnScan")}
        </p>
      ) : (
        <p className="text-muted-foreground min-w-0 flex-1 text-sm break-words">
          {entry.text}
        </p>
      )}
      {entry.edited ? (
        <Button disabled={busy} onClick={onReset} size="xs" variant="ghost">
          {t("reset")}
        </Button>
      ) : null}
      <Button disabled={busy} onClick={onEdit} size="xs" variant="ghost">
        {t("edit")}
      </Button>
    </div>
  );
}

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
  const [editing, setEditing] = useState(false);
  const entry = plan.entries.find((item) => item.promptId === promptId);
  const language = languageLabel(plan.language);
  const lock = pickLock(Boolean(entry), plan.entries.length, limit);
  const hint = lock ? t(lock, { limit, language }) : null;

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
          disabled={busy || lock !== null}
          onCheckedChange={(selected) => onSelect(plan.language, selected)}
        />
      </div>
      {hint ? (
        <p className="text-muted-foreground text-xs" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {entry && editing ? (
        <PromptTranslationEditor
          busy={busy}
          initialText={entry.text ?? ""}
          language={language}
          onClose={() => setEditing(false)}
          onSave={(text) => onSave(plan.language, text)}
        />
      ) : null}
      {entry && !editing ? (
        <PromptTranslationText
          busy={busy}
          entry={entry}
          onEdit={() => setEditing(true)}
          onReset={() => onReset(plan.language)}
          translating={translating}
        />
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
              update.mutateAsync({ promptId, language, text }).then(
                () => true,
                () => false
              )
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
