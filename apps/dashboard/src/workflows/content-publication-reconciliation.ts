import { reconcileContentPublicationStep } from "./steps/content-publication-reconciliation-step";

export async function contentPublicationReconciliationWorkflow(
  publication: Parameters<typeof reconcileContentPublicationStep>[0],
  publishedAt: string
) {
  "use workflow";
  await reconcileContentPublicationStep(publication, publishedAt);
}
