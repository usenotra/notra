import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card
      className={cn(
        "flex h-full flex-col transition-colors",
        href && "cursor-pointer hover:bg-accent/50",
        className
      )}
    >
      <CardHeader>
        <CardTitle className="line-clamp-2">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <CardDescription className="line-clamp-3">{preview}</CardDescription>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <time
          className="text-muted-foreground text-xs"
          dateTime={date.toISOString()}
        >
          {formatDate(date)}
        </time>
        <Badge variant="secondary">{CONTENT_TYPE_LABELS[contentType]}</Badge>
      </CardFooter>
    </Card>
  );

  if (href) {
    return (
      <Link className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg" href={href}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

export { ContentCard, CONTENT_TYPES, CONTENT_TYPE_LABELS };
export type { ContentCardProps, ContentType };
