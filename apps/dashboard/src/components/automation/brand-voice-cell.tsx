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

import type { BrandSettings } from "@/types/hooks/brand-analysis";
import { getBrandFaviconUrl } from "@/utils/brand";

export function BrandVoiceCell({
  voice,
  isDefault,
}: {
  voice?: BrandSettings;
  isDefault?: boolean;
}) {
  if (!voice) {
    if (isDefault) {
      return (
        <Tooltip>
          <TooltipTrigger className="max-w-full cursor-help truncate text-sm">
            None
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-medium">No identity</p>
            <p className="text-muted-foreground">
              No identity has been configured for this workspace yet.
            </p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return <span className="text-muted-foreground/50">&mdash;</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger className="max-w-full cursor-help truncate text-sm">
        {voice.name}
        {isDefault && (
          <span className="text-muted-foreground/60 ml-1 text-xs">
            (Default)
          </span>
        )}
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
        <div className="min-w-0 space-y-0.5 wrap-anywhere">
          <p className="font-medium">{voice.name}</p>
          {voice.toneProfile && <p>Tone: {voice.toneProfile}</p>}
          {voice.language && <p>Language: {voice.language}</p>}
          {voice.companyName && <p>Company: {voice.companyName}</p>}
          {isDefault && (
            <p className="text-muted-foreground">Default identity</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
