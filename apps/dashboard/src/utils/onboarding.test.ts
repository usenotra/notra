import { expect, test } from "bun:test";

import { onboardingWorkspaceFormSchema } from "@notra/schemas/dashboard/onboarding/workspace";

import { slugify, slugifyWhileTyping } from "./onboarding";

const WORKSPACE_FORM = {
  name: "OpenAI",
  websiteUrl: "openai.com",
  heardAboutNotraSource: "",
  heardAboutNotraOther: "",
  dailySummary: true,
  marketingEmails: true,
} as const;

test("workspace slug keeps a trailing hyphen while typing", () => {
  expect(slugifyWhileTyping("openai")).toBe("openai");
  expect(slugifyWhileTyping("openai-")).toBe("openai-");
  expect(slugifyWhileTyping("openai-review")).toBe("openai-review");
  expect(slugifyWhileTyping("openai-review-")).toBe("openai-review-");
  expect(slugifyWhileTyping("openai review ")).toBe("openai-review-");
});

test("workspace name and slug both accept two characters", () => {
  const submitted = onboardingWorkspaceFormSchema.parse({
    ...WORKSPACE_FORM,
    name: "AI",
    slug: "ai",
  });
  expect(submitted.name).toBe("AI");
  expect(submitted.slug).toBe("ai");
});

test("workspace slug drops a trailing hyphen on blur and submit", () => {
  const typed = slugifyWhileTyping("openai-review-");
  expect(typed).toBe("openai-review-");
  expect(slugify(typed)).toBe("openai-review");

  const submitted = onboardingWorkspaceFormSchema.parse({
    ...WORKSPACE_FORM,
    slug: typed,
  });
  expect(submitted.slug).toBe("openai-review");
});
