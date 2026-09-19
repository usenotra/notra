"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import dynamic from "next/dynamic";

import type { ContentEditorProps } from "./types";

interface ContentEditorSwitchProps extends ContentEditorProps {
  contentType: string;
}

const editorFallback = <Skeleton className="h-64 w-full" />;

const ImageEditor = dynamic(
  () => import("./image-editor").then((mod) => mod.ImageEditor),
  { loading: () => editorFallback, ssr: false }
);
const LinkedInEditor = dynamic(
  () => import("./linkedin-editor").then((mod) => mod.LinkedInEditor),
  { loading: () => editorFallback, ssr: false }
);
const TwitterEditor = dynamic(
  () => import("./twitter-editor").then((mod) => mod.TwitterEditor),
  { loading: () => editorFallback, ssr: false }
);
const BlogEditor = dynamic(
  () => import("./blog-editor").then((mod) => mod.BlogEditor),
  { loading: () => editorFallback, ssr: false }
);
const ChangelogEditor = dynamic(
  () => import("./changelog-editor").then((mod) => mod.ChangelogEditor),
  { loading: () => editorFallback, ssr: false }
);

export function ContentEditorSwitch({
  contentType,
  ...props
}: ContentEditorSwitchProps) {
  switch (contentType) {
    case "image":
      return <ImageEditor {...props} />;

    case "linkedin_post":
      return <LinkedInEditor {...props} />;

    case "twitter_post":
      return <TwitterEditor {...props} />;

    case "blog_post":
      return <BlogEditor {...props} />;

    default:
      return <ChangelogEditor {...props} />;
  }
}
