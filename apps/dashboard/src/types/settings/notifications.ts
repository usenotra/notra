import type { IconSvgElement } from "@hugeicons/react";

export interface NotificationSettings {
  scheduledContentCreation: boolean;
  scheduledContentFailed: boolean;
  scheduledContentSkipped: boolean;
  marketingEmails: boolean;
  dailySummary: boolean;
}

export type NotificationToggleKey = keyof NotificationSettings;

export interface NotificationToggleConfig {
  key: NotificationToggleKey;
  label: string;
  description: string;
  defaultValue: boolean;
  icon: IconSvgElement;
}

export type NotificationToggleDefinition = Omit<
  NotificationToggleConfig,
  "label" | "description"
>;

export interface NotificationToggleGroup {
  id: "content" | "geo" | "marketing";
  toggles: NotificationToggleDefinition[];
}

export interface NotificationToggleRowProps {
  config: NotificationToggleConfig;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}
