import { and, eq, sql } from "drizzle-orm";

import { GEO_PERSONA_MEMORY_KINDS } from "../constants/geo-personas";
import { db } from "../drizzle";
import {
  geoMentionChecks,
  geoPersonaMemories,
  geoPersonas,
  geoScans,
  geoSettings,
  organizations,
  projects,
} from "../schema";

const ENGINES = [
  "openai/gpt-5.4-grounded",
  "anthropic/claude-sonnet-4.6-grounded",
  "google/gemini-3-flash-grounded",
] as const;

const SCAN_ID_PREFIX = "seed-persona-";

interface DemoPersona {
  name: string;
  role: string;
  company: string;
  summary: string;
  searchStyle: string;
  profile: {
    goals: string[];
    painPoints: string[];
    currentStack: string[];
    buyingTriggers: string[];
    objections: string[];
  };
  memories: {
    kind: (typeof GEO_PERSONA_MEMORY_KINDS)[number];
    content: string;
  }[];
  /** base mention rate, 0..1 */
  baseRate: number;
  /** trend added over the seeded window, e.g. 0.2 = +20pp */
  trend: number;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    name: "ROI Hawk",
    role: "Finance Lead",
    company: "120-person B2B SaaS scale-up, logistics",
    summary:
      "Optimizes for value and clear ROI\nWilling to trade cutting-edge features for predictable pricing\nResearching now because the current contract renews next quarter",
    searchStyle:
      "Short, price-focused questions\nAlways asks for pricing and total cost of ownership\nCompares 2-3 named vendors per question",
    profile: {
      goals: ["Cut tooling spend by 20%", "Prove ROI to the CFO"],
      painPoints: ["Opaque per-seat pricing", "Shelfware from past purchases"],
      currentStack: ["Excel", "Notion", "A legacy analytics suite"],
      buyingTriggers: ["Renewal deadline", "Budget freeze announcement"],
      objections: ["Hidden implementation fees", "Long lock-in contracts"],
    },
    memories: [
      {
        kind: "background",
        content:
          "I run finance for a 120-person logistics SaaS company and own all software budgets.",
      },
      {
        kind: "constraint",
        content:
          "Every purchase above 5k annual needs a written ROI case for the CFO.",
      },
      {
        kind: "experience",
        content:
          "We got burned by a BI tool that doubled its price at renewal last year.",
      },
    ],
    baseRate: 0.22,
    trend: 0.18,
  },
  {
    name: "GEO Pioneer",
    role: "Growth Lead",
    company: "45-person B2B SaaS startup, marketing tech",
    summary:
      "Optimizes for innovation and getting ahead\nWilling to try new vendors before they are mainstream\nResearching now to ship an AI-visibility motion this quarter",
    searchStyle:
      "Long, detailed prompts with context\nAsks for newest tools and comparisons\nUses AI jargon and names categories explicitly",
    profile: {
      goals: [
        "Be first in the category on AI search",
        "Ship weekly experiments",
      ],
      painPoints: ["Slow-moving incumbents", "Lack of AI search benchmarks"],
      currentStack: ["ChatGPT", "Perplexity", "HubSpot"],
      buyingTriggers: ["Competitor launch", "Board asks about AI strategy"],
      objections: ["Tools without an API", "Vendors that ignore AI crawlers"],
    },
    memories: [
      {
        kind: "background",
        content:
          "I lead growth at a 45-person martech startup and live in ChatGPT and Perplexity.",
      },
      {
        kind: "preference",
        content:
          "I always trial the newest tool in a category before shortlisting the safe pick.",
      },
      {
        kind: "experience",
        content:
          "An early bet on a new SEO tool drove half of our pipeline last year.",
      },
    ],
    baseRate: 0.62,
    trend: 0.1,
  },
  {
    name: "Enterprise Loyalist",
    role: "IT Manager",
    company: "2,000-person enterprise, financial services",
    summary:
      "Optimizes for trust and low switching risk\nSticks with the incumbent unless there is a strong reason\nResearching now because compliance flagged the current vendor",
    searchStyle:
      "Formal, compliance-heavy questions\nAsks about security certifications and data retention\nKeeps prompts short and vendor-neutral",
    profile: {
      goals: ["Zero downtime migration", "Pass the security review first try"],
      painPoints: ["Vendor risk questionnaires", "Shadow IT sprawl"],
      currentStack: [
        "Microsoft 365",
        "Salesforce",
        "A legacy monitoring suite",
      ],
      buyingTriggers: ["Compliance finding", "Incumbent price hike"],
      objections: ["Vendors without SOC 2", "US-only data hosting"],
    },
    memories: [
      {
        kind: "background",
        content:
          "I manage IT for a 2,000-person financial services company with strict procurement.",
      },
      {
        kind: "constraint",
        content:
          "Any new vendor must clear SOC 2 and EU data residency before a trial.",
      },
      {
        kind: "experience",
        content:
          "A rushed vendor switch once caused a two-day outage my team still hears about.",
      },
    ],
    baseRate: 0.12,
    trend: 0.05,
  },
  {
    name: "Alternative Seeker",
    role: "Founder",
    company: "12-person startup, developer tools",
    summary:
      "Optimizes for discovery of a better fit\nActively unhappy with the current tool\nResearching now because the team keeps complaining",
    searchStyle:
      "Conversational, story-like prompts\nDescribes the problem, not the category\nAsks for alternatives and migration stories",
    profile: {
      goals: ["Find a tool the team loves", "Migrate in under two weeks"],
      painPoints: ["Clunky incumbent UX", "No support for our workflow"],
      currentStack: ["Linear", "Slack", "A legacy wiki"],
      buyingTriggers: ["Team complaints spike", "Failed renewal negotiation"],
      objections: [
        "Steep learning curves",
        "Per-seat pricing that punishes growth",
      ],
    },
    memories: [
      {
        kind: "background",
        content:
          "I founded a 12-person dev-tools startup and still approve every subscription.",
      },
      {
        kind: "preference",
        content:
          "I pick tools my engineers praise in Slack over anything with a sales deck.",
      },
      {
        kind: "experience",
        content:
          "We migrated off a legacy wiki in a weekend after the team revolted.",
      },
    ],
    baseRate: 0.42,
    trend: 0.14,
  },
  {
    name: "Pragmatic Evaluator",
    role: "Marketing Lead",
    company: "200-person scale-up, e-commerce",
    summary:
      "Balances features, effort, cost, and team needs\nWeighs trade-offs in a scoring sheet\nResearching now for a Q4 shortlist decision",
    searchStyle:
      "Structured comparison questions\nAsks for pros/cons tables\nMentions team size and timeline in every prompt",
    profile: {
      goals: ["Build a defensible shortlist", "Decide before Q4 planning"],
      painPoints: ["Conflicting stakeholder opinions", "Endless free trials"],
      currentStack: ["Shopify", "Klaviyo", "Google Analytics"],
      buyingTriggers: ["Q4 planning cycle", "Agency recommendation"],
      objections: [
        "Tools needing a dedicated admin",
        "Unclear onboarding effort",
      ],
    },
    memories: [
      {
        kind: "background",
        content:
          "I lead marketing at a 200-person e-commerce scale-up and run vendor selection.",
      },
      {
        kind: "preference",
        content:
          "I score every vendor on features, effort, cost, and team fit before deciding.",
      },
      {
        kind: "experience",
        content:
          "A structured bake-off saved us from a bad CMS contract two years ago.",
      },
    ],
    baseRate: 0.33,
    trend: 0.08,
  },
];

