import type { ReactNode } from "react";

export interface FeaturesCardCopy {
  title: string;
  description: string;
}

export interface FeaturesCardShellProps {
  copy: FeaturesCardCopy;
  footnote?: string;
  className?: string;
  children: ReactNode;
}

export interface MockFrameProps {
  heading: string;
  subhead?: string;
  className?: string;
  children: ReactNode;
}
