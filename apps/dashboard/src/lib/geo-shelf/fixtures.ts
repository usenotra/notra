import {
  canonicalizeShelfUrl,
  shelfDomainFromUrl,
} from "@notra/schemas/utils/dashboard/shelf-url";

import type {
  GeoShelfFixtureContext,
  GeoShelfOpportunity,
  GeoShelfOpportunityStatus,
  GeoShelfPlacement,
  GeoShelfPlacementStatus,
  GeoShelfPriority,
  GeoShelfSource,
  GeoShelfSourceKind,
  GeoShelfStoreKey,
} from "../../types/geo-shelf";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

interface FixtureBrand {
  competitorId: string | null;
  name: string;
  domain: string | null;
}

interface FixtureTemplate {
  slug: string;
  url: string;
  title: (ctx: GeoShelfFixtureContext) => string;
  kind: GeoShelfSourceKind;
  ownership: GeoShelfSource["ownership"];
  origin: GeoShelfSource["origin"];
  fetchStatus: GeoShelfSource["fetchStatus"];
  windowCount: number;
  totalCount: number;
  promptCount: number;
  engineCount: number;
  firstCitedDaysAgo: number | null;
  lastCitedHoursAgo: number | null;
  own: GeoShelfPlacementStatus;
  ownPosition: number | null;
  competitorStatuses: GeoShelfPlacementStatus[];
  ticket: {
    status: GeoShelfOpportunityStatus;
    priority: GeoShelfPriority | null;
    assignee: number | null;
    poc: number | null;
    notes: string | null;
    dueInDays: number | null;
    createdDaysAgo: number;
  } | null;
  createdDaysAgo: number;
}