function getArgValue(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length).trim() || null;
  }
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value.trim() : null;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

/** Deterministic 0..1 hash so reruns produce the same demo data. */
function hash01(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function toDayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function resolveTargets() {
  if (hasFlag("all")) {
    // Backfill mode: only touch projects that already have personas but no
    // persona activity yet. Projects without personas are left alone (seed
    // them explicitly via --org-slug / --project-id).
    const personaProjectRows = await db.execute(
      sql`select distinct project_id from geo_personas`
    );
    const checkProjectRows = await db.execute(
      sql`select distinct project_id from geo_mention_checks where persona_id is not null`
    );
    const withChecks = new Set(
      (checkProjectRows.rows as { project_id: string }[]).map(
        (row) => row.project_id
      )
    );
    const candidateIds = (personaProjectRows.rows as { project_id: string }[])
      .map((row) => row.project_id)
      .filter((id) => !withChecks.has(id));
    if (candidateIds.length === 0) {
      return [];
    }
    const rows = await db
      .select({
        organizationId: projects.organizationId,
        projectId: projects.id,
        projectName: projects.name,
        orgSlug: organizations.slug,
      })
      .from(projects)
      .innerJoin(organizations, eq(projects.organizationId, organizations.id));
    return rows
      .filter((row) => candidateIds.includes(row.projectId))
      .map((row) => ({
        organizationId: row.organizationId,
        projectId: row.projectId,
        label: `${row.orgSlug}/${row.projectName}`,
      }));
  }

  const explicitOrgId =
    getArgValue("org-id") ?? process.env.SEED_ORGANIZATION_ID?.trim();
  let organizationId = explicitOrgId ?? null;
  if (!organizationId) {
    const slug =
      getArgValue("org-slug") ?? process.env.SEED_ORGANIZATION_SLUG?.trim();
    if (!slug) {
      throw new Error(
        "Pass --org-slug=<slug>, --org-id=<id>, or --all to select projects."
      );
    }
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
      columns: { id: true },
    });
    if (!organization) {
      throw new Error(`No organization found for slug "${slug}"`);
    }
    organizationId = organization.id;
  }

  const explicitProjectId = getArgValue("project-id")?.trim();
  if (explicitProjectId) {
    return [
      {
        organizationId,
        projectId: explicitProjectId,
        label: explicitProjectId,
      },
    ];
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.organizationId, organizationId),
    columns: { id: true, name: true },
  });
  if (!project) {
    throw new Error(`No project found for organization "${organizationId}"`);
  }
  return [
    {
      organizationId,
      projectId: project.id,
      label: project.name,
    },
  ];
}

