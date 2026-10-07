import {
  DIAGRAM_EXPORT_TARGETS,
  IMAGE_EXPORT_TARGET_LABELS,
  IMAGE_EXPORT_TARGETS,
} from "@/constants/image-export";
import type {
  DiagramExportTarget,
  ImageExportTarget,
} from "@/types/content/image-export";

export function isImageExportTarget(value: string): value is ImageExportTarget {
  return IMAGE_EXPORT_TARGETS.some((target) => target === value);
}

export function getImageExportTargetLabel(target: ImageExportTarget): string {
  return IMAGE_EXPORT_TARGET_LABELS[target];
}

export function isDiagramExportTarget(
  target: ImageExportTarget
): target is DiagramExportTarget {
  return DIAGRAM_EXPORT_TARGETS.some((value) => value === target);
}

/** Excalidraw/tldraw only make sense when the post has an editable scene. */
export function getAvailableImageExportTargets(
  hasExcalidrawScene: boolean
): ImageExportTarget[] {
  return IMAGE_EXPORT_TARGETS.filter(
    (target) => hasExcalidrawScene || !isDiagramExportTarget(target)
  );
}
