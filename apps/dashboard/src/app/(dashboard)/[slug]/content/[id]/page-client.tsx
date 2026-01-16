"use client";

import { AiEditInput } from "@/components/content/ai-edit-input";
import { CONTENT_TYPE_LABELS } from "@/components/content/content-card";
import { DiffView } from "@/components/content/diff-view";
import { LexicalEditor } from "@/components/content/editor/lexical-editor";
import type { EditorRefHandle } from "@/components/content/editor/plugins/editor-ref-plugin";
import { TitleCard } from "@/components/title-card";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useContent } from "../../../../../../../../packages/ui/src/hooks/use-content";

const VIEW_OPTIONS = ["rendered", "markdown", "diff"] as const;
type ViewOption = (typeof VIEW_OPTIONS)[number];

const TITLE_REGEX = /^#\s+(.+)$/m;

interface PageClientProps {
  contentId: string;
  organizationSlug: string;
  organizationId: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function extractTitleFromMarkdown(markdown: string): string {
  const match = markdown.match(TITLE_REGEX);
  return match ? match[1] : "Untitled";
}

export default function PageClient({
  contentId,
  organizationSlug,
  organizationId,
}: PageClientProps) {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(VIEW_OPTIONS).withDefault("rendered")
  );

  const { data, isLoading, error } = useContent(organizationId, contentId);

  const [editedMarkdown, setEditedMarkdown] = useState<string | null>(null);
  const [originalMarkdown, setOriginalMarkdown] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const saveToastIdRef = useRef<string | number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<EditorRefHandle | null>(null);
  // biome-ignore lint/suspicious/noEmptyBlockStatements: Initial empty function for ref
  const handleSaveRef = useRef<() => void>(() => {});
  // biome-ignore lint/suspicious/noEmptyBlockStatements: Initial empty function for ref
  const handleDiscardRef = useRef<() => void>(() => {});

  // Initialize content when data loads
  useEffect(() => {
    if (data?.content && editedMarkdown === null) {
      setEditedMarkdown(data.content.markdown);
      setOriginalMarkdown(data.content.markdown);
      setEditorKey((k) => k + 1); // Force Lexical to remount with new content
    }
  }, [data, editedMarkdown]);

  const currentMarkdown = editedMarkdown ?? data?.content?.markdown ?? "";
  const hasChanges =
    editedMarkdown !== null && editedMarkdown !== originalMarkdown;
  const title = currentMarkdown
    ? extractTitleFromMarkdown(currentMarkdown)
    : (data?.content?.title ?? "Loading...");

