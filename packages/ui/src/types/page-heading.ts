import type { ReactNode } from "react";

export interface PageHeadingProps {
  title: ReactNode;
  description?: ReactNode;
  /** Leading visual next to the title block, e.g. an integration logo. */
  icon?: ReactNode;
  /** Actions shown to the right of the title once the container is wide enough. */
  children?: ReactNode;
  className?: string;
}
