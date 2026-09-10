import { describe, expect, test } from "bun:test";

import { getStandaloneChatPrompt } from "./standalone-chat";

const BASE_PROMPT_PARAMS = {
  hasGitHubEnabled: false,
  hasLinearEnabled: false,
  hasMcpEnabled: false,
} as const;

describe("getStandaloneChatPrompt workspace", () => {
  test("names the organization and treats the selected project as a default", () => {
    const prompt = getStandaloneChatPrompt({
      ...BASE_PROMPT_PARAMS,
      workspace: {
        organization: {
          id: "org_1",
          name: "Acme",
          slug: "acme",
        },
        project: {
          id: "proj_1",
          name: "Launch",
        },
      },
    });

    expect(prompt).toContain("## Workspace");
    expect(prompt).toContain('organization "Acme" (slug: acme)');
    expect(prompt).toContain(
      'currently selected GEO project is "Launch" (projectId: proj_1)'
    );
    expect(prompt).toContain(
      "Treat this as the default for GEO tools and project-scoped work"
    );
    expect(prompt).toContain("It is not the only project");
  });

  test("strips control characters from workspace labels", () => {
    const prompt = getStandaloneChatPrompt({
      ...BASE_PROMPT_PARAMS,
      workspace: {
        organization: {
          id: "org_1",
          name: "Acme\n Inc",
          slug: "acme\tslug",
        },
        project: null,
      },
    });

    expect(prompt).toContain('organization "Acme Inc" (slug: acmeslug)');
    expect(prompt).toContain("No GEO project is currently selected");
  });
});