  const [, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!editedMarkdown) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/content/${contentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown: editedMarkdown }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      setOriginalMarkdown(editedMarkdown);
      toast.success("Content saved");
    } catch (err) {
      console.error("Error saving content:", err);
      toast.error("Failed to save content");
    } finally {
      setIsSaving(false);
    }
  }, [editedMarkdown, organizationId, contentId]);

  const handleDiscard = useCallback(() => {
    setEditedMarkdown(originalMarkdown);
    // Update Lexical editor content directly without remounting
    editorRef.current?.setMarkdown(originalMarkdown);
  }, [originalMarkdown]);

  // Keep refs updated with latest callbacks
  useEffect(() => {
    handleSaveRef.current = handleSave;
    handleDiscardRef.current = handleDiscard;
  }, [handleSave, handleDiscard]);

  // Persistent save toast - only create/dismiss based on hasChanges
  useEffect(() => {
    if (hasChanges && !saveToastIdRef.current) {
      saveToastIdRef.current = toast.custom(
        (t) => (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-lg">
            <span className="text-muted-foreground text-sm">
              Unsaved changes
            </span>
            <Button
              onClick={() => {
                handleDiscardRef.current();
                toast.dismiss(t);
              }}
              size="sm"
              variant="ghost"
            >
              Discard
            </Button>
            <Button
              onClick={() => {
                handleSaveRef.current();
                toast.dismiss(t);
              }}
              size="sm"
            >
              Save
            </Button>
          </div>
        ),
        { duration: Number.POSITIVE_INFINITY, position: "bottom-right" }
      );
    } else if (!hasChanges && saveToastIdRef.current) {
      toast.dismiss(saveToastIdRef.current);
      saveToastIdRef.current = null;
    }
  }, [hasChanges]);

  // Cleanup toast on unmount
  useEffect(() => {
    return () => {
      if (saveToastIdRef.current) {
        toast.dismiss(saveToastIdRef.current);
      }
    };
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedText(null);
  }, []);

  // Handle Lexical editor changes
  const handleEditorChange = useCallback((markdown: string) => {
    setEditedMarkdown(markdown);
  }, []);

  // Handle Lexical selection
  const handleSelectionChange = useCallback((text: string | null) => {
    if (text && text.length > 0) {
      setSelectedText(text);
    }
  }, []);

  // Handle textarea selection
  const handleTextareaSelect = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start !== end) {
      const text = textarea.value.substring(start, end).trim();
      if (text) {
        setSelectedText(text);
      }
    }
  }, []);

  const handleAiEdit = async (instruction: string) => {
    setIsEditing(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/content/${contentId}/edit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            currentMarkdown,
            selectedText,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to edit content");
      }

      const responseData = await response.json();
      if (responseData.markdown) {
        setEditedMarkdown(responseData.markdown);
        // Update Lexical editor content directly without remounting
        editorRef.current?.setMarkdown(responseData.markdown);
      }

      clearSelection();
    } catch (err) {
      console.error("Error editing content:", err);
    } finally {
      setIsEditing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 lg:px-6">
          <div className="rounded-xl border border-dashed p-12 text-center">
            <p className="text-muted-foreground text-sm">Loading content...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.content) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 lg:px-6">
          <div className="rounded-xl border border-dashed p-12 text-center">
            <h3 className="font-medium text-lg">Content not found</h3>
            <p className="text-muted-foreground text-sm">
              This content may have been deleted or you don't have access to it.
            </p>
            <Link
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/${organizationSlug}/content`}
            >
              <Button className="mt-4" tabIndex={-1} variant="outline">
                Back to Content
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const content = data.content;

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Link
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={`/${organizationSlug}/content`}
          >
            <Button size="sm" tabIndex={-1} variant="ghost">
              <svg
                className="mr-2 size-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Back arrow</title>
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
              Back to Content
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <time
              className="text-muted-foreground text-sm"
              dateTime={content.date}
            >
              {formatDate(new Date(content.date))}
            </time>
            <Badge variant="secondary">
              {CONTENT_TYPE_LABELS[content.contentType]}
            </Badge>
          </div>
        </div>

        <Tabs
          className="w-full"
          onValueChange={(value) => setView(value as ViewOption)}
          value={view}
        >
          <TitleCard
            action={
              <TabsList variant="line">
                <TabsTrigger value="rendered">Rendered</TabsTrigger>
                <TabsTrigger value="markdown">Markdown</TabsTrigger>
                <TabsTrigger value="diff">
                  Diff
                  {hasChanges && (
                    <span className="ml-1.5 size-2 rounded-full bg-primary" />
                  )}
                </TabsTrigger>
              </TabsList>
            }
            heading={title}
          >
            <TabsContent
              className="prose prose-neutral dark:prose-invert mt-0 max-w-none"
              value="rendered"
            >
              {currentMarkdown && (
                <LexicalEditor
                  editorRef={editorRef}
                  initialMarkdown={currentMarkdown}
                  key={editorKey}
                  onChange={handleEditorChange}
                  onSelectionChange={handleSelectionChange}
                />
              )}
            </TabsContent>
            <TabsContent className="mt-0" value="markdown">
              <textarea
                aria-label="Markdown content editor"
                className="min-h-[500px] w-full resize-none whitespace-pre-wrap rounded-lg border-0 bg-transparent font-mono text-sm selection:bg-primary/30 focus:outline-none focus:ring-0"
                onChange={(e) => setEditedMarkdown(e.target.value)}
                onMouseUp={handleTextareaSelect}
                onSelect={handleTextareaSelect}
                ref={textareaRef}
                value={currentMarkdown}
              />
            </TabsContent>
            <TabsContent className="mt-0" value="diff">
              <DiffView
                currentMarkdown={currentMarkdown}
                originalMarkdown={originalMarkdown}
              />
            </TabsContent>
          </TitleCard>
        </Tabs>

        <div className="h-32" />
      </div>

      <AiEditInput
        isLoading={isEditing}
        onClearSelection={clearSelection}
        onSubmit={handleAiEdit}
        selectedText={selectedText}
      />
    </div>
  );
}
