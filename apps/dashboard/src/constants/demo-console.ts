import type { DemoConsolePreset } from "@/types/demo";

/** Replaced with a short random suffix each time a preset is loaded. */
export const DEMO_CONSOLE_UNIQUE_TOKEN = "{unique}";
export const DEMO_CONSOLE_UNIQUE_LENGTH = 6;

/**
 * Starting points for the in-app API console. `{projectId}` is filled with
 * the sandbox's GEO project and `{unique}` with a fresh suffix, so presets
 * that create named records can run more than once. `section` picks the
 * preset that matches the page the visitor is on.
 */
export const DEMO_CONSOLE_PRESETS: readonly DemoConsolePreset[] = [
  {
    id: "listPosts",
    section: "content",
    method: "GET",
    path: "/v1/posts?limit=5",
  },
  {
    id: "createPost",
    section: "content",
    method: "POST",
    path: "/v1/posts",
    body: {
      title: "Hello from the Notra API",
      contentType: "blog_post",
      status: "draft",
      markdown:
        "Created with **one API call** from the demo console. Open Content to see it.",
    },
  },
  {
    id: "createPrompt",
    section: "geo",
    method: "POST",
    path: "/v1/projects/{projectId}/geo/prompts",
    body: {
      prompt: "Which meeting notes app has the best Slack integration?",
      tags: ["integrations"],
    },
  },
  {
    id: "startScan",
    section: "geo",
    method: "POST",
    path: "/v1/projects/{projectId}/geo/scans",
    body: {},
  },
  {
    id: "visibility",
    section: "geo",
    method: "GET",
    path: "/v1/projects/{projectId}/geo/visibility/overview?days=30",
  },
  {
    id: "traffic",
    section: "traffic",
    method: "GET",
    path: "/v1/projects/{projectId}/geo/traffic/overview?days=30",
  },
  {
    id: "listSchedules",
    section: "automation",
    method: "GET",
    path: "/v1/schedules",
  },
  {
    id: "createSkill",
    section: "skills",
    method: "POST",
    path: "/v1/skills",
    body: {
      // The seeded workspace already has "fieldnote-voice".
      name: "launch-checklist-{unique}",
      description:
        "Check every launch post covers who, what and how to try it.",
      content:
        "# Launch checklist\n\nSay who the feature is for, what changed and how to try it today.",
    },
  },
];

export const DEMO_CONSOLE_METHODS = ["GET", "POST", "PATCH", "DELETE"] as const;

/** Maps a dashboard route segment to the preset section shown first. */
export const DEMO_CONSOLE_SECTION_BY_SEGMENT: Readonly<Record<string, string>> =
  {
    geo: "geo",
    traffic: "traffic",
    content: "content",
    automation: "automation",
    skills: "skills",
  };
