"use client";

import { supportsPostSlug } from "@notra/ai/schemas/post";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { LexicalEditor } from "@/components/content/editor/lexical-editor";
import { longFormEditorTheme } from "@/components/content/editor/long-form-editor-theme";
import {
  CONTENT_EDITOR_VIEWS,
  type ContentEditorView,
} from "@/constants/content-editor-view";
import { cn } from "@/lib/utils";
import { formatArticleDate } from "@/utils/format";
import { buildReviewMarkdown } from "@/utils/review-markdown";

import type { ContentEditorProps } from "./types";

const VIEW_LABELS: Record<ContentEditorView, string> = {
  rendered: "Write",
  markdown: "Markdown",
};

function fitTextareaHeight(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

export function LongFormEditor({
  content,
  state,
  actions,
  readOnly = false,
  editorRef,
  editorKey,
  writeFocusNonce = 0,
  reviewPreviousMarkdown = null,
}: ContentEditorProps) {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(CONTENT_EDITOR_VIEWS).withDefault("rendered")
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const slugInputRef = useRef<HTMLTextAreaElement>(null);

  const currentMarkdown = state.editedMarkdown ?? content.markdown ?? "";
  const writeMarkdown = reviewPreviousMarkdown
    ? buildReviewMarkdown(reviewPreviousMarkdown, currentMarkdown)
    : currentMarkdown;
  const title = state.editingTitle ?? state.serverTitle;
  const slug = state.editingSlug ?? state.serverSlug ?? "";
  const showSlug = supportsPostSlug(content.contentType);

  useEffect(() => {
    if (writeFocusNonce === 0) {
      return;
    }
    setView("rendered").catch(() => undefined);
  }, [setView, writeFocusNonce]);

  useLayoutEffect(() => {
    fitTextareaHeight(titleInputRef.current);
  }, [title]);

  useLayoutEffect(() => {
    fitTextareaHeight(slugInputRef.current);
  }, [slug]);

  useEffect(() => {
    const resizeTextareas = () => {
      fitTextareaHeight(titleInputRef.current);
      fitTextareaHeight(slugInputRef.current);
    };

    window.addEventListener("resize", resizeTextareas);
    return () => window.removeEventListener("resize", resizeTextareas);
  }, []);

  const handleTextareaSelect = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const startOffset = textarea.selectionStart;
    const endOffset = textarea.selectionEnd;
    if (startOffset === endOffset) {
      actions.onSelectionChange(null);
      return;
    }

    const text = textarea.value.substring(startOffset, endOffset).trim();
    if (!text) {
      actions.onSelectionChange(null);
      return;
    }

    const getLineAndChar = (offset: number) => {
      const lines = textarea.value.substring(0, offset).split("\n");
      return {
        line: lines.length,
        char: (lines.at(-1)?.length ?? 0) + 1,
      };
    };
    const start = getLineAndChar(startOffset);
    const end = getLineAndChar(endOffset);
    actions.onSelectionChange({
      text,
      startLine: start.line,
      startChar: start.char,
      endLine: end.line,
      endChar: end.char,
    });
  }, [actions]);

  return (
    <div className="w-full">
      <textarea
        aria-label="Post title"
        className="placeholder:text-muted-foreground/40 block h-auto min-h-0 w-full resize-none overflow-hidden bg-transparent p-0 text-2xl leading-tight font-semibold tracking-tight outline-none focus:ring-0 md:text-3xl"
        onChange={(e) => actions.setEditingTitle(e.target.value)}
        onFocus={(e) => {
          if (state.editingTitle === null) {
            actions.setEditingTitle(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            titleInputRef.current?.blur();
          }
          if (e.key === "Escape") {
            actions.setEditingTitle(null);
            titleInputRef.current?.blur();
          }
        }}
        placeholder="Untitled"
        readOnly={readOnly}
        ref={titleInputRef}
        rows={1}
        value={title}
      />
      <div className="mt-3 flex items-start gap-6">
        {showSlug ? (
          <div className="text-muted-foreground flex min-w-0 flex-1 items-start gap-1 font-mono text-xs">
            <span className="shrink-0 leading-5">/</span>
            <textarea
              aria-label="Post slug"
              className="placeholder:text-muted-foreground/50 focus:text-foreground min-h-0 min-w-0 flex-1 resize-none overflow-hidden bg-transparent p-0 leading-5 break-all outline-none focus:ring-0"
              onBlur={() => {
                if (state.editingSlug !== null) {
                  actions.setEditingSlug(
                    state.editingSlug.replace(/^-+|-+$/g, "")
                  );
                }
              }}
              onChange={(e) => {
                const nextSlug = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9\s-]/g, "")
                  .replace(/\s+/g, "-")
                  .replace(/-+/g, "-");
                actions.setEditingSlug(nextSlug);
              }}
              onFocus={() => {
                if (state.editingSlug === null) {
                  actions.setEditingSlug(slug);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  slugInputRef.current?.blur();
                }
                if (e.key === "Escape") {
                  actions.setEditingSlug(null);
                  slugInputRef.current?.blur();
                }
              }}
              placeholder="add-a-slug"
              readOnly={readOnly}
              ref={slugInputRef}
              rows={1}
              value={slug}
            />
          </div>
        ) : null}
        <div className="ml-auto flex shrink-0 items-center gap-3 leading-5">
          {CONTENT_EDITOR_VIEWS.map((option) => (
            <button
              className={cn(
                "text-xs transition-colors",
                view === option
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={option}
              onClick={() => {
                setView(option).catch(() => undefined);
              }}
              type="button"
            >
              {VIEW_LABELS[option]}
            </button>
          ))}
        </div>
      </div>
      <time
        className="text-muted-foreground mt-2 block text-sm"
        dateTime={content.date}
      >
        {formatArticleDate(new Date(content.date))}
      </time>

      {view === "rendered" ? (
        <div className="mt-8 [&_.draggable-block-menu]:-left-6">
          <LexicalEditor
            className="min-h-[24rem]"
            cleanReviewMarks={Boolean(reviewPreviousMarkdown)}
            editable={!readOnly}
            editorRef={editorRef}
            initialMarkdown={writeMarkdown}
            key={editorKey}
            onChange={actions.onEditorChange}
            onSelectionChange={actions.onSelectionChange}
            selectedExcerpt={state.selectedExcerpt}
            theme={longFormEditorTheme}
          />
        </div>
      ) : null}

      {view === "markdown" ? (
        <textarea
          aria-label="Markdown content editor"
          className="selection:bg-primary/30 mt-8 field-sizing-content min-h-[24rem] w-full resize-none overflow-hidden border-0 bg-transparent font-mono text-sm whitespace-pre-wrap outline-none focus:ring-0"
          onChange={(e) => {
            actions.setEditedMarkdown(e.target.value);
          }}
          onMouseUp={handleTextareaSelect}
          onSelect={handleTextareaSelect}
          readOnly={readOnly}
          ref={textareaRef}
          value={currentMarkdown}
        />
      ) : null}
    </div>
  );
}
