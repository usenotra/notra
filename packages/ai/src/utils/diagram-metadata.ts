import { diagramSpecSchema } from "@notra/ai/schemas/excalidraw-diagram";
import type { DiagramSpec } from "@notra/ai/types/excalidraw-diagram";
import type { RepoImageFormat } from "@notra/ai/types/repo-image";
import {
  isRecord,
  readNumber,
  readString,
} from "@notra/ai/utils/unknown-record";

// What an image post's sourceMetadata says about its diagram.

/** The editable spec saved on a diagram post, or null for other images. */
export function readDiagramSpec(metadata: unknown): DiagramSpec | null {
  if (!isRecord(metadata)) {
    return null;
  }
  const parsed = diagramSpecSchema.safeParse(metadata.diagramSpec);
  return parsed.success ? parsed.data : null;
}

export function readExcalidrawUrl(metadata: unknown) {
  return isRecord(metadata) ? readString(metadata, "excalidrawUrl") : undefined;
}

export function readImageFormat(metadata: unknown): RepoImageFormat {
  const isDiagram =
    isRecord(metadata) &&
    (metadata.format === "diagram" || Boolean(metadata.diagramSpec));
  return isDiagram ? "diagram" : "marketing";
}

/** Version of the stored diagram; every save increments it. */
export function readDiagramRevision(metadata: unknown) {
  return (isRecord(metadata) && readNumber(metadata, "diagramRevision")) || 0;
}

/** True when the post is a diagram Notra can edit without a sandbox. */
export function canEditDiagramWithoutSandbox(metadata: unknown) {
  return readDiagramSpec(metadata) !== null;
}
