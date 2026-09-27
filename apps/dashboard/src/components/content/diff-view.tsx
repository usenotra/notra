"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";

interface DiffViewProps {
  originalMarkdown: string;
  currentMarkdown: string;
}

export function DiffView({ originalMarkdown, currentMarkdown }: DiffViewProps) {
  const t = useTranslations("content.detail.diff");
  const tCommon = useTranslations("common");
  const { resolvedTheme } = useTheme();

  const hasChanges = originalMarkdown !== currentMarkdown;

  if (!hasChanges) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-12">
        {t("noChanges")}
      </div>
    );
  }

  const isDark = resolvedTheme !== "light";

  return (
    <div className="overflow-auto rounded-lg text-sm">
      <ReactDiffViewer
        compareMethod={DiffMethod.WORDS}
        leftTitle={t("original")}
        newValue={currentMarkdown}
        oldValue={originalMarkdown}
        rightTitle={tCommon("labels.current")}
        splitView={true}
        styles={{
          variables: {
            dark: {
              diffViewerBackground: "hsl(var(--background))",
              diffViewerColor: "hsl(var(--foreground))",
              diffViewerTitleBackground: "hsl(var(--muted))",
              diffViewerTitleColor: "hsl(var(--foreground))",
              addedBackground: "rgba(34, 197, 94, 0.15)",
              addedColor: "hsl(var(--foreground))",
              removedBackground: "rgba(239, 68, 68, 0.15)",
              removedColor: "hsl(var(--foreground))",
              wordAddedBackground: "rgba(34, 197, 94, 0.4)",
              wordRemovedBackground: "rgba(239, 68, 68, 0.4)",
              addedGutterBackground: "rgba(34, 197, 94, 0.2)",
              removedGutterBackground: "rgba(239, 68, 68, 0.2)",
              gutterBackground: "hsl(var(--muted))",
              gutterBackgroundDark: "hsl(var(--muted))",
              highlightBackground: "hsl(var(--accent))",
              highlightGutterBackground: "hsl(var(--accent))",
              codeFoldGutterBackground: "hsl(var(--muted))",
              codeFoldBackground: "hsl(var(--muted))",
              emptyLineBackground: "hsl(var(--muted))",
              gutterColor: "hsl(var(--muted-foreground))",
              addedGutterColor: "hsl(var(--foreground))",
              removedGutterColor: "hsl(var(--foreground))",
              codeFoldContentColor: "hsl(var(--muted-foreground))",
            },
            light: {
              diffViewerBackground: "hsl(var(--background))",
              diffViewerColor: "hsl(var(--foreground))",
              diffViewerTitleBackground: "hsl(var(--muted))",
              diffViewerTitleColor: "hsl(var(--foreground))",
              addedBackground: "rgba(34, 197, 94, 0.1)",
              addedColor: "hsl(var(--foreground))",
              removedBackground: "rgba(239, 68, 68, 0.1)",
              removedColor: "hsl(var(--foreground))",
              wordAddedBackground: "rgba(34, 197, 94, 0.3)",
              wordRemovedBackground: "rgba(239, 68, 68, 0.3)",
              addedGutterBackground: "rgba(34, 197, 94, 0.15)",
              removedGutterBackground: "rgba(239, 68, 68, 0.15)",
              gutterBackground: "hsl(var(--muted))",
              gutterBackgroundDark: "hsl(var(--muted))",
              highlightBackground: "hsl(var(--accent))",
              highlightGutterBackground: "hsl(var(--accent))",
              codeFoldGutterBackground: "hsl(var(--muted))",
              codeFoldBackground: "hsl(var(--muted))",
              emptyLineBackground: "hsl(var(--muted))",
              gutterColor: "hsl(var(--muted-foreground))",
              addedGutterColor: "hsl(var(--foreground))",
              removedGutterColor: "hsl(var(--foreground))",
              codeFoldContentColor: "hsl(var(--muted-foreground))",
            },
          },
          contentText: {
            fontFamily: "var(--font-mono)",
            wordBreak: "break-word" as const,
          },
        }}
        useDarkTheme={isDark}
      />
    </div>
  );
}
