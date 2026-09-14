"use client";

import dynamic from "next/dynamic";

/** Keeps shiki and the merge resolver out of the skill page's initial load. */
export const LazySkillUpdateDialog = dynamic(
  () =>
    import("./skill-update-dialog").then((module) => module.SkillUpdateDialog),
  { ssr: false }
);
