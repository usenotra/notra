import { gateway } from "@notra/ai/gateway";
import { withGatewayAutomaticCaching } from "@notra/ai/provider-options";
import { buildExperimentalTelemetry } from "@notra/ai/utils/tcc";
import { db } from "@notra/db/drizzle";
import {
  brandReferences,
  brandSettings,
  connectedSocialAccounts,
  githubIntegrations,
  linearIntegrations,
  members,
  organizations,
  posts,
} from "@notra/db/schema";
import {
  commandPaletteNavigateRequestSchema,
  commandPaletteNavigateResultSchema,
} from "@notra/schemas/dashboard/command-palette";
import { generateObject } from "ai";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { createRequestLogger } from "evlog";
import { type NextRequest, NextResponse } from "next/server";

import { commandRoutesForAI } from "@/components/command-palette/registry";
import { getServerSession } from "@/lib/auth/session";
import { hasAiCreditsGrant } from "@/lib/billing/subscription";
import { getClientIp, ratelimit } from "@/utils/ratelimit";

export const maxDuration = 15;

const LIKE_ESCAPE_PATTERN = /[\\%_]/g;

function toLikePattern(input: string): string {
  return `%${input.replace(LIKE_ESCAPE_PATTERN, (char) => `\\${char}`)}%`;
}

async function fetchEntityContext(
  organizationId: string,
  query: string,
  slug: string
) {
  const pattern = toLikePattern(query);
  const limit = 3;

  const [
    postRows,
    voiceRows,
    referenceRows,
    githubRows,
    linearRows,
    socialRows,
  ] = await Promise.all([
    db
      .select({ id: posts.id, title: posts.title, status: posts.status })
      .from(posts)
      .where(
        and(
          eq(posts.organizationId, organizationId),
          or(ilike(posts.title, pattern), ilike(posts.slug, pattern))
        )
      )
      .orderBy(desc(posts.updatedAt))
      .limit(limit),
    db
      .select({
        id: brandSettings.id,
        name: brandSettings.name,
        companyName: brandSettings.companyName,
        websiteUrl: brandSettings.websiteUrl,
      })
      .from(brandSettings)
      .where(
        and(
          eq(brandSettings.organizationId, organizationId),
          or(
            ilike(brandSettings.name, pattern),
            ilike(brandSettings.companyName, pattern),
            ilike(brandSettings.websiteUrl, pattern)
          )
        )
      )
      .orderBy(desc(brandSettings.updatedAt))
      .limit(limit),
    db
      .select({
        id: brandReferences.id,
        content: brandReferences.content,
        note: brandReferences.note,
        type: brandReferences.type,
      })
      .from(brandReferences)
      .innerJoin(
        brandSettings,
        eq(brandReferences.brandSettingsId, brandSettings.id)
      )
      .where(
        and(
          eq(brandSettings.organizationId, organizationId),
          or(
            ilike(brandReferences.content, pattern),
            ilike(brandReferences.note, pattern)
          )
        )
      )
      .orderBy(desc(brandReferences.updatedAt))
      .limit(limit),
    db
      .select({
        id: githubIntegrations.id,
        displayName: githubIntegrations.displayName,
        owner: githubIntegrations.owner,
        repo: githubIntegrations.repo,
      })
      .from(githubIntegrations)
      .where(
        and(
          eq(githubIntegrations.organizationId, organizationId),
          or(
            ilike(githubIntegrations.displayName, pattern),
            ilike(githubIntegrations.owner, pattern),
            ilike(githubIntegrations.repo, pattern)
          )
        )
      )
      .limit(limit),
    db
      .select({
        id: linearIntegrations.id,
        displayName: linearIntegrations.displayName,
      })
      .from(linearIntegrations)
      .where(
        and(
          eq(linearIntegrations.organizationId, organizationId),
          ilike(linearIntegrations.displayName, pattern)
        )
      )
      .limit(limit),
    db
      .select({
        id: connectedSocialAccounts.id,
        displayName: connectedSocialAccounts.displayName,
        provider: connectedSocialAccounts.provider,
        username: connectedSocialAccounts.username,
      })
      .from(connectedSocialAccounts)
      .where(
        and(
          eq(connectedSocialAccounts.organizationId, organizationId),
          or(
            ilike(connectedSocialAccounts.username, pattern),
            ilike(connectedSocialAccounts.displayName, pattern)
          )
        )
      )
      .limit(limit),
  ]);

  const entities: { type: string; label: string; path: string }[] = [];

  for (const p of postRows) {
    entities.push({
      type: "post",
      label: `${p.title} (${p.status})`,
      path: `/${slug}/content/${p.id}`,
    });
  }
  for (const v of voiceRows) {
    entities.push({
      type: "voice",
      label: `${v.name}${v.companyName ? ` – ${v.companyName}` : ""}${v.websiteUrl ? ` (${v.websiteUrl})` : ""}`,
      path: `/${slug}/brand/identity`,
    });
  }
  for (const r of referenceRows) {
    const snippet =
      r.content.length > 80 ? `${r.content.slice(0, 80)}…` : r.content;
    entities.push({
      type: "reference",
      label: `${r.type}: ${snippet}`,
      path: `/${slug}/brand/identity`,
    });
  }
  for (const g of githubRows) {
    const repo = g.owner && g.repo ? `${g.owner}/${g.repo}` : "";
    entities.push({
      type: "github_integration",
      label: `${g.displayName}${repo ? ` (${repo})` : ""}`,
      path: `/${slug}/integrations/github/${g.id}`,
    });
  }
  for (const l of linearRows) {
    entities.push({
      type: "linear_integration",
      label: l.displayName,
      path: `/${slug}/integrations/linear/${l.id}`,
    });
  }
  for (const s of socialRows) {
    entities.push({
      type: "social_account",
      label: `${s.displayName} (${s.provider} @${s.username})`,
      path: `/${slug}/integrations`,
    });
  }

  return entities;
}

