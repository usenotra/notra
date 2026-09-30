import type { ToneProfile } from "@notra/ai/schemas/tone";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@notra/ui/components/ui/combobox";
import { Input } from "@notra/ui/components/ui/input";
import {
  InputGroupAddon,
  InputGroupText,
} from "@notra/ui/components/ui/input-group";
import { Label } from "@notra/ui/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@notra/ui/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "next-intl";

import { LANGUAGE_OPTIONS, TONE_OPTIONS } from "@/constants/brand-identity";
import { useLanguageLabel } from "@/lib/hooks/use-language-label";
import type { ToneLanguageFieldsProps } from "@/types/brand-identity";
import { getLanguageFlag } from "@/utils/brand-identity";

export function ToneLanguageFields({
  form,
  userLocales,
}: ToneLanguageFieldsProps) {
  const t = useTranslations("brand.identity.form");
  const tCommon = useTranslations("common");
  const getLanguageLabel = useLanguageLabel();
  const toneSelectItems = Object.fromEntries(
    TONE_OPTIONS.map((option) => [
      option.value,
      t(`tones.${option.value}.label`),
    ])
  );
  return (
    <TitleCard heading={t("toneLanguageHeading")}>
      <div className="space-y-6">
        <form.Field name="useCustomTone">
          {(useCustomToneField) => (
            <form.Field name="toneProfile">
              {(toneProfileField) => (
                <RadioGroup
                  aria-label={t("toneLabel")}
                  onValueChange={(value) => {
                    const useCustomTone = value === "custom";
                    useCustomToneField.handleChange(useCustomTone);
                    if (!useCustomTone) {
                      form.setFieldValue("customTone", "");
                    }
                  }}
                  value={useCustomToneField.state.value ? "custom" : "preset"}
                >
                  <div className="space-y-3 pb-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="tone-preset" value="preset" />
                      <Label htmlFor="tone-preset">
                        {t("toneProfileLabel")}
                      </Label>
                    </div>
                    <Select
                      disabled={useCustomToneField.state.value}
                      items={toneSelectItems}
                      onValueChange={(value) => {
                        if (value) {
                          toneProfileField.handleChange(value as ToneProfile);
                        }
                      }}
                      value={toneProfileField.state.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("selectTone")} />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {TONE_OPTIONS.map((option) => (
                          <SelectItem
                            className="items-start"
                            key={option.value}
                            value={option.value}
                          >
                            <span className="flex min-w-0 flex-col items-start gap-0.5">
                              <span>{t(`tones.${option.value}.label`)}</span>
                              <span className="text-muted-foreground text-xs whitespace-normal">
                                {t(`tones.${option.value}.description`)}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {t("toneScopeNote")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="tone-custom" value="custom" />
                      <Label htmlFor="tone-custom">
                        {t("customToneLabel")}
                      </Label>
                    </div>
                    <form.Field name="customTone">
                      {(customToneField) => (
                        <Input
                          autoComplete="off"
                          disabled={!useCustomToneField.state.value}
                          id={customToneField.name}
                          onBlur={customToneField.handleBlur}
                          onChange={(event) =>
                            customToneField.handleChange(event.target.value)
                          }
                          placeholder={t("customTonePlaceholder")}
                          value={customToneField.state.value}
                        />
                      )}
                    </form.Field>
                  </div>
                </RadioGroup>
              )}
            </form.Field>
          )}
        </form.Field>

        <form.Field name="language">
          {(field) => (
            <div className="space-y-2">
              <Label>{tCommon("labels.language")}</Label>
              <Combobox
                itemToStringLabel={getLanguageLabel}
                items={LANGUAGE_OPTIONS}
                onValueChange={(value) => {
                  if (value) {
                    field.handleChange(value);
                  }
                }}
                value={field.state.value}
              >
                <ComboboxInput placeholder={t("selectLanguage")}>
                  <InputGroupAddon align="inline-start">
                    <InputGroupText aria-hidden="true">
                      {getLanguageFlag(field.state.value, userLocales)}
                    </InputGroupText>
                  </InputGroupAddon>
                </ComboboxInput>
                <ComboboxContent>
                  <ComboboxEmpty>{t("noLanguageFound")}</ComboboxEmpty>
                  <ComboboxList>
                    {(language) => (
                      <ComboboxItem key={language} value={language}>
                        <span
                          aria-hidden="true"
                          className="text-base leading-none"
                        >
                          {getLanguageFlag(language, userLocales)}
                        </span>
                        <span>{getLanguageLabel(language)}</span>
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          )}
        </form.Field>

        <form.Field name="customInstructions">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>{t("customInstructionsLabel")}</Label>
              <Textarea
                className="min-h-25"
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder={t("customInstructionsPlaceholder")}
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
      </div>
    </TitleCard>
  );
}
