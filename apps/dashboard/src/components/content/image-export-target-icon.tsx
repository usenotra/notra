import { Excalidraw } from "@notra/ui/components/ui/svgs/excalidraw";
import { Figma } from "@notra/ui/components/ui/svgs/figma";
import { Paper } from "@notra/ui/components/ui/svgs/paper";
import { Tldraw } from "@notra/ui/components/ui/svgs/tldraw";
import { Wonder } from "@notra/ui/components/ui/svgs/wonder";

import type { ImageExportTargetIconProps } from "@/types/content/image-export";

export function ImageExportTargetIcon({
  target,
  className,
}: ImageExportTargetIconProps) {
  switch (target) {
    case "figma":
      return <Figma className={className} />;
    case "excalidraw":
      return <Excalidraw className={className} />;
    case "tldraw":
      return <Tldraw className={className} />;
    case "wonder":
      return <Wonder className={className} />;
    case "paper":
      return <Paper className={className} />;
    default:
      return <Paper className={className} />;
  }
}
