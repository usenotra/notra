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
        <p className="text-muted-foreground text-xs">
          Type a commit message to check it.
        </p>
      );
    }
    if (matchedPattern === null) {
      return <p className="text-xs">Not skipped. Nothing matches.</p>;
    }
    return (
      <p className="text-xs">
        Skipped. Matches{" "}
        <code className="bg-muted rounded px-1 py-0.5 font-mono text-[11px]">
          {matchedPattern}
        </code>
        .
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={fieldName}>Ignore commits matching</Label>
        <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[11px] font-medium">
          Optional
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground text-xs">Add a prefix:</span>
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
                  {added ? `Remove ${pattern}` : `Add ${pattern}`}
                </code>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <Textarea
        aria-label="Ignore commits matching"
        aria-invalid={hasErrors}
        className="min-h-20 font-mono text-xs"
        id={fieldName}
        onBlur={onBlur}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={`e.g. ${IGNORE_COMMIT_PATTERNS_PLACEHOLDER} (separated by comma)`}
        value={value}
      />
      {hasErrors ? (
        <FieldError className="text-xs" errors={errors} />
      ) : (
        <p className="text-muted-foreground text-xs">
          If every commit in a push matches one of these, the push is skipped.
          Separate patterns with commas. Case doesn't matter.
        </p>
      )}
      <div className="space-y-1.5 rounded-lg border p-3">
        <Label className="text-xs font-medium" htmlFor={`${fieldName}-tester`}>
          Try a commit message
        </Label>
        <Input
          className="font-mono text-xs"
          id={`${fieldName}-tester`}
          onChange={(event) => {
            setSampleMessage(event.target.value);
          }}
          placeholder="e.g. chore: bump dependencies"
          value={sampleMessage}
        />
        {renderTesterResult()}
      </div>
    </div>
  );
}
