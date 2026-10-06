"use client";

import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import { Badge } from "@notra/ui/components/ui/badge";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { ApiKeyRevealField } from "@/components/api-keys/api-key-reveal-field";
import { Button } from "@/components/button";
import {
  useGeoIngestSetup,
  useGeoIngestTokenRotate,
} from "@/lib/hooks/use-geo";
import type { TrackingTokenCardProps } from "@/types/api-keys";

export function TrackingTokenCard({ organizationId }: TrackingTokenCardProps) {
  const t = useTranslations("apiKeys.trackingToken");
  const { data, isPending } = useGeoIngestSetup(organizationId);
  const rotate = useGeoIngestTokenRotate(organizationId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const token = data?.token ?? "";

  if (!(isPending || token)) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            {t("title")}
            <Badge variant="secondary">{t("writeOnly")}</Badge>
          </h2>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </div>
        <Button
          disabled={isPending}
          loading={rotate.isPending}
          onClick={() => setConfirmOpen(true)}
          size="sm"
          variant="outline"
        >
          {t("rotate")}
        </Button>
      </div>
      {isPending ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <ApiKeyRevealField value={token} />
      )}

      <ConfirmDialog
        confirmLabel={t("confirm")}
        description={t("confirmDescription")}
        onConfirm={() => {
          setConfirmOpen(false);
          rotate.mutate();
        }}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title={t("confirmTitle")}
      />
    </section>
  );
}
