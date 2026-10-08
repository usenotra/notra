import type { IconName } from "./icons";

export type CalloutVariant =
  | "note"
  | "tip"
  | "info"
  | "warning"
  | "check"
  | "danger";

export interface CalloutTone {
  icon: IconName;
  tone: string;
  label: string;
}

export interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
}

export interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
}

export interface CardProps {
  title?: string;
  href?: string;
  img?: string;
  cta?: string;
}

export interface CardGroupProps {
  cols?: number;
}

export interface CheckProps {
  title?: string;
}

export interface ColumnsProps {
  cols?: number;
}

export interface DangerProps {
  title?: string;
}

export interface FrameProps {
  caption?: string;
}

export interface InfoProps {
  title?: string;
}

export interface NoteProps {
  title?: string;
}

export interface StepProps {
  title?: string;
}

export interface TabProps {
  title: string;
}

export interface TipProps {
  title?: string;
}

export interface UpdateProps {
  label: string;
  description?: string;
  tags?: string[];
}

export interface VideoProps {
  src: string;
  poster?: string;
  title?: string;
}

export interface WarningProps {
  title?: string;
}

export interface YouTubeProps {
  id: string;
  title?: string;
}
