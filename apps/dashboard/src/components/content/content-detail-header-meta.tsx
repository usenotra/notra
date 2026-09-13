"use client";

import type { ContentResponse } from "@notra/schemas/dashboard/content";
import { Badge } from "@notra/ui/components/ui/badge";

import { getContentTypeLabel } from "@/components/content/content-card";
import { CONTENT_PLAN_STAGE_LABEL } from "@/constants/content-plan";
import { formatDate } from "@/utils/content-detail";

interface ContentDetailHeaderMetaProps {
  content: ContentResponse;
  isGeoWriterPlanMode: boolean;
}

export function ContentDetailHeaderMeta({
  content,
  isGeoWriterPlanMode,
}: ContentDetailHeaderMetaProps) {
  if (content.contentType === "blog_post") {
    return (
      <p className="text-muted-foreground text-sm">
        {isGeoWriterPlanMode ? CONTENT_PLAN_STAGE_LABEL : "Blog post"}
        {content.status === "draft" && !isGeoWriterPlanMode ? (
          <>
            {" \u00B7 "}
            Draft
          </>
        ) : null}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <time className="text-muted-foreground text-sm" dateTime={content.date}>
        {formatDate(new Date(content.date))}
      </time>
      <Badge className="capitalize" variant="secondary">
        {getContentTypeLabel(content.contentType)}
      </Badge>
      {content.contentType !== "image" && (
        <Badge
          className="capitalize"
          variant={content.status === "published" ? "default" : "outline"}
        >
          {content.status}
        </Badge>
      )}
    </div>
  );
}
