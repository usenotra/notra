export const areas = [
  ".github",
  "scripts",
  "apps/agent",
  "apps/api",
  "apps/dashboard",
  "apps/docs",
  "apps/onboarding-agent",
  "apps/ui",
  "apps/web",
  "packages/ai",
  "packages/analytics",
  "packages/content-generation",
  "packages/db",
  "packages/email",
  "packages/geo",
  "packages/geo-core",
  "packages/kiwi",
  "packages/posthog",
  "packages/schemas",
  "packages/tools",
  "packages/typescript-config",
  "packages/ui",
  "packages/utils",
];
export const types = ["type/bug", "type/feature", "type/chore"];
export const priorities = ["priority/high", "priority/normal", "priority/low"];
export const labels = [
  ...areas.map((name) => ({
    name,
    color: "1d76db",
    description: `Changes files in ${name}`,
  })),
  ...types.map((name) => ({
    name,
    color: "5319e7",
    description: "PR change classification",
  })),
  ...priorities.map((name) => ({
    name,
    color: "fbca04",
    description: "Suggested review urgency; human overrides take precedence",
  })),
  {
    name: "needs-triage",
    color: "d876e3",
    description: "Automatic triage needs human input",
  },
];
