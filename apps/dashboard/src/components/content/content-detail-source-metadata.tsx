"use client";

import { sourceMetadataSchema } from "@notra/schemas/dashboard/content";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

import { dashboardOrpc } from "@/lib/orpc/query";
import { getBrandFaviconUrl } from "@/utils/brand";
import {
  formatDateRange,
  formatLookbackWindow,
  formatRepos,
  formatTriggerType,
} from "@/utils/content-detail";

interface ContentDetailSourceMetadataProps {
  organizationId: string;
  sourceMetadata: unknown;
}

export function ContentDetailSourceMetadata({
  organizationId,
  sourceMetadata,
}: ContentDetailSourceMetadataProps) {
  const { data: brandResponse } = useQuery(
    dashboardOrpc.brand.voices.list.queryOptions({
      input: { organizationId },
      enabled: !!organizationId,
    })
  );

  if (!sourceMetadata) {
    return null;
  }

  const parsed = sourceMetadataSchema.safeParse(sourceMetadata);
  if (!parsed.success || !parsed.data) {
    return null;
  }

  const meta = parsed.data;
  const repositories = meta.repositories ?? [];
  if (
    repositories.length === 0 ||
    !meta.triggerSourceType ||
    !meta.lookbackWindow ||
    !meta.lookbackRange
  ) {
    return null;
  }

  const repoLabel = formatRepos(repositories);
  const needsTooltip = repositories.length > 1;
  const voices = brandResponse?.voices ?? [];
  const voice = meta.brandVoiceName
    ? voices.find((item) =>
        meta.brandVoiceId
          ? item.id === meta.brandVoiceId
          : item.name === meta.brandVoiceName
      )
    : undefined;

  return (
    <p className="text-muted-foreground text-xs">
      <span className="capitalize">
        {formatTriggerType(meta.triggerSourceType)}
      </span>
      {" \u00B7 "}
      {needsTooltip ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="cursor-help underline decoration-dotted underline-offset-2">
                {repoLabel}
              </span>
            }
          />
          <TooltipContent>
            <ul>
              {repositories.map((repository) => (
                <li key={`${repository.owner}/${repository.repo}`}>
                  {repository.owner}/{repository.repo}
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      ) : (
        repoLabel
      )}
      {" \u00B7 "}
      <span className="capitalize">
        {formatLookbackWindow(meta.lookbackWindow)}
      </span>{" "}
      ({formatDateRange(meta.lookbackRange.start, meta.lookbackRange.end)})
      {meta.brandVoiceName ? (
        <>
          {" \u00B7 "}
          {voice ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="cursor-help underline decoration-dotted underline-offset-2">
                    {meta.brandVoiceName}
                  </span>
                }
              />
              <TooltipContent className="flex items-start gap-3" side="top">
                <Avatar
                  className="mt-0.5 size-8 shrink-0 rounded-full after:rounded-full"
                  size="sm"
                >
                  <AvatarImage src={getBrandFaviconUrl(voice.websiteUrl)} />
                  <AvatarFallback className="text-xs">
                    {voice.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5">
                  <p className="font-medium">{voice.name}</p>
                  {voice.toneProfile ? <p>Tone: {voice.toneProfile}</p> : null}
                  {voice.language ? <p>Language: {voice.language}</p> : null}
                  {voice.companyName ? (
                    <p>Company: {voice.companyName}</p>
                  ) : null}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            meta.brandVoiceName
          )}
        </>
      ) : null}
    </p>
  );
}
