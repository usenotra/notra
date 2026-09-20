import { reconcileContentPublication } from "@notra/ai/utils/content-publication";

export async function reconcileContentPublicationStep(
  publication: Parameters<typeof reconcileContentPublication>[0],
  publishedAt: string
) {
  "use step";
  await reconcileContentPublication(publication, publishedAt);
}

reconcileContentPublicationStep.maxRetries = 11;
