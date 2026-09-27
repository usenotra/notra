import type { ComponentProps, ReactNode } from "react";

import type { Avatar } from "@/components/ui/avatar";
import type { Collapsible } from "@/components/ui/collapsible";

export interface AIOverviewSource {
  description?: string;
  favicon: string;
  href: string;
  meta?: string;
  siteName: string;
  thumbnail?: string;
  title?: string;
}

export interface AIOverviewProps extends ComponentProps<typeof Collapsible> {
  collapsible?: boolean;
  showMoreLabel?: ReactNode;
}

export interface AIOverviewHeaderProps extends Omit<
  ComponentProps<"div">,
  "title"
> {
  icon?: ReactNode;
  title?: ReactNode;
}

export interface AIOverviewHighlightProps extends ComponentProps<"mark"> {
  active?: boolean;
}

export interface AIOverviewCitationProps extends Omit<
  ComponentProps<"a">,
  "href" | "children"
> {
  preview?: boolean;
  renderSourceAction?: (source: AIOverviewSource) => ReactNode;
  sources: [AIOverviewSource, ...AIOverviewSource[]];
}

export interface AIOverviewFaviconProps extends ComponentProps<typeof Avatar> {
  name: string;
  src: string;
}

export interface AIOverviewSkeletonLine {
  id: string;
  width: string;
}

export interface AIOverviewSkeletonProps extends ComponentProps<"div"> {
  lines?: AIOverviewSkeletonLine[];
}