const TEMPLATES: FixtureTemplate[] = [
  {
    slug: "g2-category",
    url: "https://www.g2.com/categories/ai-visibility-tracking",
    title: () => "Best AI Visibility Tracking Software",
    kind: "review_site",
    ownership: "third_party",
    origin: "scan",
    fetchStatus: "ok",
    windowCount: 41,
    totalCount: 96,
    promptCount: 9,
    engineCount: 3,
    firstCitedDaysAgo: 54,
    lastCitedHoursAgo: 6,
    own: "absent",
    ownPosition: null,
    competitorStatuses: ["present", "present", "present"],
    ticket: {
      status: "in_progress",
      priority: "high",
      assignee: 0,
      poc: 0,
      notes:
        "Vendor profile submitted 28 Aug. Waiting on category approval, G2 said 5 to 10 business days.",
      dueInDays: 6,
      createdDaysAgo: 11,
    },
    createdDaysAgo: 54,
  },
  {
    slug: "reddit-thread",
    url: "https://www.reddit.com/r/SEO/comments/1f3k9x2/how_are_you_tracking_brand_mentions_in_chatgpt/",
    title: () =>
      "How are you tracking brand mentions in ChatGPT and Perplexity?",
    kind: "community",
    ownership: "third_party",
    origin: "scan",
    fetchStatus: "ok",
    windowCount: 27,
    totalCount: 44,
    promptCount: 6,
    engineCount: 2,
    firstCitedDaysAgo: 31,
    lastCitedHoursAgo: 14,
    own: "present",
    ownPosition: 4,
    competitorStatuses: ["present", "present", "absent"],
    ticket: null,
    createdDaysAgo: 31,
  },
  {
    slug: "capterra",
    url: "https://www.capterra.com/generative-engine-optimization-software/",
    title: () => "Generative Engine Optimization Software",
    kind: "review_site",
    ownership: "third_party",
    origin: "scan",
    fetchStatus: "ok",
    windowCount: 22,
    totalCount: 39,
    promptCount: 5,
    engineCount: 2,
    firstCitedDaysAgo: 40,
    lastCitedHoursAgo: 30,
    own: "absent",
    ownPosition: null,
    competitorStatuses: ["present", "absent", "present"],
    ticket: {
      status: "open",
      priority: "medium",
      assignee: 1,
      poc: 1,
      notes: null,
      dueInDays: null,
      createdDaysAgo: 3,
    },
    createdDaysAgo: 40,
  },
  {
    slug: "medium-listicle",
    url: "https://medium.com/@growthnotes/10-tools-to-monitor-your-brand-in-ai-search-2026-9b1c0f",
    title: () => "10 Tools to Monitor Your Brand in AI Search (2026)",
    kind: "listicle",
    ownership: "third_party",
    origin: "scan",
    fetchStatus: "ok",
    windowCount: 18,
    totalCount: 18,
    promptCount: 4,
    engineCount: 2,
    firstCitedDaysAgo: 12,
    lastCitedHoursAgo: 3,
    own: "absent",
    ownPosition: null,
    competitorStatuses: ["present", "present", "present"],
    ticket: {
      status: "open",
      priority: "high",
      assignee: null,
      poc: null,
      notes: null,
      dueInDays: null,
      createdDaysAgo: 2,
    },
    createdDaysAgo: 12,
  },
  {
    slug: "youtube-comparison",
    url: "https://www.youtube.com/watch?v=Qk3vR8pLm2E",
    title: (ctx) =>
      `${ctx.competitors[0]?.name ?? "Top tool"} vs the field: AI visibility tools compared`,
    kind: "video",
    ownership: "third_party",
    origin: "scan",
    fetchStatus: "blocked",
    windowCount: 9,
    totalCount: 15,
    promptCount: 3,
    engineCount: 1,
    firstCitedDaysAgo: 22,
    lastCitedHoursAgo: 52,
    own: "unknown",
    ownPosition: null,
    competitorStatuses: ["unknown", "unknown", "unknown"],
    ticket: null,
    createdDaysAgo: 22,
  },
  {
    slug: "producthunt",
    url: "https://www.producthunt.com/topics/seo",
    title: () => "Best SEO products of 2026",
    kind: "community",
    ownership: "third_party",
    origin: "scan",
    fetchStatus: "ok",
    windowCount: 8,
    totalCount: 21,
    promptCount: 3,
    engineCount: 2,
    firstCitedDaysAgo: 47,
    lastCitedHoursAgo: 70,
    own: "present",
    ownPosition: 12,
    competitorStatuses: ["present", "absent", "absent"],
    ticket: null,
    createdDaysAgo: 47,
  },
  {
    slug: "competitor-blog",
    url: "https://blog.example-competitor.com/alternatives",
    title: (ctx) =>
      `${ctx.competitors[0]?.name ?? "Competitor"} alternatives: 7 tools worth a look`,
    kind: "listicle",
    ownership: "competitor",
    origin: "scan",
    fetchStatus: "ok",
    windowCount: 7,
    totalCount: 12,
    promptCount: 2,
    engineCount: 1,
    firstCitedDaysAgo: 19,
    lastCitedHoursAgo: 96,
    own: "absent",
    ownPosition: null,
    competitorStatuses: ["present", "absent", "absent"],
    ticket: {
      status: "dismissed",
      priority: "low",
      assignee: 0,
      poc: 0,
      notes: "Competitor owned page, not worth pitching.",
      dueInDays: null,
      createdDaysAgo: 10,
    },
    createdDaysAgo: 19,
  },
  {
    slug: "techcrunch",
    url: "https://techcrunch.com/2026/08/14/ai-search-visibility-startups-raise/",
    title: () => "AI search visibility startups are raising fast",
    kind: "news",
    ownership: "third_party",
    origin: "scan",
    fetchStatus: "ok",
    windowCount: 6,
    totalCount: 6,
    promptCount: 2,
    engineCount: 2,
    firstCitedDaysAgo: 9,
    lastCitedHoursAgo: 40,
    own: "absent",
    ownPosition: null,
    competitorStatuses: ["present", "present", "absent"],
    ticket: {
      status: "lost",
      priority: "low",
      assignee: 1,
      poc: 1,
      notes: "Reporter declined, article is closed.",
      dueInDays: null,
      createdDaysAgo: 7,
    },
    createdDaysAgo: 9,
  },
  {
    slug: "own-docs",
    url: "https://docs.example.com/guides/ai-visibility",
    title: (ctx) => `${ctx.ownBrandName} docs: Tracking AI visibility`,
    kind: "docs",
    ownership: "own",
    origin: "scan",
    fetchStatus: "ok",
    windowCount: 5,
    totalCount: 11,
    promptCount: 2,
    engineCount: 2,
    firstCitedDaysAgo: 27,
    lastCitedHoursAgo: 20,
    own: "present",
    ownPosition: 1,
    competitorStatuses: ["absent", "absent", "absent"],
    ticket: null,
    createdDaysAgo: 27,
  },
  {
    slug: "manual-newsletter",
    url: "https://www.marketingbrew.com/stories/ai-search-tools-roundup",
    title: () => "Marketing Brew: the AI search tools marketers actually use",
    kind: "listicle",
    ownership: "third_party",
    origin: "manual",
    fetchStatus: "pending",
    windowCount: 0,
    totalCount: 0,
    promptCount: 0,
    engineCount: 0,
    firstCitedDaysAgo: null,
    lastCitedHoursAgo: null,
    own: "absent",
    ownPosition: null,
    competitorStatuses: ["present", "present", "unknown"],
    ticket: {
      status: "open",
      priority: "medium",
      assignee: 1,
      poc: 0,
      notes: "Added from the sales call. Editor contact is in the CRM.",
      dueInDays: 14,
      createdDaysAgo: 1,
    },
    createdDaysAgo: 1,
  },
];

function isoAgo(now: Date, ms: number): string {
  return new Date(now.getTime() - ms).toISOString();
}

