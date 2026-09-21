import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  Link01Icon,
  SparklesIcon,
  Unlink01Icon,
  UserSwitchIcon,
} from "@hugeicons/core-free-icons";
import type { GeoChangeKind } from "@notra/geo-core/types/geo";

export const GEO_CHANGE_KIND_ICONS: Record<
  GeoChangeKind,
  typeof ArrowUp01Icon
> = {
  gained_mention: CheckmarkCircle01Icon,
  lost_mention: CancelCircleIcon,
  position_improved: ArrowUp01Icon,
  position_dropped: ArrowDown01Icon,
  competitor_displaced: UserSwitchIcon,
  citation_added: Link01Icon,
  citation_removed: Unlink01Icon,
  competitor_cited: Link01Icon,
  new_engine: SparklesIcon,
};

export const GEO_CHANGE_KIND_TONE_CLASSES: Record<GeoChangeKind, string> = {
  gained_mention: "text-emerald-500 dark:text-emerald-300",
  lost_mention: "text-red-500 dark:text-red-300",
  position_improved: "text-emerald-500 dark:text-emerald-300",
  position_dropped: "text-red-500 dark:text-red-300",
  competitor_displaced: "text-red-500 dark:text-red-300",
  citation_added: "text-emerald-500 dark:text-emerald-300",
  citation_removed: "text-red-500 dark:text-red-300",
  competitor_cited: "text-muted-foreground",
  new_engine: "text-muted-foreground",
};

export const GEO_CHANGE_ICON_SIZE = 16;
