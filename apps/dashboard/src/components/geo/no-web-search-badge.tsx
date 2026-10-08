"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { useTranslations } from "use-intl";

export function NoWebSearchBadge() {
  const t = useTranslations("geo.shared");
  return (
    <Badge className="shrink-0" size="sm" variant="outline">
      {t("noWebSearch")}
    </Badge>
  );
}
