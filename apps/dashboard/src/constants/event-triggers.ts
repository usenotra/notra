import { GitBranchIcon, Package01Icon } from "@hugeicons/core-free-icons";
import type { WebhookEventType } from "@notra/schemas/dashboard/integrations";

interface EventTypeMeta {
  label: string;
  description: string;
  icon: typeof GitBranchIcon;
  iconClass: string;
}

export const EVENT_TYPE_META: Record<WebhookEventType, EventTypeMeta> = {
  release: {
    label: "Release published",
    description: "Trigger when a new release is published on GitHub.",
    icon: Package01Icon,
    iconClass: "text-violet-500 dark:text-violet-300",
  },
  push: {
    label: "Push to default branch",
    description: "Trigger on each push to the repository's default branch.",
    icon: GitBranchIcon,
    iconClass: "text-emerald-500 dark:text-emerald-300",
  },
};

export const EVENT_TYPE_ORDER: WebhookEventType[] = ["release", "push"];
