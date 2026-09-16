import {
  MCP_USE_CASE_CATEGORIES,
  MCP_USE_CASES,
  MCP_USE_CASES_ALL_CATEGORY_ID,
  MCP_USE_CASES_PATH,
  MCP_USE_CASES_RELATED_LIMIT,
} from "@/constants/mcp-use-cases";
import type {
  McpUseCase,
  McpUseCaseCategory,
  McpUseCaseCategoryId,
} from "@/types/mcp-use-cases";

export function getMcpUseCaseHref(entry: McpUseCase): string {
  return `${MCP_USE_CASES_PATH}/${entry.slug}`;
}

export function getMcpUseCaseCategory(
  category: McpUseCaseCategoryId
): McpUseCaseCategory {
  const match = MCP_USE_CASE_CATEGORIES.find((entry) => entry.id === category);
  if (!match) {
    throw new Error(`Unknown MCP use case category: ${category}`);
  }
  return match;
}

export function findMcpUseCase(slug: string): McpUseCase | undefined {
  return MCP_USE_CASES.find((entry) => entry.slug === slug);
}

export function filterMcpUseCases(
  useCases: McpUseCase[],
  category: string
): McpUseCase[] {
  if (category === MCP_USE_CASES_ALL_CATEGORY_ID) {
    return useCases;
  }
  return useCases.filter((entry) => entry.category === category);
}

/** Same-category use cases first, then the rest in list order. */
export function getRelatedMcpUseCases(
  currentEntry: McpUseCase,
  limit = MCP_USE_CASES_RELATED_LIMIT
): McpUseCase[] {
  const others = MCP_USE_CASES.filter(
    (entry) => entry.slug !== currentEntry.slug
  );
  const sameCategory = others.filter(
    (entry) => entry.category === currentEntry.category
  );
  const different = others.filter(
    (entry) => entry.category !== currentEntry.category
  );
  return [...sameCategory, ...different].slice(0, limit);
}

export function formatMcpUseCaseToolCount(count: number): string {
  return `${count} MCP ${count === 1 ? "tool" : "tools"}`;
}
