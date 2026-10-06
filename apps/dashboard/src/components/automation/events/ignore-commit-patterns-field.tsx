"use client";

import {
  isValidIgnoreCommitPattern,
  MAX_IGNORE_COMMIT_PATTERNS,
  splitIgnoreCommitPatternsText,
  toIgnoreCommitRegExp,
} from "@notra/ai/utils/ignore-commit-patterns";
import { FieldError } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Textarea } from "@notra/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { cn } from "@notra/ui/lib/utils";
import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";

import type { IgnoreCommitPatternsFieldProps } from "@/types/automation/event-trigger";
import {
  addIgnoreCommitPatternToText,
  buildIgnoreCommitPrefixPattern,
  IGNORE_COMMIT_PATTERN_PRESET_PREFIXES,
  IGNORE_COMMIT_PATTERNS_PLACEHOLDER,
  removeIgnoreCommitPatternFromText,
} from "@/utils/ignore-commit-patterns";

function findMatchingPattern(
  lines: string[],
  sample: string
): string | null | undefined {
  const trimmedSample = sample.trim();
  if (!trimmedSample) {
    return undefined;
  }
  return (
    lines.find(
      (line) =>
        isValidIgnoreCommitPattern(line) &&
        toIgnoreCommitRegExp(line).test(trimmedSample)
    ) ?? null
  );
}

export function IgnoreCommitPatternsField({
  value,
  onChange,
  onBlur,
  errors,
  fieldName,
}: IgnoreCommitPatternsFieldProps) {
  const t = useTranslations("automation.events.ignorePatterns");
  const tStates = useTranslations("common.states");
  const hasErrors = errors.length > 0;
  const [sampleMessage, setSampleMessage] = useState("");

  const lines = useMemo(() => splitIgnoreCommitPatternsText(value), [value]);
  const atMaxPatterns = lines.length >= MAX_IGNORE_COMMIT_PATTERNS;

  const matchedPattern = useMemo(
    () => findMatchingPattern(lines, sampleMessage),
    [lines, sampleMessage]
  );

  function renderTesterResult() {
    if (matchedPattern === undefined) {
      return (
        <p className="text-muted-foreground text-xs">{t("typeToCheck")}</p>
      );
    }
    if (matchedPattern === null) {
      return <p className="text-xs">{t("notSkipped")}</p>;
    }
    return (
      <p className="text-xs wrap-anywhere">
        {t.rich("skipped", {
          pattern: matchedPattern,
          code: (chunks) => (
            <code className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]">
              {chunks}
            </code>
          ),
        })}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={fieldName}>{t("label")}</Label>
        <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[11px] font-medium">
          {tStates("optional")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground text-xs">{t("addPrefix")}</span>
        {IGNORE_COMMIT_PATTERN_PRESET_PREFIXES.map((prefix) => {
          const pattern = buildIgnoreCommitPrefixPattern(prefix);
          const added = lines.includes(pattern);
          const disabled = !added && atMaxPatterns;
          return (
            <Tooltip key={prefix}>
              <TooltipTrigger
                render={
                  <button
                    aria-pressed={added}
                    className={cn(
                      "cursor-pointer rounded-full border px-2 py-0.5 font-mono text-[11px] transition-colors",
                      added
                        ? "border-foreground/40 bg-muted text-foreground hover:bg-muted/70"
                        : "text-foreground hover:border-foreground/40 hover:bg-muted/60",
                      disabled && "cursor-not-allowed opacity-50"
                    )}
                    disabled={disabled}
                    onClick={() => {
                      onChange(
                        added
                          ? removeIgnoreCommitPatternFromText(value, pattern)
                          : addIgnoreCommitPatternToText(value, pattern)
                      );
                    }}
                    type="button"
                  >
                    {prefix}
                  </button>
                }
              />
              <TooltipContent side="top">
                <code className="font-mono">
                  {added ? t("remove", { pattern }) : t("add", { pattern })}
                </code>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <Textarea
        aria-label={t("label")}
        aria-invalid={hasErrors}
        className="min-h-20 font-mono text-xs"
        id={fieldName}
        onBlur={onBlur}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={t("placeholder", {
          example: IGNORE_COMMIT_PATTERNS_PLACEHOLDER,
        })}
        value={value}
      />
      {hasErrors ? (
        <FieldError className="text-xs" errors={errors} />
      ) : (
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
      )}
      <div className="space-y-1.5 rounded-lg border p-3">
        <Label className="text-xs font-medium" htmlFor={`${fieldName}-tester`}>
          {t("tryLabel")}
        </Label>
        <Input
          className="font-mono text-xs"
          id={`${fieldName}-tester`}
          onChange={(event) => {
            setSampleMessage(event.target.value);
          }}
          placeholder={t("tryPlaceholder")}
          value={sampleMessage}
        />
        {renderTesterResult()}
      </div>
    </div>
  );
}
