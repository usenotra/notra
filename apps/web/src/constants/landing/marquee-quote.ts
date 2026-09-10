import { Hexclave } from "@notra/ui/components/ui/svgs/hexclave";

import { DatabuddyLogo } from "@/components/landing/marquee-logos/databuddy-logo";
import { InthLogo } from "@/components/landing/marquee-logos/inth-logo";
import { TopGgLogo } from "@/components/landing/marquee-logos/top-gg-logo";
import type { MarqueeLogo } from "@/types/landing/marquee-quote";

export const MARQUEE_CAPTION = "Used by teams that ship every week";

export const MARQUEE_EDGE_MASK =
  "linear-gradient(to right, transparent, black 8%, black 92%, transparent)";

export const MARQUEE_LOGOS: MarqueeLogo[] = [
  { name: "inth", label: "Inth", Logo: InthLogo },
  { name: "databuddy", label: "Databuddy", Logo: DatabuddyLogo },
  { name: "hexclave", label: "Hexclave", Logo: Hexclave },
  { name: "top-gg", label: "Top.gg", Logo: TopGgLogo },
];
