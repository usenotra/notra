"use client";

import { useTranslations } from "next-intl";

import { ScanModelMenu } from "@/components/geo/scan-model-menu";
import {
  GeoScanControlsProvider,
  useGeoScanControls,
} from "@/components/providers/geo-scan-controls-provider";
import {
  useGeoModelCatalog,
  useGeoSettings,
  useIsGeoScanning,
} from "@/lib/hooks/use-geo";
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
  const t = useTranslations("geo.promptScanButton");
  const tGeoShared = useTranslations("geo.shared");
  const controls = useGeoScanControls();
  const { data } = useGeoSettings(organizationId);
  const { data: catalog } = useGeoModelCatalog(organizationId);
  const isScanning = useIsGeoScanning(organizationId);
  let disabledReason: string | undefined;
  if (isScanning) {
    disabledReason = t("scanInProgress");
  } else if (!row.enabled) {
    disabledReason = t("promptDisabled");
  } else if (!data) {
    disabledReason = t("settingsUnavailable");
  } else if (!data.settings?.enabled) {
    disabledReason = t("scanningDisabled");
  }
  return (
    <ScanModelMenu
      compact={compact}
      disabled={!row.enabled || !data?.settings?.enabled || isScanning}
      disabledReason={disabledReason}
      catalog={catalog?.models}
      enforceZdr={data?.settings?.enforceZdr}
      engines={data?.settings?.engines ?? []}
      nonZdrApprovedEngines={data?.settings?.nonZdrApprovedEngines}
      label={
        compact
          ? t("runScanPrompt", { prompt: row.prompt })
          : tGeoShared("runScan")
      }
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
