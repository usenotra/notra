"use client";

import { MAX_IGNORE_COMMIT_PATTERNS } from "@notra/schemas/dashboard/integrations";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { cn } from "@notra/ui/lib/utils";
import { useMemo, useState } from "react";

import type { IgnoreCommitPatternsFieldProps } from "@/types/automation/event-trigger";
import {
  addIgnoreCommitPatternToText,
  buildIgnoreCommitPrefixPattern,
  IGNORE_COMMIT_PATTERN_PRESET_PREFIXES,
  IGNORE_COMMIT_PATTERNS_PLACEHOLDER,
} from "@/utils/ignore-commit-patterns";

function findMatchingPattern(
  lines: string[],
  sample: string
): string | null | undefined {
  const trimmedSample = sample.trim();
  if (!trimmedSample) {
    return undefined;
  }
  for (const line of lines) {
    try {
      if (new RegExp(line).test(trimmedSample)) {
        return line;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function IgnoreCommitPatternsField({
  value,
  onChange,
  onBlur,
  errorMessage,
  fieldName,
}: IgnoreCommitPatternsFieldProps) {
  const [sampleMessage, setSampleMessage] = useState("");

  const lines = useMemo(
    () =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [value]
  );
  const atMaxPatterns = lines.length >= MAX_IGNORE_COMMIT_PATTERNS;

  const matchedPattern = useMemo(
    () => findMatchingPattern(lines, sampleMessage),
    [lines, sampleMessage]
  );

  function renderTesterResult() {
    if (matchedPattern === undefined) {
      return (
        <p className="text-muted-foreground text-xs">
          Type a message above to see whether it would be skipped.
        </p>
      );
    }
    if (matchedPattern === null) {
      return (
        <p className="text-xs">
          Would turn into content — no pattern matches this message.
        </p>
      );
    }
    return (
      <p className="text-xs">
        Would be skipped — matches{" "}
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
        <span className="text-muted-foreground text-xs">
          No regex needed — add a prefix:
        </span>
        {IGNORE_COMMIT_PATTERN_PRESET_PREFIXES.map((prefix) => {
          const pattern = buildIgnoreCommitPrefixPattern(prefix);
          const added = lines.includes(pattern);
          return (
            <button
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-[11px] transition-colors",
                added
                  ? "border-foreground/40 bg-muted text-muted-foreground cursor-default"
                  : "text-foreground hover:border-foreground/40 hover:bg-muted/60 cursor-pointer",
                atMaxPatterns && !added && "cursor-not-allowed opacity-50"
              )}
              disabled={added || atMaxPatterns}
              key={prefix}
              onClick={() => {
                onChange(addIgnoreCommitPatternToText(value, pattern));
              }}
              title={added ? `Already added: ${pattern}` : `Add ${pattern}`}
              type="button"
            >
              {prefix}
            </button>
          );
        })}
      </div>
      <Textarea
        aria-label="Ignore commits matching"
        aria-invalid={!!errorMessage}
        className="min-h-20 font-mono text-xs"
        id={fieldName}
        onBlur={onBlur}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={`e.g. ${IGNORE_COMMIT_PATTERNS_PLACEHOLDER}`}
        value={value}
      />
      {errorMessage ? (
        <p className="text-destructive text-xs">{errorMessage}</p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Pushes where every commit message matches are skipped, so chores never
          turn into content. One case-sensitive regex per line.
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
