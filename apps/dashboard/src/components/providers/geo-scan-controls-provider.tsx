"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ScanPreflightDialog } from "@/components/geo/scan-preflight-dialog";
import {
  useGeoRescanPrompt,
  useGeoSettings,
  useGeoStartScan,
  useIsGeoScanning,
} from "@/lib/hooks/use-geo";
import type {
  GeoScanControls,
  GeoScanControlsProviderProps,
  GeoScanRequest,
} from "@/types/geo-scan-activity";

const GeoScanControlsContext = createContext<GeoScanControls | null>(null);

export function useGeoScanControls() {
  return useContext(GeoScanControlsContext);
}

export function GeoScanControlsProvider({
  organizationId,
  promptCount,
  children,
}: GeoScanControlsProviderProps) {
  const [request, setRequest] = useState<GeoScanRequest | null>(null);
  const submitting = useRef(false);
  const { data } = useGeoSettings(organizationId);
  const all = useGeoStartScan(organizationId);
  const single = useGeoRescanPrompt(organizationId);
  const isScanning = useIsGeoScanning(organizationId);
  const settings = data?.settings;
  const controls = useMemo(() => ({ prepare: setRequest }), []);

  async function confirm() {
    if (!request || isScanning || submitting.current) {
      return;
    }
    submitting.current = true;
    try {
      if (request.prompt) {
        await single.mutateAsync({
          promptId: request.prompt.id,
          engines: request.engines,
        });
      } else {
        await all.mutateAsync({ engines: request.engines });
      }
      setRequest(null);
      toast.success("Scan started. Follow its progress on the Prompts page.");
    } catch {
      // The mutation reports the error; keep the selection available for retry.
    }
    submitting.current = false;
  }

  return (
    <GeoScanControlsContext value={controls}>
      {children}
      {request && settings ? (
        <ScanPreflightDialog
          confirmationOnly
          engines={request.engines}
          isPending={isScanning}
          languages={settings.languages}
          lastScanAt={settings.lastScanAt}
          onConfirm={() => {
            void confirm();
          }}
          onOpenChange={(open) => {
            if (!open && !all.isPending && !single.isPending) {
              setRequest(null);
            }
          }}
          open
          organizationId={organizationId}
          prompt={request.prompt?.prompt}
          promptCount={request.prompt ? 1 : promptCount}
        />
      ) : null}
    </GeoScanControlsContext>
  );
}
