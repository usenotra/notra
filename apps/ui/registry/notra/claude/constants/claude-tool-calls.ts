import type { ClaudeStepItem } from "../types/claude";

export const CLAUDE_TOOL_CALLS_INTRO =
  "I'll load the Executor tools for PlanetScale and search the web for PostgreSQL best practices in parallel.";

export const CLAUDE_TOOL_CALLS_ANSWER =
  "I've reviewed the web search and the PlanetScale docs through Executor. Here are the best practices, grouped by topic.";

const SEARCH_CODE = `const { items } = await tools.search({
  namespace: "planetscale",
  query: "postgres best practices",
  limit: 5,
});
return items.map((item) => item.path);`;

export const CLAUDE_TOOL_CALLS_ITEMS: ClaudeStepItem[] = [
  { detail: "Executor", label: "Loaded", tool: "Executor", type: "tool" },
  {
    count: 10,
    detail: "PostgreSQL best practices 2026",
    label: "Searched the web",
    results: [
      { domain: "www.postgresql.org", title: "PostgreSQL: Documentation" },
      { domain: "planetscale.com", title: "Postgres best practices" },
      { domain: "en.wikipedia.org", title: "PostgreSQL" },
    ],
    type: "tool",
  },
  {
    code: 'await tools.skills.execute({ name: "postgres" });',
    detail: "execute",
    label: "Used Executor: Skills",
    type: "tool",
  },
  {
    code: SEARCH_CODE,
    detail:
      'const { items } = await tools.search({ namespace: "planetscale", query: "postgres best practices" })',
    label: "Used Executor: Execute",
    type: "tool",
  },
  {
    text: "Researching PlanetScale documentation for the requested details.",
    type: "thought",
  },
];
