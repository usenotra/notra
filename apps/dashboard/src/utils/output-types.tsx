import {
  Blockchain04Icon,
  ChartHistogramIcon,
  Image01Icon,
  News01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Linkedin } from "@notra/ui/components/ui/svgs/linkedin";
import { XTwitter } from "@notra/ui/components/ui/svgs/twitter";
import type { JSX } from "react";

import { FORMAT_CARD_META } from "@/constants/content-formats";

const OUTPUT_TYPE_PROMPT_LABELS: Record<string, string> = {
  changelog: "Changelog",
  blog_post: "Blog Post",
  twitter_post: "Twitter Post",
  linkedin_post: "LinkedIn Post",
  investor_update: "Investor Update",
  image: "Image",
};

export function getOutputTypePromptLabel(outputType: string): string {
  return (
    OUTPUT_TYPE_PROMPT_LABELS[outputType] ?? outputType.replaceAll("_", " ")
  );
}

const ICON_CLASS_BY_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(FORMAT_CARD_META).map(([type, meta]) => [type, meta.iconClass])
);

export function getOutputTypeIconClass(outputType: string): string {
  return ICON_CLASS_BY_TYPE[outputType] ?? "text-muted-foreground";
}

export function OutputTypeIcon({
  outputType,
  className = "size-4",
}: {
  outputType: string;
  className?: string;
}): JSX.Element | null {
  switch (outputType) {
    case "twitter_post":
      return <XTwitter className={className} />;
    case "linkedin_post":
      return <Linkedin className={className} />;
    case "changelog":
      return <HugeiconsIcon className={className} icon={Blockchain04Icon} />;
    case "blog_post":
      return <HugeiconsIcon className={className} icon={News01Icon} />;
    case "investor_update":
      return <HugeiconsIcon className={className} icon={ChartHistogramIcon} />;
    case "image":
      return <HugeiconsIcon className={className} icon={Image01Icon} />;
    default:
      return null;
  }
}
