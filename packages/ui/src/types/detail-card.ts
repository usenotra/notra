import type { PointerEventHandler, ReactNode } from "react";

export interface DetailCardContentProps {
  icon?: ReactNode;
  title: string;
  aside?: ReactNode;
  align?: "start" | "center" | "end";
  children: ReactNode;
  onPointerEnter?: PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: PointerEventHandler<HTMLDivElement>;
}

export interface DetailCardRowProps {
  label: ReactNode;
  children: ReactNode;
}
