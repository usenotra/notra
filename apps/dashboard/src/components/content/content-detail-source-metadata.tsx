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

interface SourceMetadataVoice {
  companyName?: string | null;
  id: string;
  language?: string | null;
  name: string;
  toneProfile?: string | null;
  websiteUrl?: string | null;
}

interface ParsedSourceMetadata {
  brandVoiceId?: string | null;
  brandVoiceName?: string | null;
  lookbackRange: { end: string; start: string };
  lookbackWindow: string;
  repositories: Array<{ owner: string; repo: string }>;
  triggerSourceType: string;
}

function SourceMetadataRepoLabel({
  repositories,
}: {
  repositories: ParsedSourceMetadata["repositories"];
}) {
  const repoLabel = formatRepos(repositories);
  if (repositories.length <= 1) {
    return <>{repoLabel}</>;
  }

  return (
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
  );
}

function SourceMetadataBrandVoiceLabel({
  brandVoiceName,
  voice,
}: {
  brandVoiceName: string;
  voice?: SourceMetadataVoice;
}) {
  if (!voice) {
    return <>{brandVoiceName}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help underline decoration-dotted underline-offset-2">
            {brandVoiceName}
          </span>
        }
      />
      <TooltipContent className="flex items-start gap-3" side="top">
        <Avatar
          className="mt-0.5 size-8 shrink-0 rounded-full after:rounded-full"
          size="sm"
        >
          <AvatarImage src={getBrandFaviconUrl(voice.websiteUrl ?? null)} />
          <AvatarFallback className="text-xs">
            {voice.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-0.5">
          <div className="font-medium">{voice.name}</div>
          {voice.toneProfile ? <div>Tone: {voice.toneProfile}</div> : null}
          {voice.language ? <div>Language: {voice.language}</div> : null}
          {voice.companyName ? <div>Company: {voice.companyName}</div> : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function parseSourceMetadata(
  sourceMetadata: unknown
): ParsedSourceMetadata | null {
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

  return {
    brandVoiceId: meta.brandVoiceId,
    brandVoiceName: meta.brandVoiceName,
    lookbackRange: meta.lookbackRange,
    lookbackWindow: meta.lookbackWindow,
    repositories,
    triggerSourceType: meta.triggerSourceType,
  };
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

  const meta = parseSourceMetadata(sourceMetadata);
  if (!meta) {
    return null;
  }

  const voices = brandResponse?.voices ?? [];
  const voice = meta.brandVoiceName
    ? voices.find((item) =>
        meta.brandVoiceId
          ? item.id === meta.brandVoiceId
          : item.name === meta.brandVoiceName
      )
    : undefined;

  return (
    <div className="text-muted-foreground text-xs">
      <span className="capitalize">
        {formatTriggerType(meta.triggerSourceType)}
      </span>
      {" \u00B7 "}
      <SourceMetadataRepoLabel repositories={meta.repositories} />
      {" \u00B7 "}
      <span className="capitalize">
        {formatLookbackWindow(meta.lookbackWindow)}
      </span>{" "}
      ({formatDateRange(meta.lookbackRange.start, meta.lookbackRange.end)})
      {meta.brandVoiceName ? (
        <>
          {" \u00B7 "}
          <SourceMetadataBrandVoiceLabel
            brandVoiceName={meta.brandVoiceName}
            voice={voice}
          />
        </>
      ) : null}
    </div>
  );
}
