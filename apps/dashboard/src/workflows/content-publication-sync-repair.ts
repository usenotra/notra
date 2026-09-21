import type { PublicationSyncRepair } from "@notra/ai/types/content-publication";

import { contentPublicationSyncRepairStep } from "./steps/content-publication-sync-repair-step";

export async function contentPublicationSyncRepairWorkflow(
  repair: PublicationSyncRepair
) {
  "use workflow";
  return await contentPublicationSyncRepairStep(repair);
}