export async function POST(request: NextRequest) {
  const log = createRequestLogger({
    method: "POST",
    path: "/api/command-palette/navigate",
  });

  const { session, user } = await getServerSession({
    headers: request.headers,
  });

  if (!(session && user)) {
    log.set({ feature: "command_palette", unauthorized: true });
    log.emit();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success, reset } = await ratelimit.commandPaletteNavigate.limit(
    user.id || getClientIp(request)
  );
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", reset },
      { status: 429 }
    );
  }

  const parsed = commandPaletteNavigateRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { query, slug } = parsed.data;

  const membership = await db
    .select({ id: members.id, organizationId: members.organizationId })
    .from(members)
    .innerJoin(organizations, eq(members.organizationId, organizations.id))
    .where(and(eq(organizations.slug, slug), eq(members.userId, user.id)))
    .limit(1);

  const [member] = membership;
  if (!member) {
    log.set({ feature: "command_palette", forbiddenSlug: true });
    log.emit();
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = member.organizationId;
  const [hasAiCredits, entities] = await Promise.all([
    hasAiCreditsGrant(organizationId).catch(() => false),
    fetchEntityContext(organizationId, query, slug),
  ]);
  const routes = commandRoutesForAI(slug, hasAiCredits);

  const allPaths = [
    ...routes.map((r) => r.path),
    ...entities.map((e) => e.path),
  ];

  try {
    const { object } = await generateObject({
      model: gateway("anthropic/claude-sonnet-4.6", {
        organizationId,
      }),
      schema: commandPaletteNavigateResultSchema,
      system: [
        "You are a navigation router for the Notra dashboard command palette.",
        "Given a natural language query, decide whether to navigate to an existing route or fall back to the AI chat.",
        "You receive two lists: static dashboard routes AND matching entities (posts, brand voices, references, integrations) from the user's workspace.",
        "If the query matches an entity (e.g. a brand voice name, a post title, a company name, a website URL), navigate to that entity's path.",
        "If the query matches a static route, navigate there.",
        "Only return `navigate` with a path that EXACTLY matches one of the provided paths.",
        "Prefer entity matches over static routes when relevant.",
        "Only fall back to `chat` if no route or entity confidently matches.",
        "Keep `reason` under 120 characters, plain language, no quotes.",
      ].join(" "),
      prompt: [
        `Dashboard routes: ${JSON.stringify(routes)}`,
        entities.length > 0
          ? `Matching entities: ${JSON.stringify(entities)}`
          : "No matching entities found.",
        `User query: ${query}`,
      ].join("\n"),
      providerOptions: withGatewayAutomaticCaching(undefined, {
        modelId: "anthropic/claude-sonnet-4.6",
      }),
      abortSignal: request.signal,
      experimental_telemetry: buildExperimentalTelemetry({
        feature: "command_palette",
        organizationId,
        routeName: "/api/command-palette/navigate",
        slug,
        userId: user.id,
      }),
    });

    const normalizedPath = object.path ?? null;
    const validPath =
      normalizedPath !== null && allPaths.includes(normalizedPath);

    if (object.action === "navigate" && validPath) {
      return NextResponse.json({
        action: "navigate",
        path: normalizedPath,
        reason: object.reason,
      });
    }

    return NextResponse.json({
      action: "chat",
      path: null,
      reason: object.reason || "No confident route match.",
    });
  } catch (error) {
    log.set({
      feature: "command_palette",
      userId: user.id,
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
    log.emit();
    return NextResponse.json(
      { action: "chat", path: null, reason: "AI unavailable, opening chat." },
      { status: 200 }
    );
  }
}
