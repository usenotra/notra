"use client";

import { Cancel01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from "@notra/ai/constants/languages";
import { GEO_MAX_LANGUAGES } from "@notra/geo-core/constants/geo";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@notra/ui/components/ui/combobox";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { Twemoji } from "@/components/geo/twemoji";
import { LANGUAGE_FLAGS } from "@/constants/language-flags";
import { useLanguageLabel } from "@/lib/hooks/use-language-label";
import type { GeoLanguagePickerProps } from "@/types/geo";

export function LanguageLabel({ language }: { language: string }) {
  const languageLabel = useLanguageLabel();
  return (
    <span className="flex items-center gap-1.5">
      <Twemoji
        className="size-3.5 shrink-0"
        emoji={LANGUAGE_FLAGS[language as keyof typeof LANGUAGE_FLAGS] ?? ""}
        label={languageLabel(language)}
      />
      {languageLabel(language)}
    </span>
  );
}

export function GeoLanguagePicker({
  selected,
  onChange,
  disabled = false,
  labeled = true,
  inputId,
  lockedLanguage,
}: GeoLanguagePickerProps) {
  const t = useTranslations("geo.geoLanguagePicker");
  const tCommon = useTranslations("common");
  const atLimit = selected.length >= GEO_MAX_LANGUAGES;
  const available = SUPPORTED_LANGUAGES.filter(
    (language) => !selected.includes(language)
  );
  const lastLanguage = selected.length <= 1;
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="w-full min-w-0 space-y-2">
      {labeled ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">{tCommon("labels.languages")}</p>
          <p className="text-muted-foreground text-xs">
            {t("description", {
              language: DEFAULT_LANGUAGE,
              max: GEO_MAX_LANGUAGES,
            })}
          </p>
        </div>
      ) : null}
      <Combobox
        disabled={disabled || atLimit}
        items={available}
        onValueChange={(value) => {
          setDraft(null);
          if (!value) {
            return;
          }
          onChange([...selected, value].slice(0, GEO_MAX_LANGUAGES));
        }}
        value={draft}
      >
        <ComboboxInput
          aria-label={inputId ? undefined : t("add")}
          className="w-full"
          id={inputId}
          placeholder={atLimit ? t("limitReached") : t("add")}
        />
        <ComboboxContent>
          <ComboboxEmpty>{t("noMatches")}</ComboboxEmpty>
          <ComboboxList>
            {available.map((language) => (
              <ComboboxItem key={language} value={language}>
                <LanguageLabel language={language} />
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {selected.map((language) => (
            <Badge className="gap-1 pr-1" key={language} variant="secondary">
              <LanguageLabel language={language} />
              {language === lockedLanguage ? (
                <span
                  className="text-muted-foreground p-0.5"
                  title={t("locked")}
                >
                  <HugeiconsIcon icon={LockIcon} size={12} />
                  <span className="sr-only">{t("locked")}</span>
                </span>
              ) : (
                <button
                  aria-label={t("remove", { language })}
                  className="hover:bg-background cursor-pointer rounded-full p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={disabled || lastLanguage}
                  onClick={() =>
                    onChange(selected.filter((item) => item !== language))
                  }
                  type="button"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} />
                </button>
              )}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
