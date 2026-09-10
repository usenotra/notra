"use client";

import dynamic from "next/dynamic";

export const DitheringCanvas = dynamic(
  () => import("./dithering-shader").then((module_) => module_.DitheringShader),
  { ssr: false }
);
