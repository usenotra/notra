import type { SiteDiagnostic } from "@notra/sites-core/types/build";

import type { BuildParams } from "../../src/types/build-params";
import type { OgImagesResult, WriteOgImagesParams } from "./og-images";
import type { PreparedSite } from "./source";

export interface DevRefreshOptions {
  params: Omit<BuildParams, "config" | "publicFiles" | "headScripts">;
  prepare: () => Promise<PreparedSite>;
  writeOgImages: (params: WriteOgImagesParams) => Promise<OgImagesResult>;
  publish: (params: BuildParams, isCurrent: () => boolean) => Promise<boolean>;
  runAstro: (command: "dev" | "stop") => Promise<number>;
  printDiagnostics: (diagnostics: SiteDiagnostic[]) => void;
  reportError: (error: unknown) => void;
}
