import type { ReactNode } from "react";

export interface SetupControlProps {
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  href?: string;
  type?: string;
  tabIndex?: number;
  "aria-pressed"?: boolean;
}
