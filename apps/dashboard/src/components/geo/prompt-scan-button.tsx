"use client";

import { ScanModelMenu } from "@/components/geo/scan-model-menu";
import {
  GeoScanControlsProvider,
  useGeoScanControls,
} from "@/components/providers/geo-scan-controls-provider";
import { useGeoSettings, useIsGeoScanning } from "@/lib/hooks/use-geo";
import type { PromptScanButtonProps } from "@/types/geo";

export function PromptScanButton(props: PromptScanButtonProps) {
  const controls = useGeoScanControls();
  if (!controls) {
    return (
      <GeoScanControlsProvider organizationId={props.organizationId}>
        <PromptScanMenu {...props} />
      </GeoScanControlsProvider>
    );
  }
  return <PromptScanMenu {...props} />;
}

function PromptScanMenu({
  organizationId,
  row,
  compact = false,
  onPrepare,
}: PromptScanButtonProps) {
  const controls = useGeoScanControls();
  const { data } = useGeoSettings(organizationId);
  const isScanning = useIsGeoScanning(organizationId);
  let disabledReason: string | undefined;
  if (isScanning) {
    disabledReason =
      "Wait for the current scan to finish before starting another.";
  } else if (!row.enabled) {
    disabledReason = "Enable this prompt to run a scan.";
  } else if (!data) {
    disabledReason = "Scan settings are not available yet.";
  } else if (!data.settings?.enabled) {
    disabledReason = "Enable GEO scanning in settings to run a scan.";
  }
  return (
    <ScanModelMenu
      compact={compact}
      disabled={!row.enabled || !data?.settings?.enabled || isScanning}
      disabledReason={disabledReason}
      engines={data?.settings?.engines ?? []}
      label={compact ? `Run scan: ${row.prompt}` : "Run scan"}
      onContinue={(engines) => {
        onPrepare?.();
        controls?.prepare({
          engines,
          prompt: { id: row.id, prompt: row.prompt },
        });
      }}
    />
  );
}
