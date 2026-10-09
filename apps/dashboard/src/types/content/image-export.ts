import type {
  DIAGRAM_EXPORT_TARGETS,
  IMAGE_EXPORT_TARGETS,
} from "@/constants/image-export";

export type ImageExportTarget = (typeof IMAGE_EXPORT_TARGETS)[number];

export type DiagramExportTarget = (typeof DIAGRAM_EXPORT_TARGETS)[number];

export interface ImageExportTargetIconProps {
  target: ImageExportTarget;
  className?: string;
}
