import { expect, test } from "bun:test";

import { onboardingProgressHrefs } from "./onboarding-progress";

test("visibility can go back to workspace but not skip ahead", () => {
  expect(
    onboardingProgressHrefs({
      current: 2,
      hasOrganization: true,
      hasBrand: true,
      stage: "brand",
    })
  ).toEqual(["/onboarding/workspace", null, null, null]);
});

test("completed onboarding can jump to earlier steps", () => {
  expect(
    onboardingProgressHrefs({
      current: 4,
      hasOrganization: true,
      hasBrand: true,
      stage: "complete",
    })
  ).toEqual([
    "/onboarding/workspace",
    "/onboarding/visibility",
    "/onboarding/competitors",
    null,
  ]);
});
