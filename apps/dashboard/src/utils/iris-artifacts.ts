import type { IrisOutboxArtifact } from "@notra/ai/schemas/autonomy/outbox";
import {
  irisArtifactContainerSchema,
  irisArtifactListSchema,
} from "@notra/schemas/dashboard/iris";

export const extractIrisArtifacts = (value: unknown): IrisOutboxArtifact[] => {
  const container = irisArtifactContainerSchema.safeParse(value);
  if (container.success) {
    return container.data.artifacts ?? [];
  }

  const list = irisArtifactListSchema.safeParse(value);
  return list.success ? list.data : [];
};
