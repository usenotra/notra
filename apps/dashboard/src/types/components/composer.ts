import type { ReactNode } from "react";

export interface ComposerFrameProps {
  children: ReactNode;
  nudge?: ReactNode;
  connectedTop?: boolean;
  className?: string;
}

export interface ComposerNudgeProps {
  title?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export interface ComposerChipProps {
  icon?: ReactNode;
  label: string;
  onRemove?: () => void;
  removeLabel?: string;
  onEdit?: () => void;
  editLabel?: string;
  onSteer?: () => void;
  steerLabel?: string;
  onClick?: () => void;
  pending?: boolean;
  className?: string;
  labelClassName?: string;
}

export interface ComposerToolbarProps {
  children: ReactNode;
  className?: string;
}

export interface ComposerToolbarButtonProps {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  "aria-label"?: string;
}

export interface ComposerSendProps {
  children: ReactNode;
  busy?: boolean;
  disabled?: boolean;
  tooltip: string;
  label: string;
  onClick?: () => void;
}
