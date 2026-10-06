import type { ComponentProps, ReactNode } from "react";

export interface ComposerFrameProps {
  children: ReactNode;
  nudge?: ReactNode;
  /** Drops the top radius so the frame can sit flush under another surface. */
  connectedTop?: boolean;
  /** Tighter radius, no shadow and no tray until there is a nudge. For inline composers like comments. */
  flat?: boolean;
  className?: string;
}

export interface ComposerNudgeProps {
  title?: ReactNode;
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

export type ComposerToolbarButtonProps = ComponentProps<"button">;

export interface ComposerSendProps {
  children: ReactNode;
  label: string;
  tooltip?: ReactNode;
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}
