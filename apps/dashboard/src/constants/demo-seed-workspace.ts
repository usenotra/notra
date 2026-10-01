import type {
  DemoSeedPersona,
  DemoSeedSchedule,
  DemoSeedSkill,
  DemoSeedSocialAccount,
  DemoSeedTeammate,
} from "@/types/demo-seed";

/** Fictional Fieldnote teammates; emails use the reserved .example domain. */
export const DEMO_SEED_TEAMMATES: readonly DemoSeedTeammate[] = [
  {
    name: "Maya Okafor",
    email: "maya@fieldnote.example",
    role: "admin",
    joinedDaysAgo: 210,
  },
  {
    name: "Jonas Keller",
    email: "jonas@fieldnote.example",
    role: "member",
    joinedDaysAgo: 96,
  },
  {
    name: "Priya Raman",
    email: "priya@fieldnote.example",
    role: "member",
    joinedDaysAgo: 31,
  },
];

export const DEMO_SEED_GITHUB_REPOSITORY = {
  displayName: "fieldnote/fieldnote-app",
  owner: "fieldnote",
  repo: "fieldnote-app",
  defaultBranch: "main",
} as const;

export const DEMO_SEED_SCHEDULES: readonly DemoSeedSchedule[] = [
  {
    name: "Weekly changelog",
    outputType: "changelog",
    cron: { frequency: "weekly", dayOfWeek: 1, hour: 9, minute: 0 },
    lookbackWindow: "last_7_days",
    autoPublish: false,
    instructions: "Group changes into New, Improved and Fixed.",
  },
  {
    name: "LinkedIn launch recap",
    outputType: "linkedin_post",
    cron: { frequency: "weekly", dayOfWeek: 4, hour: 14, minute: 30 },
    lookbackWindow: "last_7_days",
    autoPublish: false,
    instructions: "One customer-facing highlight per post, no internal jargon.",
  },
  {
    name: "Monthly product blog",
    outputType: "blog_post",
    cron: { frequency: "monthly", dayOfMonth: 1, hour: 8, minute: 0 },
    lookbackWindow: "last_30_days",
    autoPublish: false,
    instructions: "Tell the story of the month's biggest feature.",
  },
];

export const DEMO_SEED_SKILLS: readonly DemoSeedSkill[] = [
  {
    name: "fieldnote-voice",
    description: "Keep every post in Fieldnote's friendly, concrete voice.",
    content: `# Fieldnote voice

- Short sentences. One idea per paragraph.
- Every claim gets a concrete example from a real workflow.
- Say "your team", not "users".
- No buzzwords: avoid "revolutionize", "seamless", "unlock".`,
  },
  {
    name: "customer-quote",
    description: "Add one short, attributed customer quote to launch posts.",
    content: `# Customer quote

When a post announces a feature, add one quote (max 25 words) from a customer
who asked for it. Attribute it by role and company, never by full name.`,
  },
];

export const DEMO_SEED_PERSONAS: readonly DemoSeedPersona[] = [
  {
    name: "Lena",
    role: "Product Lead",
    company: "40-person B2B SaaS startup",
    summary:
      "Runs too many status meetings and wants decisions to be findable without chasing people on Slack.",
    searchStyle:
      "Asks for comparisons and shortlists, then drills into integrations.",
    profile: {
      goals: ["Cut recurring status meetings", "Keep decisions searchable"],
      painPoints: [
        "Decisions buried in call recordings",
        "Notes in five tools",
      ],
      currentStack: ["Zoom", "Slack", "Linear", "Notion"],
      buyingTriggers: [
        "A missed decision caused rework",
        "Team doubled in size",
      ],
      objections: ["Another tool to maintain", "Privacy of recordings"],
    },
    conversationPrompts: [
      "What's the best AI meeting notes tool for a product team?",
      "Which of those integrates with Linear?",
    ],
  },
  {
    name: "Tom",
    role: "Engineering Manager",
    company: "Remote-first fintech, 120 people",
    summary:
      "Wants 1:1 and incident review notes that write themselves and stay private.",
    searchStyle: "Short, technical questions; cares about data residency.",
    profile: {
      goals: ["Better 1:1 follow-ups", "Searchable incident reviews"],
      painPoints: ["Action items get lost", "Compliance reviews of tools"],
      currentStack: ["Google Meet", "Slack", "Jira"],
      buyingTriggers: ["New EU customers", "Audit finding on meeting records"],
      objections: ["Data leaving the EU", "Per-seat pricing"],
    },
    conversationPrompts: [
      "Is there an AI note taker with EU data residency?",
      "How do they handle recordings for compliance?",
    ],
  },
  {
    name: "Sofia",
    role: "Agency Founder",
    company: "Content agency with 12 client brands",
    summary:
      "Needs client call notes separated per brand and shareable with clients.",
    searchStyle: "Asks about pricing and multi-workspace setups.",
    profile: {
      goals: [
        "Share call summaries with clients",
        "Separate workspaces per client",
      ],
      painPoints: ["Manual recap emails", "Mixing up client notes"],
      currentStack: ["Zoom", "Google Docs", "Slack Connect"],
      buyingTriggers: [
        "Landing three new clients",
        "A client asked for recaps",
      ],
      objections: ["Paying per client workspace"],
    },
    conversationPrompts: [
      "Which meeting notes app works best for agencies with many clients?",
    ],
  },
];

/**
 * Social accounts behind the analytics pages. Their stats are generated at
 * read time (see `@notra/analytics/tinybird/demo-social`).
 */
export const DEMO_SEED_SOCIAL_ACCOUNTS: readonly DemoSeedSocialAccount[] = [
  {
    provider: "twitter",
    kind: "connected",
    username: null,
    displayName: null,
    verified: true,
    joinedDaysAgo: 200,
  },
  {
    provider: "linkedin",
    kind: "connected",
    username: null,
    displayName: null,
    verified: false,
    joinedDaysAgo: 150,
  },
  {
    provider: "twitter",
    kind: "tracked",
    username: "quillboard",
    displayName: "Quillboard",
    verified: true,
    joinedDaysAgo: 60,
  },
  {
    provider: "twitter",
    kind: "tracked",
    username: "notablyhq",
    displayName: "Notably",
    verified: false,
    joinedDaysAgo: 45,
  },
];
