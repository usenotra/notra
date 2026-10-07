"use client";

import { Linkedin } from "@notra/ui/components/ui/svgs/linkedin";
import { XTwitter } from "@notra/ui/components/ui/svgs/twitter";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { LINKEDIN_BRAND_PRIMARY } from "@/constants/linkedin";
import { SOCIAL_PLATFORM_LABELS } from "@/constants/social-connect";
import { cn } from "@/lib/utils";
import type { PostSocialIntentButtonProps } from "@/types/content/post-social";
import {
  copyLinkedInPostForPublishing,
  createLinkedInPostUrl,
} from "@/utils/linkedin";
import { createTwitterPostUrl } from "@/utils/twitter";

export function PostSocialIntentButton({
  platform,
  content,
  className,
}: PostSocialIntentButtonProps) {
  const t = useTranslations("content.postSocial");
  const label = SOCIAL_PLATFORM_LABELS[platform];
  const isTwitter = platform === "twitter";
  const BrandIcon = isTwitter ? XTwitter : Linkedin;

  return (
    <Button
      className={cn(
        isTwitter
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "text-white hover:opacity-90",
        className
      )}
      nativeButton={false}
      render={
        platform === "twitter" ? (
          <a
            href={createTwitterPostUrl(content)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <BrandIcon className="size-4" />
            {t("postTo", { platform: label })}
          </a>
        ) : (
          <a
            href={createLinkedInPostUrl(content)}
            onClick={() => copyLinkedInPostForPublishing(content)}
            rel="noopener noreferrer"
            target="_blank"
          >
            <BrandIcon className="size-4" />
            {t("postTo", { platform: label })}
          </a>
        )
      }
      size="sm"
      style={
        isTwitter ? undefined : { backgroundColor: LINKEDIN_BRAND_PRIMARY }
      }
    />
  );
}
