"use client";

import { cn } from "@notra/ui/lib/utils";
import { MultiFileDiff } from "@pierre/diffs/react";
import { useTheme } from "next-themes";
import { useMemo } from "react";

import {
  CHAT_DOCUMENT_DIFF_OPTIONS,
  DOCUMENT_DIFF_FRAME_CLASSNAME,
} from "@/constants/document-diff";
import type { DocumentDiffProps } from "@/types/content/document-diff";

function chatDiffThemeType(
  resolvedTheme: string | undefined
): "light" | "dark" | "system" {
  if (resolvedTheme === "light" || resolvedTheme === "dark") {
    return resolvedTheme;
  }
  return "system";
}

export function DocumentDiff({
  filename,
  previousMarkdown,
  updatedMarkdown,
  hideFileHeader,
  className,
}: DocumentDiffProps) {
  const { resolvedTheme } = useTheme();
  const oldFile = useMemo(
    () => ({ name: filename, contents: previousMarkdown }),
    [filename, previousMarkdown]
  );
  const newFile = useMemo(
    () => ({ name: filename, contents: updatedMarkdown }),
    [filename, updatedMarkdown]
  );
  const options = useMemo(
    () => ({
      ...CHAT_DOCUMENT_DIFF_OPTIONS,
      disableFileHeader: hideFileHeader,
      themeType: chatDiffThemeType(resolvedTheme),
    }),
    [hideFileHeader, resolvedTheme]
  );

  return (
    <div
      aria-label={`Changes in ${filename}`}
      className={cn(DOCUMENT_DIFF_FRAME_CLASSNAME, className)}
    >
      <MultiFileDiff
        className="w-full min-w-0"
        disableWorkerPool
        newFile={newFile}
        oldFile={oldFile}
        options={options}
      />
    </div>
  );
}
