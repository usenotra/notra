"use client";

import { supportsPostSlug } from "@notra/ai/schemas/post";
import { useEffect, useLayoutEffect, useRef } from "react";

import { ContentDetailSourceMetadata } from "@/components/content/content-detail-source-metadata";
import { ContentEditorMediaInsert } from "@/components/content/editor/content-editor-media-insert";
import { LexicalEditor } from "@/components/content/editor/lexical-editor";
import { longFormEditorTheme } from "@/components/content/editor/long-form-editor-theme";
import { formatArticleDate } from "@/utils/format";
import { buildReviewMarkdown } from "@/utils/review-markdown";

import type { ContentEditorProps } from "./types";

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
  reviewPreviousMarkdown = null,
  organizationId,
}: ContentEditorProps) {
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const slugInputRef = useRef<HTMLTextAreaElement>(null);

  const currentMarkdown = state.editedMarkdown ?? content.markdown ?? "";
  const writeMarkdown = reviewPreviousMarkdown
    ? buildReviewMarkdown(reviewPreviousMarkdown, currentMarkdown)
    : currentMarkdown;
  const title = state.editingTitle ?? state.serverTitle;
  const slug = state.editingSlug ?? state.serverSlug ?? "";
  const showSlug = supportsPostSlug(content.contentType);

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

  return (
    <div className="w-full">
      <div className="flex items-start gap-2 text-xl leading-tight">
        <textarea
          aria-label="Post title"
          className="placeholder:text-muted-foreground/40 block h-auto min-h-0 min-w-0 flex-1 resize-none overflow-hidden bg-transparent p-0 font-semibold tracking-tight outline-none"
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
        {readOnly ? null : (
          <div className="flex h-[1.25em] shrink-0 items-center">
            <ContentEditorMediaInsert editorRef={editorRef} />
          </div>
        )}
      </div>
      <div className="text-muted-foreground mt-4 space-y-2 text-sm">
        {showSlug ? (
          <div className="text-muted-foreground flex min-w-0 flex-1 items-start gap-1 font-mono text-xs">
            <span className="shrink-0 leading-5">/</span>
            <textarea
              aria-label="Post slug"
              className="placeholder:text-muted-foreground/50 focus:text-foreground min-h-0 min-w-0 flex-1 resize-none overflow-hidden bg-transparent p-0 text-base leading-5 break-all outline-none sm:text-sm"
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
        <time
          className="text-muted-foreground mt-2 block text-sm"
          dateTime={content.date}
        >
          {formatArticleDate(new Date(content.date))}
        </time>
        {organizationId ? (
          <ContentDetailSourceMetadata
            organizationId={organizationId}
            sourceMetadata={content.sourceMetadata}
          />
        ) : null}
      </div>

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
    </div>
  );
}
