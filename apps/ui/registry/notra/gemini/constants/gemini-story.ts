import type {
  GeminiSource,
  GeminiStoryMessage,
  GeminiThoughtStep,
} from "../types/gemini";

export const GEMINI_STORY_SOURCES: GeminiSource[] = [
  {
    description:
      "Cursor's cloud agents run on remote machines, so a task keeps going after you close the laptop, and you can pick it up from the editor again.",
    domain: "cursor.com",
    href: "https://cursor.com",
    id: "cursor-blog",
    name: "Cursor",
    title: "Cloud agents: work that keeps running without your laptop",
  },
  {
    description:
      "Write-ahead log segments are shipped to object storage, so state stays durable and versioned while the hot path stays off the editor's thread.",
    domain: "aws.amazon.com",
    href: "https://aws.amazon.com/s3",
    id: "s3-docs",
    name: "AWS",
    title: "Amazon S3 versioning and durable storage",
  },
];

export const GEMINI_STORY_THOUGHTS: GeminiThoughtStep[] = [
  {
    kind: "thought",
    text: "The user asks about two terms. I should check what each one means before answering.",
  },
  {
    kind: "search",
    queries: ["cursor origin cloud workspace", "wal-on-s3 snapshots artifacts"],
  },
  {
    kind: "thought",
    text: "Both results agree: Origin is the remote workspace and wal-on-s3 is where its state is stored.",
  },
];

export const GEMINI_STORY_THREAD: GeminiStoryMessage[] = [
  {
    from: "user",
    id: "u-1",
    text: "what are cursor origin and wal-on-s3?",
  },
  {
    from: "assistant",
    id: "a-1",
    search: true,
    sources: GEMINI_STORY_SOURCES,
    text: "**Cursor Origin** is Cursor's cloud workspace: the agent keeps working on your repo remotely, even with your laptop closed. {{cursor-blog}}\n\n**wal-on-s3** stores its snapshots and artifacts on S3, so files stay versioned and nothing blocks the editor. {{s3-docs}}",
    thoughts: GEMINI_STORY_THOUGHTS,
  },
];

export const GEMINI_STORY_REPLIES = [
  "Got it. Let me know when you want to keep going.",
  "Sure. I'm here.",
  "Noted. What's next?",
] as const;

export const GEMINI_STORY_USER_MESSAGES = GEMINI_STORY_THREAD.filter(
  (message) => message.from === "user"
);

export const GEMINI_STORY_ASSISTANT_MESSAGES = GEMINI_STORY_THREAD.filter(
  (message) => message.from === "assistant"
);
