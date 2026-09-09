import {
  AiScanIcon,
  Calendar03Icon,
  Globe02Icon,
  Link04Icon,
  Notification03Icon,
  PaintBoardIcon,
  PlayCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { Slack } from "@notra/ui/components/ui/svgs/slack";

import type { IntegrationType } from "@/types/webhooks/webhooks";

export function IntegrationIcon({ type }: { type: IntegrationType }) {
  switch (type) {
    case "github":
      return <Github className="size-4" />;
    case "linear":
      return <Linear className="size-4" />;
    case "slack":
      return <Slack className="size-4" />;
    case "webhook":
      return (
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={Link04Icon}
        />
      );
    case "manual":
      return (
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={PlayCircleIcon}
        />
      );
    case "schedule":
      return (
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={Calendar03Icon}
        />
      );
    case "events":
      return (
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={Notification03Icon}
        />
      );
    case "geo":
      return (
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={Globe02Icon}
        />
      );
    case "agent-readiness":
      return (
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={AiScanIcon}
        />
      );
    case "search-console":
      return <Google className="size-4" />;
    case "brand":
      return (
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={PaintBoardIcon}
        />
      );
    default: {
      return type;
    }
  }
}
