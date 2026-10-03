import type { ReactNode } from "react";

export interface PageHeadingProps {
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  className?: string;
}