async function ensureGeoSettings(
  organizationId: string,
  projectId: string,
  companyName: string
) {
  const existing = await db.query.geoSettings.findFirst({
    where: eq(geoSettings.projectId, projectId),
    columns: { id: true },
  });
  if (existing) {
    return;
  }
  await db.insert(geoSettings).values({
    id: crypto.randomUUID(),
    organizationId,
    projectId,
    companyName,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function ensurePersonas(
  organizationId: string,
  projectId: string
): Promise<{ id: string; name: string; baseRate: number; trend: number }[]> {
  const existing = await db.query.geoPersonas.findMany({
    where: eq(geoPersonas.projectId, projectId),
    columns: { id: true, name: true },
  });
  if (existing.length > 0) {
    // Reuse whatever personas the project already has; derive a stable,
    // distinct base rate per persona so the chart shows separate lines.
    return existing.map((persona, index) => ({
      id: persona.id,
      name: persona.name,
      baseRate: 0.15 + ((hash01(persona.id) * 5 + index) % 5) * 0.11,
      trend: 0.05 + hash01(`${persona.id}:trend`) * 0.12,
    }));
  }

  const now = new Date();
  const created: {
    id: string;
    name: string;
    baseRate: number;
    trend: number;
  }[] = [];
  for (const demo of DEMO_PERSONAS) {
    const personaId = crypto.randomUUID();
    await db.insert(geoPersonas).values({
      id: personaId,
      organizationId,
      projectId,
      name: demo.name,
      role: demo.role,
      company: demo.company,
      summary: demo.summary,
      searchStyle: demo.searchStyle,
      profile: demo.profile,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(geoPersonaMemories).values(
      demo.memories.map((memory) => ({
        id: crypto.randomUUID(),
        personaId,
        organizationId,
        projectId,
        kind: memory.kind,
        content: memory.content,
        createdAt: now,
      }))
    );
    created.push({
      id: personaId,
      name: demo.name,
      baseRate: demo.baseRate,
      trend: demo.trend,
    });
  }
  return created;
}

async function seedProjectActivity(
  organizationId: string,
  projectId: string,
  days: number,
  reset: boolean
) {
  const settings = await db.query.geoSettings.findFirst({
    where: eq(geoSettings.projectId, projectId),
    columns: { companyName: true },
  });
  const brandName = settings?.companyName?.trim() || "Notra";
  if (!settings) {
    await ensureGeoSettings(organizationId, projectId, "Notra");
  }

  const personas = await ensurePersonas(organizationId, projectId);

  if (reset) {
    await db
      .delete(geoMentionChecks)
      .where(
        and(
          eq(geoMentionChecks.projectId, projectId),
          sql`${geoMentionChecks.scanId} like ${`${SCAN_ID_PREFIX}%`}`
        )
      );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let scansCreated = 0;
  let checksInserted = 0;

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today.getTime() - offset * 86_400_000);
    const dayString = toDayString(day);
    const scanId = `${SCAN_ID_PREFIX}${projectId}-${dayString}`;

    const existingScan = await db.query.geoScans.findFirst({
      where: eq(geoScans.id, scanId),
      columns: { id: true },
    });
    if (!existingScan) {
      await db.insert(geoScans).values({
        id: scanId,
        organizationId,
        projectId,
        status: "completed",
        startedAt: new Date(`${dayString}T08:00:00.000Z`),
        finishedAt: new Date(`${dayString}T08:15:00.000Z`),
        createdAt: new Date(`${dayString}T08:00:00.000Z`),
      });
      scansCreated += 1;
    }

    const rows = [];
    for (const persona of personas) {
      // Later days mention slightly more: gives the 30d chart a live trend.
      const progress = (days - 1 - offset) / Math.max(days - 1, 1);
      const rate = Math.min(
        0.95,
        Math.max(0.02, persona.baseRate + persona.trend * progress)
      );
      for (const engine of ENGINES) {
        const roll = hash01(`${dayString}:${persona.id}:${engine}`);
        const mentioned = roll < rate;
        const position = mentioned ? 1 + (Math.floor(roll * 100) % 3) : null;
        const prompt = `As a ${persona.name} persona, which tools are best for AI search visibility right now?`;
        const answer = mentioned
          ? `${brandName} is a strong pick here: it tracks AI visibility across ChatGPT, Perplexity, and Claude, and attributes mentions by buyer persona. Shortlist ${brandName} alongside two alternatives and compare pricing.`
          : `The usual shortlist applies here: compare the top-rated tools on G2 for AI visibility, check pricing, and trial two alternatives before deciding.`;
        rows.push({
          id: crypto.randomUUID(),
          organizationId,
          projectId,
          scanId,
          engine,
          promptId: `persona-${persona.id}`,
          sequenceId: null,
          personaId: persona.id,
          turn: 0,
          prompt,
          answer,
          mentioned,
          position,
          sentiment: mentioned ? "positive" : "neutral",
          competitors: [],
          excerpt: mentioned
            ? `${brandName} tracks AI visibility across engines.`
            : "",
          grounding: { queries: [], sources: [] },
          language: "English",
          sources: [],
          finishReason: "stop",
          promptTokens: 120,
          outputTokens: 220,
          reasoningTokens: null,
          zdrEnforced: null,
          capturedAt: new Date(`${dayString}T10:00:00.000Z`),
        });
      }
    }

    if (rows.length > 0) {
      const inserted = await db
        .insert(geoMentionChecks)
        .values(rows)
        .onConflictDoNothing({
          target: [
            geoMentionChecks.scanId,
            geoMentionChecks.engine,
            geoMentionChecks.promptId,
            geoMentionChecks.turn,
            geoMentionChecks.language,
          ],
        })
        .returning({ id: geoMentionChecks.id });
      checksInserted += inserted.length;
    }
  }

  return {
    brandName,
    personaCount: personas.length,
    scansCreated,
    checksInserted,
  };
}

async function seedPersonaVisibility() {
  const days = Math.max(
    1,
    Math.min(90, Number.parseInt(getArgValue("days") ?? "30", 10) || 30)
  );
  const reset = hasFlag("reset");
  const targets = await resolveTargets();

  for (const target of targets) {
    const result = await seedProjectActivity(
      target.organizationId,
      target.projectId,
      days,
      reset
    );
    console.info("Seeded persona visibility", {
      project: target.label,
      projectId: target.projectId,
      ...result,
    });
  }
}

seedPersonaVisibility()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
