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
import { useTranslations } from "next-intl";

import type { BrandSettings } from "@/types/hooks/brand-analysis";
import { getBrandFaviconUrl } from "@/utils/brand";

export function BrandVoiceCell({
  voice,
  isDefault,
}: {
  voice?: BrandSettings;
  isDefault?: boolean;
}) {
  const t = useTranslations("automation.brandVoice");
  const tCommon = useTranslations("common");
  if (!voice) {
    if (isDefault) {
      return (
        <Tooltip>
          <TooltipTrigger className="max-w-full cursor-help truncate text-sm">
            {tCommon("states.none")}
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-medium">{t("noIdentity")}</p>
            <p className="text-muted-foreground">
              {t("noIdentityDescription")}
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
            {t("defaultSuffix")}
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
          {voice.toneProfile && (
            <p>{tCommon("labels.toneValue", { value: voice.toneProfile })}</p>
          )}
          {voice.language && (
            <p>{tCommon("labels.languageValue", { value: voice.language })}</p>
          )}
          {voice.companyName && (
            <p>
              {tCommon("labels.companyValue", { value: voice.companyName })}
            </p>
          )}
          {isDefault && (
            <p className="text-muted-foreground">{t("defaultIdentity")}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
