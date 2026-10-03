"use client";

import { parseDiffFromFile } from "@pierre/diffs";
import { FileDiff } from "@pierre/diffs/react";
import type { FileDiffOptions } from "@pierre/diffs/react";
import { useTheme } from "next-themes";
import { useMemo } from "react";

import {
  SITE_CODE_DIFF_CSS,
  SITE_CODE_SURFACE_CLASS,
  SITE_CODE_THEME,
} from "@/constants/site-editor";
import { cn } from "@/lib/utils";
import type { SiteFileDiffProps } from "@/types/site-editor";
import { siteCodeThemeType } from "@/utils/site-editor";

/** One file's draft against its published version, rendered by Pierre. */
export function SiteFileDiff({
  path,
  before,
  after,
  diffStyle,
  className,
}: SiteFileDiffProps) {
  const { resolvedTheme } = useTheme();
  const fileDiff = useMemo(
    () =>
      parseDiffFromFile(
        before === null ? null : { name: path, contents: before },
        after === null ? null : { name: path, contents: after }
      ),
    [path, before, after]
  );
  const options = useMemo<FileDiffOptions<undefined, undefined>>(
    () => ({
      theme: SITE_CODE_THEME,
      themeType: siteCodeThemeType(resolvedTheme),
      diffStyle,
      disableFileHeader: true,
      overflow: "wrap",
      hunkSeparators: "line-info-basic",
      diffIndicators: "bars",
      lineDiffType: "word",
      unsafeCSS: SITE_CODE_DIFF_CSS,
    }),
    [diffStyle, resolvedTheme]
  );

  return (
    <FileDiff
      className={cn(SITE_CODE_SURFACE_CLASS, className)}
      disableWorkerPool
      fileDiff={fileDiff}
      options={options}
    />
  );
}
