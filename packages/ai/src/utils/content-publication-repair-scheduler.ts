import { publicationSyncRepairSchema } from "@notra/ai/schemas/content-publication";
import type { PublicationRepairScheduler } from "@notra/ai/types/content-publication";

export const scheduleContentPublicationSyncRepair: PublicationRepairScheduler =
  async (repair) => {
    const payload = publicationSyncRepairSchema.parse(repair);
    const baseUrl = process.env.WORKFLOW_BASE_URL?.replace(/\/$/, "");
    const secret = process.env.INTERNAL_WORKFLOW_SECRET?.trim();
    if (!(baseUrl && secret)) {
      throw new Error("Publication repair workflow is not configured");
    }
    const response = await fetch(
      `${baseUrl}/api/internal/workflows/content-publication-sync-repair`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) {
      throw new Error(
        `Publication repair scheduling failed (${response.status})`
      );
    }
  };
