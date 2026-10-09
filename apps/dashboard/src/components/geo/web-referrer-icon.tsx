import {
  Globe02Icon,
  Link04Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EngineIcon } from "@/components/geo/engine-icon";
import { WEB_REFERRER_LOGOS } from "@/constants/web-analytics";
import type { WebReferrerIconProps } from "@/types/geo";

export function WebReferrerIcon({ source }: WebReferrerIconProps) {
  if (source.group === "ai") {
    return <EngineIcon className="size-3.5 shrink-0" engine={source.source} />;
  }
  const Logo =
    source.group !== "direct" &&
    Object.hasOwn(WEB_REFERRER_LOGOS, source.source)
      ? WEB_REFERRER_LOGOS[source.source]
      : undefined;
  if (Logo) {
    return <Logo aria-hidden="true" className="size-3.5 shrink-0" />;
  }
  let icon = Globe02Icon;
  if (source.group === "direct") {
    icon = Link04Icon;
  } else if (source.group === "search") {
    icon = Search01Icon;
  }
  return (
    <HugeiconsIcon
      aria-hidden="true"
      className="text-muted-foreground size-3.5 shrink-0"
      icon={icon}
    />
  );
}
