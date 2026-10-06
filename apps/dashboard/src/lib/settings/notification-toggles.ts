import {
  Alert02Icon,
  Calendar03Icon,
  Forward02Icon,
  News01Icon,
} from "@hugeicons/core-free-icons";

import type { NotificationToggleGroup } from "@/types/settings/notifications";

export const NOTIFICATION_TOGGLE_GROUPS: NotificationToggleGroup[] = [
  {
    id: "content",
    toggles: [
      {
        key: "scheduledContentCreation",
        defaultValue: false,
        icon: Calendar03Icon,
      },
      {
        key: "scheduledContentFailed",
        defaultValue: false,
        icon: Alert02Icon,
      },
      {
        key: "scheduledContentSkipped",
        defaultValue: false,
        icon: Forward02Icon,
      },
    ],
  },
  {
    id: "geo",
    toggles: [
      {
        key: "dailySummary",
        defaultValue: true,
        icon: News01Icon,
      },
    ],
  },
];
