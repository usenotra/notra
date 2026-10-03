import type { DemoMissionId } from "@/types/demo";

/** Order shown in the playground's mission checklist. */
export const DEMO_MISSION_IDS: readonly DemoMissionId[] = [
  "scan",
  "apiPrompt",
  "agentPost",
  "schedule",
  "externalClient",
];

export const DEMO_API_PROMPT_PATH = /\/geo\/prompts$/;
export const DEMO_POSTS_READ_PATH = /^\/v1\/posts(?:\/|$)/;
export const DEMO_SCHEDULE_RUN_PATH = "/rpc/automation/schedules/runNow";
