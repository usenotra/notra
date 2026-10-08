import type { ReactNode } from "react";

export interface SetupControlProps {
  children?: ReactNode;
  onClick?: () => void;
  type?: string;
  tabIndex?: number;
  "aria-pressed"?: boolean;
}
