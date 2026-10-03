import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description: ReactNode;
  children?: ReactNode;
}
