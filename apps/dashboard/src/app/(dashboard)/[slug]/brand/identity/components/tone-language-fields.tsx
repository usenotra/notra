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
import { Label } from "@notra/ui/components/ui/label";
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
} from "@/constants/brand-identity";
import type { ToneLanguageFieldsProps } from "@/types/brand-identity";
import { getLanguageFlag } from "@/utils/brand-identity";

export function ToneLanguageFields({
  form,
  userLocales,
}: ToneLanguageFieldsProps) {
  return (
    <TitleCard heading="Tone & Language">
      <form.Field name="useCustomTone">
        {(useCustomToneField) => (
          <fieldset className="space-y-4">
            <legend className="sr-only">Tone selection</legend>
            <form.Field name="toneProfile">
              {(toneProfileField) => (
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      checked={!useCustomToneField.state.value}
                      className="peer sr-only"
                      name="toneType"
                      onChange={() => {
                        useCustomToneField.handleChange(false);
                        form.setFieldValue("customTone", "");
                      }}
                      type="radio"
                      value="preset"
                    />
                    <div
                      className={`flex size-5 items-center justify-center rounded-full ${
                        useCustomToneField.state.value
                          ? "border-muted-foreground/30 border-2"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {!useCustomToneField.state.value && (
                        <svg
                          aria-hidden="true"
                          className="size-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M5 13l4 4L19 7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className={
                        useCustomToneField.state.value
                          ? "text-muted-foreground text-sm"
                          : "text-sm"
                      }
                    >
                      Tone Profile
                    </span>
                  </label>
                  <Select
                    disabled={useCustomToneField.state.value}
                    onValueChange={(value) => {
                      if (value) {
                        toneProfileField.handleChange(value as ToneProfile);
                      }
                    }}
                    value={toneProfileField.state.value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        className="[&_[data-item-desc]]:hidden"
                        placeholder="Select tone"
                      />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {TONE_OPTIONS.map((option) => (
                        <SelectItem
                          className="items-start py-1.5"
                          key={option.value}
                          value={option.value}
                        >
                          <span className="flex min-w-0 flex-col items-start gap-0.5">
                            <span>{option.label}</span>
                            <span
                              data-item-desc
                              className="text-muted-foreground text-xs whitespace-normal"
                            >
                              {option.description}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    {TONE_SCOPE_NOTE} Custom Tone adds your own notes on top of
                    the profile.
                  </p>
                </div>
              )}
            </form.Field>

            <div className="pt-4">
              <form.Field name="customTone">
                {(customToneField) => (
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        checked={useCustomToneField.state.value}
                        className="peer sr-only"
                        name="toneType"
                        onChange={() => useCustomToneField.handleChange(true)}
                        type="radio"
                        value="custom"
                      />
                      <div
                        className={`flex size-5 items-center justify-center rounded-full ${
                          useCustomToneField.state.value
                            ? "bg-primary text-primary-foreground"
                            : "border-muted-foreground/30 border-2"
                        }`}
                      >
                        {useCustomToneField.state.value && (
                          <svg
                            aria-hidden="true"
                            className="size-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M5 13l4 4L19 7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm">Custom Tone</span>
                    </label>
                    <Input
                      autoComplete="off"
                      disabled={!useCustomToneField.state.value}
                      id={customToneField.name}
                      onBlur={customToneField.handleBlur}
                      onChange={(e) =>
                        customToneField.handleChange(e.target.value)
                      }
                      placeholder="Add custom tone notes..."
                      value={customToneField.state.value}
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </fieldset>
        )}
      </form.Field>

      <div className="pt-4">
        <form.Field name="language">
          {(field) => (
            <div className="space-y-2">
              <Label>Language</Label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-base leading-none"
                >
                  {getLanguageFlag(field.state.value, userLocales)}
                </span>
                <Combobox
                  items={LANGUAGE_OPTIONS}
                  onValueChange={(value) => {
                    if (value) {
                      field.handleChange(value);
                    }
                  }}
                  value={field.state.value}
                >
                  <ComboboxInput
                    className="**:data-[slot=input-group-control]:pl-9"
                    placeholder="Select language..."
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No language found</ComboboxEmpty>
                    <ComboboxList>
                      {(lang) => (
                        <ComboboxItem key={lang} value={lang}>
                          <span
                            aria-hidden="true"
                            className="text-base leading-none"
                          >
                            {getLanguageFlag(lang, userLocales)}
                          </span>
                          <span>{lang}</span>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            </div>
          )}
        </form.Field>
      </div>

      <div className="pt-4">
        <form.Field name="customInstructions">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>Custom Instructions</Label>
              <Textarea
                className="min-h-25"
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Add any specific instructions for AI-generated content (e.g., avoid certain phrases, always mention specific features, etc.)"
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
      </div>
    </TitleCard>
  );
}
