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

import {
  LANGUAGE_OPTIONS,
  TONE_OPTIONS,
  TONE_SCOPE_NOTE,
  TONE_SELECT_ITEMS,
} from "@/constants/brand-identity";
import type { ToneLanguageFieldsProps } from "@/types/brand-identity";
import { getLanguageFlag } from "@/utils/brand-identity";

export function ToneLanguageFields({
  form,
  userLocales,
}: ToneLanguageFieldsProps) {
  return (
    <TitleCard heading="Tone & Language">
      <div className="space-y-6">
        <form.Field name="useCustomTone">
          {(useCustomToneField) => (
            <form.Field name="toneProfile">
              {(toneProfileField) => (
                <RadioGroup
                  aria-label="Tone"
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
                      <Label htmlFor="tone-preset">Tone profile</Label>
                    </div>
                    <Select
                      disabled={useCustomToneField.state.value}
                      items={TONE_SELECT_ITEMS}
                      onValueChange={(value) => {
                        if (value) {
                          toneProfileField.handleChange(value as ToneProfile);
                        }
                      }}
                      value={toneProfileField.state.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {TONE_OPTIONS.map((option) => (
                          <SelectItem
                            className="items-start"
                            key={option.value}
                            value={option.value}
                          >
                            <span className="flex min-w-0 flex-col items-start gap-0.5">
                              <span>{option.label}</span>
                              <span className="text-muted-foreground text-xs whitespace-normal">
                                {option.description}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {TONE_SCOPE_NOTE}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="tone-custom" value="custom" />
                      <Label htmlFor="tone-custom">Custom tone</Label>
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
                          placeholder="Add custom tone notes…"
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
              <Label>Language</Label>
              <Combobox
                items={LANGUAGE_OPTIONS}
                onValueChange={(value) => {
                  if (value) {
                    field.handleChange(value);
                  }
                }}
                value={field.state.value}
              >
                <ComboboxInput placeholder="Select language…">
                  <InputGroupAddon align="inline-start">
                    <InputGroupText aria-hidden="true">
                      {getLanguageFlag(field.state.value, userLocales)}
                    </InputGroupText>
                  </InputGroupAddon>
                </ComboboxInput>
                <ComboboxContent>
                  <ComboboxEmpty>No language found</ComboboxEmpty>
                  <ComboboxList>
                    {(language) => (
                      <ComboboxItem key={language} value={language}>
                        <span
                          aria-hidden="true"
                          className="text-base leading-none"
                        >
                          {getLanguageFlag(language, userLocales)}
                        </span>
                        <span>{language}</span>
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
              <Label htmlFor={field.name}>Custom instructions</Label>
              <Textarea
                className="min-h-25"
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Add specific instructions for AI-generated content, such as phrases to avoid or features to mention"
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
      </div>
    </TitleCard>
  );
}
