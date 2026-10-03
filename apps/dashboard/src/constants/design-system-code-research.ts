import type {
  CodeResearchAgent,
  CodeResearchStage,
  CodeResearchStageId,
} from "@/types/design-system/code-research";

export const CODE_RESEARCH_DEMO_INTEGRATION_ID = "gh_int_notra";
export const CODE_RESEARCH_DEMO_REPOSITORY = "usenotra/notra";
export const CODE_RESEARCH_DEMO_ROOT_SESSION = "wrun_01M3PC…4X";
export const CODE_RESEARCH_DEMO_REDIS_KEY = `code-research:box:${CODE_RESEARCH_DEMO_ROOT_SESSION}:${CODE_RESEARCH_DEMO_INTEGRATION_ID}`;
export const CODE_RESEARCH_DEMO_BOX_TTL_MINUTES = 15;
export const CODE_RESEARCH_DEMO_REUSE_MARGIN_MINUTES = 5;

// Playback pacing at 1x. Real durations from the live test are shown separately.
export const CODE_RESEARCH_PLAYBACK_DELAYS = {
  user: 500,
  assistantStart: 700,
  text: 900,
  toolStart: 550,
  toolEndMin: 450,
  toolEndMax: 2600,
  stage: 700,
  divider: 900,
} as const;
export const CODE_RESEARCH_REAL_TO_PLAYBACK_RATIO = 0.35;
export const CODE_RESEARCH_PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;

// Measured against real Upstash boxes on 2026-09-29.
export const CODE_RESEARCH_MEASURED_MS = {
  lookup: 12,
  lease: 9,
  attachCached: 1,
  attachFresh: 310,
  token: 240,
  create: 2335,
  clone: 3393,
  checkoutPr: 1539,
  store: 8,
  overview: 200,
  exec: 225,
  getPullRequest: 380,
  researcherTotal: 55_300,
  writerTotal: 61_000,
} as const;

export const CODE_RESEARCH_STAGE_DEFINITIONS: Omit<
  CodeResearchStage,
  "status" | "realMs"
>[] = [
  {
    id: "lookup",
    label: "Redis-Lookup",
    detail: "Gibt es für diesen Chat und dieses Repo schon eine Box?",
  },
  {
    id: "lease",
    label: "Lease setzen",
    detail: "SET NX, damit parallele Tool-Calls keine zweite Box bauen.",
  },
  {
    id: "attach",
    label: "Box reattachen",
    detail: "Box.get + getStatus, 60 s im Prozess gecacht.",
  },
  {
    id: "token",
    label: "GitHub-Token minten",
    detail: "Installation-Token, nur contents: read, nur dieses Repo.",
  },
  {
    id: "create",
    label: "EphemeralBox.create",
    detail:
      "node, small, TTL 15 min, Netzwerk nur github.com, Token per attachHeaders.",
  },
  {
    id: "clone",
    label: "git clone",
    detail:
      "--single-branch --shallow-since=90.days.ago, ohne Token auf der Platte.",
  },
  {
    id: "checkout",
    label: "Ref auschecken",
    detail: "refs/pull/<n>/head fetchen und detached auschecken.",
  },
  {
    id: "store",
    label: "Status speichern",
    detail: "boxId, Ref, HEAD und Ablauf in Redis, TTL = Box-TTL minus 5 min.",
  },
  {
    id: "overview",
    label: "Überblick lesen",
    detail: "Top-Level, README, Manifeste, letzte Commits in einem exec.",
  },
];

export const CODE_RESEARCH_STAGE_IDS: CodeResearchStageId[] =
  CODE_RESEARCH_STAGE_DEFINITIONS.map((stage) => stage.id);

export const CODE_RESEARCH_AGENT_LABELS: Record<CodeResearchAgent, string> = {
  notra: "Notra",
  "code-researcher": "code-researcher",
  "content-writer": "content-writer",
  platform: "Plattform",
};

export const CODE_RESEARCH_AGENT_CLASSNAMES: Record<CodeResearchAgent, string> =
  {
    notra: "bg-foreground/5 text-foreground",
    "code-researcher": "bg-info/10 text-info",
    "content-writer": "bg-success/10 text-success",
    platform: "bg-warning/10 text-warning",
  };

export const CODE_RESEARCH_PHASE_LABELS = {
  none: "Keine Box",
  creating: "Wird erstellt",
  cloning: "Clont Repo",
  checkout: "Checkt aus",
  ready: "Bereit",
  expired: "Abgelaufen",
  disabled: "Deaktiviert",
} as const;

export const CODE_RESEARCH_REDIS_LABELS = {
  empty: "leer",
  miss: "miss",
  lease: "lease gesetzt",
  hit: "hit",
  stored: "gespeichert",
  expired: "abgelaufen",
} as const;