function isoAhead(now: Date, ms: number): string {
  return new Date(now.getTime() + ms).toISOString();
}

function brandsFor(ctx: GeoShelfFixtureContext): FixtureBrand[] {
  const own: FixtureBrand = {
    competitorId: null,
    name: ctx.ownBrandName,
    domain: ctx.ownDomain,
  };
  const competitors = ctx.competitors.map<FixtureBrand>((competitor) => ({
    competitorId: competitor.id,
    name: competitor.name,
    domain: competitor.domain,
  }));
  return [own, ...competitors];
}

function buildPlacements(
  template: FixtureTemplate,
  ctx: GeoShelfFixtureContext
): GeoShelfPlacement[] {
  const brands = brandsFor(ctx);
  const evidence: GeoShelfPlacement["evidence"] =
    template.origin === "manual" ? "manual" : "fetch";
  const checkedAt =
    template.origin === "manual"
      ? isoAgo(ctx.now, template.createdDaysAgo * DAY_MS)
      : isoAgo(ctx.now, 2 * DAY_MS);

  return brands.map((brand, index) => {
    const isOwn = brand.competitorId === null;
    const status = isOwn
      ? template.own
      : (template.competitorStatuses[index - 1] ?? "absent");
    const competitorPosition = status === "present" ? index + 1 : null;
    const position = isOwn ? template.ownPosition : competitorPosition;
    return {
      competitorId: brand.competitorId,
      brandName: brand.name,
      brandDomain: brand.domain,
      status,
      position,
      hasLink: status === "present" && template.kind !== "video",
      evidence,
      excerpt:
        status === "present" ? `${brand.name} is listed on this page.` : null,
      checkedAt,
    };
  });
}

function buildOpportunity(
  template: FixtureTemplate,
  ctx: GeoShelfFixtureContext,
  scopeId: string
): GeoShelfOpportunity | null {
  const ticket = template.ticket;
  if (!ticket) {
    return null;
  }
  const assignee =
    ticket.assignee === null ? null : (ctx.members[ticket.assignee] ?? null);
  const poc = ticket.poc === null ? null : (ctx.members[ticket.poc] ?? null);
  const createdAt = isoAgo(ctx.now, ticket.createdDaysAgo * DAY_MS);
  const isResolved =
    ticket.status === "won" ||
    ticket.status === "lost" ||
    ticket.status === "dismissed";
  return {
    id: `shelf-opp-${scopeId}-${template.slug}`,
    status: ticket.status,
    priority: ticket.priority,
    assigneeMemberId: assignee?.id ?? null,
    pocMemberId: poc && poc.id !== assignee?.id ? poc.id : null,
    notes: ticket.notes,
    dueAt:
      ticket.dueInDays === null
        ? null
        : isoAhead(ctx.now, ticket.dueInDays * DAY_MS),
    createdByUserId: ctx.members[0]?.userId ?? null,
    resolvedAt: isResolved ? isoAgo(ctx.now, DAY_MS) : null,
    createdAt,
    updatedAt: isoAgo(ctx.now, 5 * HOUR_MS),
  };
}

export function buildGeoShelfFixture(
  ctx: GeoShelfFixtureContext,
  scope: GeoShelfStoreKey
): GeoShelfSource[] {
  const scopeId = `${scope.organizationId}-${scope.projectId}`;
  return TEMPLATES.map((template) => {
    const engines = ctx.engines.slice(0, template.engineCount);
    const createdAt = isoAgo(ctx.now, template.createdDaysAgo * DAY_MS);
    return {
      id: `shelf-src-${scopeId}-${template.slug}`,
      url: canonicalizeShelfUrl(template.url),
      domain: shelfDomainFromUrl(template.url),
      title: template.title(ctx),
      kind: template.kind,
      ownership: template.ownership,
      origin: template.origin,
      fetchStatus: template.fetchStatus,
      lastFetchedAt:
        template.fetchStatus === "pending" ? null : isoAgo(ctx.now, 2 * DAY_MS),
      citations: {
        windowCount: template.windowCount,
        totalCount: template.totalCount,
        promptCount: template.promptCount,
        engines,
        firstCitedAt:
          template.firstCitedDaysAgo === null
            ? null
            : isoAgo(ctx.now, template.firstCitedDaysAgo * DAY_MS),
        lastCitedAt:
          template.lastCitedHoursAgo === null
            ? null
            : isoAgo(ctx.now, template.lastCitedHoursAgo * HOUR_MS),
      },
      placements: buildPlacements(template, ctx),
      opportunity: buildOpportunity(template, ctx, scopeId),
      createdByUserId:
        template.origin === "manual" ? (ctx.members[0]?.userId ?? null) : null,
      createdAt,
      updatedAt: isoAgo(ctx.now, 5 * HOUR_MS),
    };
  });
}
