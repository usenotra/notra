import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import type { DitheringCanvasProps } from "@/types/dithering";

const DitheringShader = lazy(() =>
  import("./dithering-shader").then((module_) => ({
    default: module_.DitheringShader,
  }))
);

export function DitheringCanvas(props: DitheringCanvasProps) {
  return (
    <ClientOnly>
      <Suspense>
        <DitheringShader {...props} />
      </Suspense>
    </ClientOnly>
  );
}
