import { expect, mock, test } from "bun:test";

const findFirst = mock<() => Promise<{ onboardingDismissed: boolean }>>();
mock.module("@notra/db/drizzle", () => ({
  db: { query: { organizations: { findFirst } } },
}));
mock.module("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

const { redirectIfOnboardingDismissed } = await import("./dismissal");

test("dismissal redirects direct step URLs while preserving the project", async () => {
  findFirst.mockResolvedValue({ onboardingDismissed: true });
  await expect(
    redirectIfOnboardingDismissed("org-1", "acme", "project-1")
  ).rejects.toThrow("REDIRECT:/acme?project=project-1");
});

test("development replay bypasses dismissal", async () => {
  findFirst.mockClear();
  await redirectIfOnboardingDismissed("org-1", "acme", "project-1", true);
  expect(findFirst).not.toHaveBeenCalled();
});

test("active onboarding remains available", async () => {
  findFirst.mockResolvedValue({ onboardingDismissed: false });
  await redirectIfOnboardingDismissed("org-1", "acme");
  expect(findFirst).toHaveBeenCalled();
});
