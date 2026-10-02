import {
  BlueskyIcon,
  DiscordIcon,
  DribbbleIcon,
  Facebook01Icon,
  Github01Icon,
  Globe02Icon,
  InstagramIcon,
  Linkedin01Icon,
  MastodonIcon,
  NewTwitterIcon,
  TelegramIcon,
  ThreadsIcon,
  TiktokIcon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { NotraAuthorSocial, ResolvedSocialLink } from "~types/blog";

interface SocialPlatform {
  label: string;
  icon: IconSvgElement;
}

const SOCIAL_PLATFORMS: Record<string, SocialPlatform> = {
  x: { label: "X", icon: NewTwitterIcon },
  twitter: { label: "X", icon: NewTwitterIcon },
  github: { label: "GitHub", icon: Github01Icon },
  linkedin: { label: "LinkedIn", icon: Linkedin01Icon },
  youtube: { label: "YouTube", icon: YoutubeIcon },
  instagram: { label: "Instagram", icon: InstagramIcon },
  facebook: { label: "Facebook", icon: Facebook01Icon },
  tiktok: { label: "TikTok", icon: TiktokIcon },
  mastodon: { label: "Mastodon", icon: MastodonIcon },
  threads: { label: "Threads", icon: ThreadsIcon },
  discord: { label: "Discord", icon: DiscordIcon },
  bluesky: { label: "Bluesky", icon: BlueskyIcon },
  dribbble: { label: "Dribbble", icon: DribbbleIcon },
  telegram: { label: "Telegram", icon: TelegramIcon },
};

const FALLBACK_PLATFORM: SocialPlatform = {
  label: "Website",
  icon: Globe02Icon,
};

const PROTOCOL_PREFIX_REGEX = /^https?:\/\//;
const WWW_PREFIX_REGEX = /^www\./;
const TRAILING_SLASH_REGEX = /\/$/;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function toSafeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  const candidate = PROTOCOL_PREFIX_REGEX.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function toDisplayUrl(url: string) {
  return url
    .replace(PROTOCOL_PREFIX_REGEX, "")
    .replace(WWW_PREFIX_REGEX, "")
    .replace(TRAILING_SLASH_REGEX, "");
}

export function resolveSocialLink(
  social: NotraAuthorSocial
): ResolvedSocialLink | null {
  const safeUrl = toSafeUrl(social.url);

  if (!safeUrl) {
    return null;
  }

  const platform =
    SOCIAL_PLATFORMS[social.platform.toLowerCase()] ?? FALLBACK_PLATFORM;

  return {
    label: platform.label,
    icon: platform.icon,
    url: safeUrl,
    displayUrl: toDisplayUrl(safeUrl),
  };
}
