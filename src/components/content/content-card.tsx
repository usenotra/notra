import Link from "next/link";
import { TitleCard } from "@/components/title-card";
import { Badge } from "@/components/ui/badge";
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
  date: Date;
  className?: string;
  href?: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function ContentCard({
  title,
  preview,
  contentType,
  date,
  className,
  href,
}: ContentCardProps) {
  const cardContent = (
    <TitleCard
      className={cn(
        "h-full transition-colors",
        href && "cursor-pointer hover:bg-muted/80",
        className
      )}
      heading={title}
    >
      <div className="flex h-full flex-col">
        <p className="line-clamp-3 flex-1 text-muted-foreground text-sm">
          {preview}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <time
            className="text-muted-foreground text-xs"
            dateTime={date.toISOString()}
          >
            {formatDate(date)}
          </time>
          <Badge variant="secondary">{CONTENT_TYPE_LABELS[contentType]}</Badge>
        </div>
      </div>
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
}

export { ContentCard, CONTENT_TYPES, CONTENT_TYPE_LABELS };
export type { ContentCardProps, ContentType };
