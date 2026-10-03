import type { DemoUiAction } from "@/types/demo";

const PROJECT = "/v1/projects/{projectId}";

/**
 * Dashboard actions that show up in the demo request feed, keyed by oRPC
 * procedure path. `path` is the public API call that does the same thing;
 * actions without one are listed by their RPC path.
 */
export const DEMO_UI_ACTIONS: Readonly<Record<string, DemoUiAction>> = {
  "geo.promptsCreate": { method: "POST", path: `${PROJECT}/geo/prompts` },
  "geo.promptsUpdate": {
    method: "PATCH",
    path: `${PROJECT}/geo/prompts/{promptId}`,
  },
  "geo.promptsDelete": {
    method: "DELETE",
    path: `${PROJECT}/geo/prompts/{promptId}`,
  },
  "geo.promptsImport": {
    method: "POST",
    path: `${PROJECT}/geo/prompts/import`,
  },
  "geo.sequencesCreate": { method: "POST", path: `${PROJECT}/geo/sequences` },
  "geo.sequenceRun": {
    method: "POST",
    path: `${PROJECT}/geo/sequences/{sequenceId}/run`,
  },
  "geo.startScan": { method: "POST", path: `${PROJECT}/geo/scans` },
  "geo.competitorsImport": {
    method: "POST",
    path: `${PROJECT}/geo/competitors/import`,
  },
  "geo.competitorDelete": {
    method: "DELETE",
    path: `${PROJECT}/geo/competitors/{name}`,
  },
  "geo.projectsCreate": { method: "POST", path: "/v1/projects" },
  "content.create": { method: "POST", path: "/v1/posts" },
  "content.update": { method: "PATCH", path: "/v1/posts/{postId}" },
  "content.delete": { method: "DELETE", path: "/v1/posts/{postId}" },
  "content.generate": { method: "POST", path: "/v1/posts/generate" },
  "skills.create": { method: "POST", path: "/v1/skills" },
  "skills.update": { method: "PATCH", path: "/v1/skills/{name}" },
  "skills.delete": { method: "DELETE", path: "/v1/skills/{name}" },
  "automation.schedules.create": { method: "POST", path: "/v1/schedules" },
  "automation.schedules.update": {
    method: "PATCH",
    path: "/v1/schedules/{scheduleId}",
  },
  "automation.schedules.delete": {
    method: "DELETE",
    path: "/v1/schedules/{scheduleId}",
  },
  "automation.events.create": { method: "POST", path: "/v1/event-triggers" },
  "automation.schedules.runNow": { method: "POST", path: null },
  "geo.personaRun": { method: "POST", path: null },
  "geo.writerStart": { method: "POST", path: null },
  "content.publishChangelogToGitHub": { method: "POST", path: null },
};
