import {
  ALL_CATEGORY_ID,
  FEATURED_INTEGRATIONS_LIMIT,
} from "@/constants/integrations";
import type {
  Integration,
  IntegrationCategoryFilter,
} from "@/types/integrations";
import { APP_URL } from "@/utils/urls";

const WHITESPACE_REGEX = /\s+/g;

export function getIntegrationSlug(integration: Integration): string {
  return integration.slug ?? integration.id;
}

export function getIntegrationHref(integration: Integration): string {
  return `/integrations/${getIntegrationSlug(integration)}`;
}

export function getIntegrationConnectUrl(integration: Integration): string {
  const slug = integration.slug ?? integration.id;
  return `${APP_URL}/integrations/${encodeURIComponent(slug)}`;
}

function collapseWhitespace(value: string): string {
  return value.replace(WHITESPACE_REGEX, " ").trim();
}

export function getToolDescription(tool: {
  description: string | null;
  title: string | null;
}): string {
  const description = collapseWhitespace(tool.description ?? "");
  if (description) {
    return description;
  }
  return collapseWhitespace(tool.title ?? "");
}

function formatAuthType(authType: string): string {
  if (authType === "oauth") {
    return "OAuth";
  }
  if (authType === "headers") {
    return "API key";
  }
  if (authType === "none") {
    return "None";
  }
  return authType;
}

function formatToolCount(count: number): string {
  return `${count} ${count === 1 ? "tool" : "tools"}`;
}

export function buildAuthorCategoryLine(integration: Integration): string {
  const parts = [integration.author ? `by ${integration.author}` : null];
  if (integration.category) {
    parts.push(integration.category);
  }
  return parts.filter(Boolean).join(" · ");
}

export function buildCardMeta(integration: Integration): string {
  return [
    formatToolCount(integration.indexedToolCount),
    formatAuthType(integration.authType),
  ].join(" · ");
}

export function buildFeaturedMeta(integration: Integration): string {
  return [
    formatToolCount(integration.indexedToolCount),
    formatAuthType(integration.authType),
  ].join(" · ");
}

export function buildQuickViewMetaTail(integration: Integration): string {
  return [
    integration.category,
    formatToolCount(integration.indexedToolCount),
    formatAuthType(integration.authType),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function buildCategoryFilters(
  integrations: Integration[]
): IntegrationCategoryFilter[] {
  const categories: IntegrationCategoryFilter[] = [
    { id: ALL_CATEGORY_ID, label: "All" },
  ];
  const seen = new Set<string>();
  for (const integration of integrations) {
    const category = integration.category;
    if (category && !seen.has(category)) {
      seen.add(category);
      categories.push({ id: category, label: category });
    }
  }
  return categories;
}

export function getFeaturedIntegrations(
  integrations: Integration[]
): Integration[] {
  return integrations
    .filter((integration) => integration.featuredAt !== null)
    .sort((first, second) =>
      (second.featuredAt ?? "").localeCompare(first.featuredAt ?? "")
    )
    .slice(0, FEATURED_INTEGRATIONS_LIMIT);
}

export function buildDetailMetaTail(integration: Integration): string {
  return [integration.category, "Verified publisher"]
    .filter(Boolean)
    .join(" · ");
}

export function buildDetailStats(
  integration: Integration
): { label: string; value: string }[] {
  return [
    { label: "TOOLS", value: `${integration.indexedToolCount} available` },
    { label: "AUTHENTICATION", value: formatAuthType(integration.authType) },
  ];
}

export function filterIntegrations(
  integrations: Integration[],
  query: string,
  categoryId: string
): Integration[] {
  const normalizedQuery = query.trim().toLowerCase();
  return integrations.filter((integration) => {
    if (categoryId !== ALL_CATEGORY_ID && integration.category !== categoryId) {
      return false;
    }
    if (normalizedQuery.length === 0) {
      return true;
    }
    return [integration.name, integration.author, integration.description]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedQuery));
  });
}
