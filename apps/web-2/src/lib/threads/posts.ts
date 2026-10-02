import type { ThreadPost } from "@/types/threads";

function createPostId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyPost(): ThreadPost {
  return { id: createPostId(), content: "" };
}

const SEED_CONTENT = [
  "Welcome to the X thread builder. Type into any post to edit it. Press ⌘/Ctrl + Enter or hit Add post to chain another one underneath.",
  "Got the order wrong? Hover a post and drag the handle on the right to move it. Click the X to delete a post you don't want.",
  "Make it yours: click the avatar to upload a photo, and click the name or @handle to customize the author. Replace these three posts and you're off.",
] as const;

export function createSeedThread(): ThreadPost[] {
  return SEED_CONTENT.map((content, index) => ({
    id: `seed-${index + 1}`,
    content,
  }));
}
