"use client";

import type { ContentType } from "@notra/ai/schemas/content";
import type { PostStatus } from "@notra/schemas/dashboard/content";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import Link from "next/link";
import { useId } from "react";

import { Button } from "@/components/button";
import { ContentCard } from "@/components/content/content-card";
import { ContentSkeletonCard } from "@/components/content/content-skeleton-card";
import { LazyCreateContentDialog } from "@/components/content/lazy-create-content-dialog";
import { ContentActivityCard } from "@/components/dashboard/content-activity-card";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { EMPTY_STATE_CARD_COUNT } from "@/constants/empty-state";
import { useActiveGenerations } from "@/lib/hooks/use-active-generations";
import { useTodayPosts } from "@/lib/hooks/use-posts";
import type { DashboardHomePageClientProps } from "@/types/dashboard/home";
import { resolveImagePreviewSrc } from "@/utils/markdown-image";

function getPreview(markdown: string): string {
  const lines = markdown
    .split("\n")
    .filter((line) => !line.startsWith("#") && line.trim().length > 0);

  const preview = lines.slice(0, 2).join(" ").trim();

  return preview
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .slice(0, 160);
}

export default function PageClient({
  greetingText,
  organizationSlug,
}: DashboardHomePageClientProps) {
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";
  const skeletonId = useId();
  const { data, isPending } = useTodayPosts(organizationId);
  const { data: activeGenerations } = useActiveGenerations(organizationId);
  const posts = data?.posts ?? [];
  const visibleGenerations = activeGenerations?.slice(0, 3) ?? [];
  const hasActiveGenerations = visibleGenerations.length > 0;
  const maxPreviewPosts = Math.max(0, 3 - visibleGenerations.length);
  const previewPosts = posts.slice(0, maxPreviewPosts);
  const todayContent = (() => {
    if (isPending && !hasActiveGenerations) {
      return (
        <div className="grid auto-rows-[1fr] justify-items-center gap-3 sm:grid-cols-2 sm:justify-items-stretch lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              className="h-[10.625rem] w-full max-w-[21.25rem] rounded-lg sm:h-[8.75rem] sm:max-w-none"
              key={`${skeletonId}-${index + 1}`}
            />
          ))}
        </div>
      );
    }

    if (hasActiveGenerations || previewPosts.length > 0) {
      return (
        <div className="grid auto-rows-[1fr] justify-items-center gap-3 sm:grid-cols-2 sm:justify-items-stretch lg:grid-cols-3">
          {visibleGenerations.map((gen) => (
            <div
              className="w-full max-w-[340px] sm:max-w-none"
              key={`gen-${gen.runId}`}
            >
              <ContentSkeletonCard
                className="min-h-35"
                outputType={gen.outputType}
                source={gen.source}
              />
            </div>
          ))}
          {previewPosts.map((post) => (
            <div className="w-full max-w-[340px] sm:max-w-none" key={post.id}>
              <ContentCard
                className="min-h-35"
                contentSubtype={post.contentSubtype}
                contentType={post.contentType as ContentType}
                href={`/${organizationSlug}/content/${post.id}`}
                id={post.id}
                imagePreviewSrc={
                  post.contentType === "image"
                    ? resolveImagePreviewSrc({
                        content: post.content,
                        markdown: post.markdown,
                      })
                    : null
                }
                organizationId={organizationId}
                preview={getPreview(post.markdown ?? "")}
                status={post.status as PostStatus}
                title={post.title}
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <EmptyState
        action={
          <Button
            nativeButton={false}
            render={<Link href={`/${organizationSlug}/content`} />}
          >
            View content
          </Button>
        }
        description="You have no new posts today. Create one now or review your existing drafts on the content page."
        preview={
          <EmptyStateCardsPreview
            columns={3}
            count={EMPTY_STATE_CARD_COUNT.content}
            variant="content"
          />
        }
        title="No content created today"
      />
    );
  })();

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{greetingText}</h1>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Today&apos;s Content</h2>
              <p className="text-muted-foreground text-sm">
                Latest items created today
              </p>
            </div>
            <LazyCreateContentDialog
              entry="home"
              organizationId={organizationId}
            />
          </div>

          {todayContent}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Content Activity</h2>
            <p className="text-muted-foreground text-sm">
              Your content creation over the year
            </p>
          </div>

          <ContentActivityCard />
        </section>
      </div>
    </PageContainer>
  );
}
