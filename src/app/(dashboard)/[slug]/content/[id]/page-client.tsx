"use client";

import { marked } from "marked";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { AiEditInput } from "@/components/content/ai-edit-input";
import { CONTENT_TYPE_LABELS } from "@/components/content/content-card";
import { DiffView } from "@/components/content/diff-view";
import { EditBar } from "@/components/content/edit-bar";
import { TitleCard } from "@/components/title-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContent } from "@/hooks/use-content";
import { useTextSelection } from "@/hooks/use-text-selection";

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

  const [editedMarkdown, setEditedMarkdown] = useState("");
  const [originalMarkdown, setOriginalMarkdown] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const { selection, clearSelection } = useTextSelection(contentRef);

  useEffect(() => {
    if (data?.content) {
      setEditedMarkdown(data.content.markdown);
      setOriginalMarkdown(data.content.markdown);
    }
  }, [data]);

  const hasChanges = editedMarkdown !== originalMarkdown;
  const title = editedMarkdown
    ? extractTitleFromMarkdown(editedMarkdown)
    : (data?.content?.title ?? "Loading...");

  const renderedHtml = editedMarkdown ? marked.parse(editedMarkdown) : "";

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
            currentMarkdown: editedMarkdown,
            selectedText: selection?.text,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to edit content");
      }

      const data = await response.json();
      if (data.markdown) {
        setEditedMarkdown(data.markdown);
      }

      clearSelection();
    } catch (error) {
      console.error("Error editing content:", error);
    } finally {
      setIsEditing(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    // TODO: Implement save to database
    setOriginalMarkdown(editedMarkdown);
    setIsSaving(false);
  };

  const handleDiscard = () => {
    setEditedMarkdown(originalMarkdown);
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
            <div ref={contentRef}>
              <TabsContent className="mt-0" value="rendered">
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html:
                      typeof renderedHtml === "string" ? renderedHtml : "",
                  }}
                />
              </TabsContent>
              <TabsContent className="mt-0" value="markdown">
                <textarea
                  className="min-h-[500px] w-full resize-none whitespace-pre-wrap rounded-lg border-0 bg-transparent font-mono text-sm focus:outline-none focus:ring-0"
                  onChange={(e) => setEditedMarkdown(e.target.value)}
                  value={editedMarkdown}
                />
              </TabsContent>
              <TabsContent className="mt-0 select-none" value="diff">
                <DiffView
                  currentMarkdown={editedMarkdown}
                  originalMarkdown={originalMarkdown}
                />
              </TabsContent>
            </div>
          </TitleCard>
        </Tabs>

        <div className="h-32" />
      </div>

      <EditBar
        hasChanges={hasChanges}
        isSaving={isSaving}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />

      <AiEditInput
        isLoading={isEditing}
        onClearSelection={clearSelection}
        onSubmit={handleAiEdit}
        selectedText={selection?.text ?? null}
      />
    </div>
  );
}
