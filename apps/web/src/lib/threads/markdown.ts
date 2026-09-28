import { createSeedThread } from "@/lib/threads/posts";
import {
  AUTHOR_HANDLE_LIMIT,
  AUTHOR_NAME_LIMIT,
  THREAD_POST_LIMIT,
} from "@/types/threads";
import { markdownSection } from "@/utils/markdown";
import { SITE_URL } from "@/utils/urls";

export function buildThreadCreatorMarkdown() {
  const seedPosts = createSeedThread().map(
    (post, index) => `${index + 1}. ${post.content}`
  );

  return [
    "# X (Twitter) Threads Creator",
    "",
    "Write, reorder, and preview your thread in one place. Free, no sign-up.",
    "",
    "Draft, reorder, and ship X (Twitter) threads in a clean, distraction-free workspace.",
    "",
    markdownSection("How to use it", [
      `Open ${SITE_URL}/twitter-thread-creator in a browser. The builder starts with three example posts that explain it:`,
      "",
      ...seedPosts,
      "",
      "- Type into any post to edit it.",
      "- Press Cmd + Enter (Mac) or Ctrl + Enter while an input is focused, or click Add post, to add a post underneath.",
      "- Drag a post's handle to reorder it. Click the X to delete it.",
      "- Click the avatar to upload a photo, and click the name or @handle to set the author shown in the preview.",
    ]),
    markdownSection("Limits", [
      `- ${THREAD_POST_LIMIT} characters per post, with a live counter.`,
      `- Display name up to ${AUTHOR_NAME_LIMIT} characters, handle up to ${AUTHOR_HANDLE_LIMIT}.`,
      "- Everything stays in your browser. Nothing is posted to X for you.",
    ]),
    markdownSection("Related", [
      `- [Features](${SITE_URL}/features.md)`,
      `- [Blog](${SITE_URL}/blog.md)`,
    ]),
  ].join("\n");
}
