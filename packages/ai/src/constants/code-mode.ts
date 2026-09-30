export const CODE_MODE_TOOL_NAME = "code_mode";
export const CODE_MODE_TIMEOUT_MS = 120_000;

// Read-only tools without dedicated chat UI. The model composes them in one
// sandboxed program instead of a round trip per call. Tools that write data,
// need approval, or render charts, post cards, or favicons stay direct.
export const STANDALONE_CODE_MODE_TOOL_NAMES = [
  "getPullRequests",
  "getReleaseByTag",
  "getCommitsByTimeframe",
  "getLinearIssues",
  "getLinearProjects",
  "getLinearCycles",
  "getGranolaNotes",
  "getGranolaNote",
  "getGranolaFolders",
  "getAvailablePosts",
  "getPost",
  "viewPost",
  "getAvailableIntegrations",
  "getAvailableBrandReferences",
  "listSchedules",
  "listAvailableSkills",
  "getSkillByName",
  "webSearch",
  "fetchWebpage",
  "listGeoProjects",
  "getGeoPromptResults",
  "getGeoProjectContext",
] as const;
