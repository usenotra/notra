import type {
  ContentImageContext,
  ContentImageContextSource,
} from "@notra/ai/types/orchestration";
import {
  readDiagramSpec,
  readImageFormat,
} from "@notra/ai/utils/diagram-metadata";
import { isRecord, readString } from "@notra/ai/utils/unknown-record";

// Build from the authorized stored post, never from client-supplied metadata.
// Keep repository credentials and sandbox identifiers out of the model context.
export function getContentImageContext(
  post: ContentImageContextSource
): ContentImageContext {
  const metadata = isRecord(post.sourceMetadata) ? post.sourceMetadata : {};
  const sandbox = isRecord(metadata.sandbox) ? metadata.sandbox : {};
  const diagramSpec = readDiagramSpec(metadata);
  const hasSandbox = Boolean(
    readString(metadata, "integrationId")?.trim() &&
    readString(metadata, "branch")?.trim() &&
    readString(sandbox, "snapshotId")?.trim()
  );

  return {
    title: post.title,
    format: readImageFormat(metadata),
    diagramSpec,
    canRevise: diagramSpec !== null || hasSandbox,
  };
}
