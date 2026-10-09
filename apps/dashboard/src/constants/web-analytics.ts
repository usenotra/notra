import {
  ComputerIcon,
  SmartPhone01Icon,
  Tablet01Icon,
} from "@hugeicons/core-free-icons";
import { DuckDuckGo } from "@notra/ui/components/ui/svgs/duckDuckGo";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { Instagram } from "@notra/ui/components/ui/svgs/instagram";
import { Kagi } from "@notra/ui/components/ui/svgs/kagi";
import { Linkedin } from "@notra/ui/components/ui/svgs/linkedin";
import { Reddit } from "@notra/ui/components/ui/svgs/reddit";
import { XTwitter } from "@notra/ui/components/ui/svgs/twitter";
import { Youtube } from "@notra/ui/components/ui/svgs/youtube";
import type { ComponentType, SVGProps } from "react";

export const WEB_TREND_PEOPLE_KEY = "people";
export const WEB_TREND_AGENTS_KEY = "agents";

export const WEB_REFERRER_LOGOS: Partial<
  Record<string, ComponentType<SVGProps<SVGSVGElement>>>
> = {
  google: Google,
  duckduckgo: DuckDuckGo,
  kagi: Kagi,
  github: Github,
  instagram: Instagram,
  linkedin: Linkedin,
  reddit: Reddit,
  x: XTwitter,
  youtube: Youtube,
};

export const WEB_DEVICE_ICONS: Record<string, typeof ComputerIcon> = {
  desktop: ComputerIcon,
  mobile: SmartPhone01Icon,
  tablet: Tablet01Icon,
};

export const WEB_LIST_LIMIT = 8;

export const WEB_TABLE_ROW_HEIGHT = 44;
export const WEB_TABLE_MIN_ROWS = 3;
export const WEB_TABLE_EMPTY_HEIGHT = 340;

export const WEB_SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
  yahoo: "Yahoo",
  ecosia: "Ecosia",
  brave: "Brave Search",
  kagi: "Kagi",
  yandex: "Yandex",
  baidu: "Baidu",
  startpage: "Startpage",
  qwant: "Qwant",
  x: "X",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  reddit: "Reddit",
  "hacker-news": "Hacker News",
  youtube: "YouTube",
  threads: "Threads",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  github: "GitHub",
  "product-hunt": "Product Hunt",
  medium: "Medium",
  substack: "Substack",
};
