"use client";

import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { AiChatSidebar } from "@/components/content/ai-chat-sidebar";
import { CONTENT_TYPE_LABELS } from "@/components/content/content-card";
import { TitleCard } from "@/components/title-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EXAMPLE_CONTENT } from "./content-data";

const VIEW_OPTIONS = ["rendered", "markdown"] as const;
type ViewOption = (typeof VIEW_OPTIONS)[number];

interface PageClientProps {
  contentId: string;
  organizationSlug: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function PageClient({
  contentId,
  organizationSlug,
}: PageClientProps) {
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(VIEW_OPTIONS).withDefault("rendered")
  );
  const content = EXAMPLE_CONTENT.find((c) => c.id === contentId);

  if (!content) {
    return (
      <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
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

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
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
              dateTime={content.date.toISOString()}
            >
              {formatDate(content.date)}
            </time>
            <Badge variant="secondary">
              {CONTENT_TYPE_LABELS[content.contentType]}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Tabs
            className="w-full"
            onValueChange={(value) => setView(value as ViewOption)}
            value={view}
          >
            <TitleCard
              action={
                <TabsList>
                  <TabsTrigger value="rendered">Rendered</TabsTrigger>
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                </TabsList>
              }
              heading={content.title}
            >
              <TabsContent className="mt-0" value="rendered">
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized server-side
                  dangerouslySetInnerHTML={{ __html: content.content }}
                />
              </TabsContent>
              <TabsContent className="mt-0" value="markdown">
                <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap font-mono text-sm">
                  {content.markdown}
                </pre>
              </TabsContent>
            </TitleCard>
          </Tabs>
          <aside className="hidden lg:block">
            <div className="sticky top-6 h-[calc(100vh-14rem)]">
              <AiChatSidebar contentTitle={content.title} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
