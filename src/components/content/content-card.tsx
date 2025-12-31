"use client";

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
  onClick?: () => void;
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
  onClick,
}: ContentCardProps) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col transition-colors",
        onClick && "cursor-pointer hover:bg-accent/50",
        className
      )}
      onClick={onClick}
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
}

export { ContentCard, CONTENT_TYPES, CONTENT_TYPE_LABELS };
export type { ContentCardProps, ContentType };
