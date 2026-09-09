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

import type {
  ContentSourceMetadataProps,
  RepositoryMetadataProps,
  VoiceMetadataProps,
} from "@/types/content/detail-toolbar";
import { getBrandFaviconUrl } from "@/utils/brand";
import {
  formatLinearSourceLabel,
  hasContentSourceReference,
} from "@/utils/content-source-metadata";
import { formatSnakeCaseLabel } from "@/utils/format";

const rangeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function triggerLabel(type: string): string {
  if (type === "cron") {
    return "Schedule";
  }
  if (type === "github_webhook") {
    return "GitHub Webhook";
  }
  return formatSnakeCaseLabel(type);
}

function RepositoryMetadata({ repositories }: RepositoryMetadataProps) {
  const label =
    repositories.length === 1 && repositories[0]
      ? `${repositories[0].owner}/${repositories[0].repo}`
      : `${repositories.length} repositories`;
  if (repositories.length === 1) {
    return label;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help underline decoration-dotted underline-offset-2" />
        }
      >
        {label}
      </TooltipTrigger>
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

function VoiceMetadata({ name, voice }: VoiceMetadataProps) {
  if (!voice) {
    return name;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help underline decoration-dotted underline-offset-2" />
        }
      >
        {name}
      </TooltipTrigger>
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
          {voice.companyName ? <p>Company: {voice.companyName}</p> : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function ContentSourceMetadata({
  metadata,
  voices,
}: ContentSourceMetadataProps) {
  const parsed = sourceMetadataSchema.safeParse(metadata);
  if (!parsed.success || !parsed.data) {
    return null;
  }
  const meta = parsed.data;
  const repositories = meta.repositories ?? [];
  const linearIntegrations = meta.linearIntegrations ?? [];
  if (
    !hasContentSourceReference({
      repositoryCount: repositories.length,
      linearIntegrationCount: linearIntegrations.length,
    }) ||
    !meta.triggerSourceType ||
    !meta.lookbackWindow ||
    !meta.lookbackRange
  ) {
    return null;
  }
  const voice = meta.brandVoiceId
    ? voices.find((item) => item.id === meta.brandVoiceId)
    : voices.find((item) => item.name === meta.brandVoiceName);

  return (
    <p className="text-muted-foreground text-xs">
      <span className="capitalize">{triggerLabel(meta.triggerSourceType)}</span>
      {" · "}
      {repositories.length > 0 ? (
        <RepositoryMetadata repositories={repositories} />
      ) : null}
      {repositories.length > 0 && linearIntegrations.length > 0 ? " · " : null}
      {linearIntegrations.length > 0
        ? formatLinearSourceLabel(linearIntegrations.length)
        : null}
      {" · "}
      <span className="capitalize">
        {formatSnakeCaseLabel(meta.lookbackWindow)}
      </span>{" "}
      ({rangeFormatter.format(new Date(meta.lookbackRange.start))} –{" "}
      {rangeFormatter.format(new Date(meta.lookbackRange.end))})
      {meta.brandVoiceName ? (
        <>
          {" · "}
          <VoiceMetadata name={meta.brandVoiceName} voice={voice} />
        </>
      ) : null}
    </p>
  );
}
