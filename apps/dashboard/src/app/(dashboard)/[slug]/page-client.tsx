"use client";

import { useId } from "react";
import { ContentCard } from "@/components/content/content-card";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useTodayPosts } from "@/lib/hooks/use-posts";
import type { ContentType } from "@/utils/schemas/content";

interface PageClientProps {
  organizationSlug: string;
}

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

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";
  const skeletonId = useId();
  const { data, isPending } = useTodayPosts(organizationId);
  const posts = data?.pages.flatMap((page) => page.posts) ?? [];
  const previewPosts = posts.slice(0, 3);

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">👋 Welcome!</h1>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Today&apos;s content</h2>
              <p className="text-muted-foreground text-sm">
                Latest items created today
              </p>
            </div>
          </div>

          {isPending ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="h-[140px] rounded-[20px] border border-border/60 bg-muted/30"
                  key={`${skeletonId}-${index + 1}`}
                />
              ))}
            </div>
          ) : previewPosts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {previewPosts.map((post) => (
                <ContentCard
                  contentType={post.contentType as ContentType}
                  href={`/${organizationSlug}/content/${post.id}`}
                  key={post.id}
                  preview={getPreview(post.markdown)}
                  title={post.title}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
              No content created today.
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
