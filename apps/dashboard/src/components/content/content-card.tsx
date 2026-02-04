import { TitleCard } from "@/components/title-card";
import { Badge } from "@notra/ui/components/ui/badge";
import Link from "next/link";
import { memo } from "react";
import { cn } from "@/lib/utils";

const CONTENT_TYPES = [
  "changelog",
  "blog_post",
  "twitter_post",
  "linkedin_post",
  "investor_update",
] as const;

type ContentType = (typeof CONTENT_TYPES)[number];

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  changelog: "Changelog",
  blog_post: "Blog Post",
  twitter_post: "Tweet",
  linkedin_post: "LinkedIn Post",
  investor_update: "Investor Update",
};

interface ContentCardProps {
  title: string;
  preview: string;
  contentType: ContentType;
  className?: string;
  href?: string;
}

const ContentCard = memo(function ContentCard({
  title,
  preview,
  contentType,
  className,
  href,
}: ContentCardProps) {
  const cardContent = (
    <TitleCard
      action={
        <Badge variant="secondary">{CONTENT_TYPE_LABELS[contentType]}</Badge>
      }
      className={cn(
        "h-full transition-colors",
        href && "cursor-pointer hover:bg-muted/80",
        className
      )}
      heading={title}
    >
      <p className="line-clamp-3 text-muted-foreground text-sm">{preview}</p>
    </TitleCard>
  );

  if (href) {
    return (
      <Link
        className="rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={href}
      >
        {cardContent}
      </Link>
    );
  }

  return cardContent;
});

export { ContentCard, CONTENT_TYPES, CONTENT_TYPE_LABELS };
export type { ContentCardProps, ContentType };
