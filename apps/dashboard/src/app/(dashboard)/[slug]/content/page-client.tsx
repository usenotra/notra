"use client";

import { ContentCard } from "@notra/ui/components/content/content-card";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useEffect, useRef } from "react";
import type { ContentType, Post } from "@/utils/schemas/content";
import { usePosts } from "../../../../../../../packages/ui/src/hooks/use-posts";

interface PageClientProps {
  organizationSlug: string;
}

function formatDateHeading(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function groupPostsByDate(posts: Post[]): Map<string, Post[]> {
  const groups = new Map<string, Post[]>();

  for (const post of posts) {
    const date = new Date(post.createdAt);
    const dateKey = date.toDateString();

    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(post);
    } else {
      groups.set(dateKey, [post]);
    }
  }

  return groups;
}

function getPreview(markdown: string): string {
  // Remove markdown headers and get first paragraph-like content
  const lines = markdown
    .split("\n")
    .filter((line) => !line.startsWith("#") && line.trim().length > 0);

  const preview = lines.slice(0, 3).join(" ").trim();

  // Clean up markdown formatting
  return preview
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .slice(0, 200);
}

const SKELETON_KEYS = [
  "skeleton-1",
  "skeleton-2",
  "skeleton-3",
  "skeleton-4",
  "skeleton-5",
  "skeleton-6",
  "skeleton-7",
  "skeleton-8",
];

function PostsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SKELETON_KEYS.map((key) => (
          <div className="space-y-3 rounded-[20px] border p-4" key={key}>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
  } = usePosts(organizationId);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = data?.pages.flatMap((page) => page.posts) ?? [];
  const groupedPosts = groupPostsByDate(allPosts);

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">Content</h1>
          <p className="text-muted-foreground">
            View and manage your generated content
          </p>
        </div>

        {isLoading && <PostsSkeleton />}

        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            Failed to load posts. Please try again.
          </div>
        )}

        {!isLoading && allPosts.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No content yet. Generate your first piece of content to get
              started.
            </p>
          </div>
        )}

        {Array.from(groupedPosts.entries()).map(([dateKey, posts]) => (
          <section className="space-y-4" key={dateKey}>
            <h2 className="font-semibold text-lg">
              {formatDateHeading(dateKey)}
            </h2>
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {posts.map((post) => (
                <ContentCard
                  contentType={post.contentType as ContentType}
                  href={`/${organizationSlug}/content/${post.id}`}
                  key={post.id}
                  preview={getPreview(post.markdown)}
                  title={post.title}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Infinite scroll trigger */}
        <div className="h-10" ref={loadMoreRef}>
          {isFetchingNextPage && (
            <div className="flex items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
