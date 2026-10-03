"use client";

import { Alert02Icon, CancelCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { FileContents, LineAnnotation } from "@pierre/diffs";
import type {
  Editor,
  EditorChangeEvent,
  EditorOptions,
} from "@pierre/diffs/edit";
import { EditStateManager } from "@pierre/diffs/edit";
import { File } from "@pierre/diffs/react";
import type { FileOptions } from "@pierre/diffs/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import type { KeyboardEvent } from "react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import {
  SITE_CODE_EDITOR_CSS,
  SITE_CODE_SURFACE_CLASS,
  SITE_CODE_THEME,
} from "@/constants/site-editor";
import { cn } from "@/lib/utils";
import type {
  SiteCodeAnnotation,
  SiteCodeEditorProps,
} from "@/types/site-editor";
import { siteCodeThemeType } from "@/utils/site-editor";

type SiteFileEditor = Editor<"file", SiteCodeAnnotation>;

/** Puts the caret on a line and centers it, so the diagnostic under it shows too. */
function focusLine(
  editor: SiteFileEditor | null,
  surface: HTMLElement | null,
  line: number
) {
  editor?.focus({ lineNumber: line, preventScroll: true });
  surface
    ?.querySelector("diffs-container")
    ?.shadowRoot?.querySelector(`[data-line="${line}"]`)
    ?.scrollIntoView({ block: "center" });
}

function SiteCodeAnnotationRow({
  annotation,
}: {
  annotation: SiteCodeAnnotation;
}) {
  const t = useTranslations("sites.diagnostics");
  const isError = annotation.severity === "error";
  return (
    <div
      className={cn(
        "flex items-start gap-2 border-y px-3 py-1.5 font-sans text-xs leading-5",
        isError
          ? "border-destructive/15 bg-destructive/[0.05] text-destructive"
          : "border-warning/20 bg-warning/[0.07] text-warning"
      )}
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="mt-0.5 shrink-0"
        icon={isError ? CancelCircleIcon : Alert02Icon}
        size={13}
        strokeWidth={1.75}
      />
      <span className="text-foreground/85 min-w-0 flex-1 text-pretty">
        <span className="sr-only">{isError ? t("error") : t("warning")}: </span>
        {annotation.message}
      </span>
    </div>
  );
}

/** Pierre's File in edit mode: highlighting, line numbers, undo history per file. */
export function SiteCodeEditor({
  path,
  initialValue,
  label,
  editStateKey,
  diagnostics,
  jump,
  onChange,
  onSave,
}: SiteCodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<SiteFileEditor | null>(null);
  // The editor owns the live document; the component only seeds it once.
  const [file] = useState<FileContents>(() => {
    const retained = EditStateManager.get("file", editStateKey);
    // Retained undo history only applies to the same text (not after a discard or publish).
    if (retained && retained.document.getText() !== initialValue) {
      EditStateManager.clear("file", editStateKey);
    }
    return { name: path, contents: initialValue };
  });

  const lineAnnotations = useMemo<LineAnnotation<SiteCodeAnnotation>[]>(
    () =>
      diagnostics
        .filter((diagnostic) => diagnostic.line !== undefined)
        .map((diagnostic) => ({
          lineNumber: diagnostic.line ?? 0,
          metadata: {
            severity: diagnostic.severity,
            message: diagnostic.message,
          },
        })),
    [diagnostics]
  );

  const options = useMemo<FileOptions<SiteCodeAnnotation, undefined>>(
    () => ({
      theme: SITE_CODE_THEME,
      themeType: siteCodeThemeType(resolvedTheme),
      disableFileHeader: true,
      overflow: "wrap",
      unsafeCSS: SITE_CODE_EDITOR_CSS,
    }),
    [resolvedTheme]
  );

  const surfaceRef = useRef<HTMLDivElement>(null);

  const moveCaretToLine = useEffectEvent((line: number) => {
    focusLine(editorRef.current, surfaceRef.current, line);
  });

  // A new nonce means a new jump request, even to the same line.
  useEffect(() => {
    if (jump) {
      moveCaretToLine(jump.line);
    }
  }, [jump]);

  // Creation-time options: Pierre reads them once per editor, so they never change.
  const initialJumpRef = useRef(jump);
  const [attached, setAttached] = useState(false);
  const [editorOptions] = useState<
    EditorOptions<"file", SiteCodeAnnotation, undefined>
  >(() => ({
    onAttach: (editor) => {
      editorRef.current = editor;
      setAttached(true);
      const initialJump = initialJumpRef.current;
      if (initialJump) {
        focusLine(editor, surfaceRef.current, initialJump.line);
      }
    },
  }));

  const handleKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      onSave();
    }
  };

  // The editable surface lives in a shadow root, so page-wide single-key shortcuts
  // (F for feedback, S for a demo) can't tell typing apart from a shortcut. Plain
  // keystrokes stay inside the editor; ⌘/Ctrl shortcuts like the command palette still
  // reach the page. Native, because React and the shortcuts both listen on the document.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) {
      return;
    }
    const contain = (event: globalThis.KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        event.stopPropagation();
      }
    };
    surface.addEventListener("keydown", contain);
    return () => surface.removeEventListener("keydown", contain);
  }, []);

  return (
    <div
      aria-busy={!attached}
      aria-label={label}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain",
        SITE_CODE_SURFACE_CLASS
      )}
      ref={surfaceRef}
      onKeyDownCapture={handleKeyDownCapture}
      role="group"
    >
      <File<SiteCodeAnnotation>
        edit
        editorOptions={editorOptions}
        editStateKey={editStateKey}
        file={file}
        lineAnnotations={lineAnnotations}
        onEditChange={(
          event: EditorChangeEvent<"file", SiteCodeAnnotation, undefined>
        ) => onChange(event.file.contents)}
        onEditComplete={() => "accept"}
        options={options}
        renderAnnotation={(annotation) => (
          <SiteCodeAnnotationRow annotation={annotation.metadata} />
        )}
      />
    </div>
  );
}
