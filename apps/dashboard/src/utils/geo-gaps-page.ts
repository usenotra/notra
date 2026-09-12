import type {
  GeoGapsPageEmpty,
  GeoGapsPageError,
  GeoGapsPageModel,
  GeoGapsPageReady,
  GeoGapsPageStatusInput,
} from "@/types/components/geo-gaps";

export function resolveGeoGapsPageStatus(
  input: GeoGapsPageStatusInput
): GeoGapsPageModel["status"] {
  const hasSettings = Boolean(input.hasSettings);
  if (
    (input.settingsError && !input.hasSettingsData) ||
    (hasSettings && input.gapsError && !input.hasGapsData)
  ) {
    return "error";
  }
  if (!(input.settingsPending || hasSettings)) {
    return "empty";
  }
  if (input.settingsPending && !input.hasGapsData) {
    return "loading";
  }
  return "ready";
}

export function toGeoGapsPageModel(input: {
  status: GeoGapsPageModel["status"];
  error: Omit<GeoGapsPageError, "status">;
  empty: Omit<GeoGapsPageEmpty, "status">;
  ready: Omit<GeoGapsPageReady, "status">;
}): GeoGapsPageModel {
  if (input.status === "error") {
    return { status: "error", ...input.error };
  }
  if (input.status === "empty") {
    return { status: "empty", ...input.empty };
  }
  if (input.status === "loading") {
    return { status: "loading" };
  }
  return { status: "ready", ...input.ready };
}
