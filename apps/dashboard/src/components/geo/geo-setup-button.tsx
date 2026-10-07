"use client";

import { useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { GeoProjectCreateDialog } from "@/components/geo/project-create-dialog";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import type { GeoSetupButtonProps } from "@/types/geo";

export function GeoSetupButton({
  organizationId,
  children,
  className,
  size,
}: GeoSetupButtonProps) {
  const tGeoShared = useTranslations("geo.shared");
  const [open, setOpen] = useState(false);
  const [, setProjectParam] = useGeoProjectQueryState();

  return (
    <>
      <Button
        className={className}
        onClick={() => setOpen(true)}
        size={size}
        type="button"
      >
        {children ?? tGeoShared("setUpGeoTracking")}
      </Button>
      <GeoProjectCreateDialog
        onCreated={(projectId) => setProjectParam(projectId)}
        onOpenChange={setOpen}
        open={open}
        organizationId={organizationId}
      />
    </>
  );
}
