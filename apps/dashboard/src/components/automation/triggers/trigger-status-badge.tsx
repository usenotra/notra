import { Badge } from "@notra/ui/components/ui/badge";
import { useTranslations } from "use-intl";

export function TriggerStatusBadge({ enabled }: { enabled: boolean }) {
  const tCommon = useTranslations("common");
  return (
    <Badge variant={enabled ? "default" : "secondary"}>
      {enabled ? tCommon("states.active") : tCommon("labels.paused")}
    </Badge>
  );
}
