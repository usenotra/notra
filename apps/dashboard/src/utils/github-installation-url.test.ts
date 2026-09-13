import { expect, test } from "bun:test";

import { getGitHubInstallationPermissionsUrl } from "./github-installation-url";

test("builds a personal GitHub App installation settings URL", () => {
  expect(
    getGitHubInstallationPermissionsUrl({
      installationId: "141944594",
      accountType: "User",
      accountLogin: "jan",
    })
  ).toBe("https://github.com/settings/installations/141944594");
});

test("builds an organization GitHub App installation settings URL", () => {
  expect(
    getGitHubInstallationPermissionsUrl({
      installationId: "141944594",
      accountType: "Organization",
      accountLogin: "Notra Labs",
    })
  ).toBe(
    "https://github.com/organizations/Notra%20Labs/settings/installations/141944594"
  );
});

test("rejects an invalid GitHub App installation ID", () => {
  expect(
    getGitHubInstallationPermissionsUrl({ installationId: "not-an-id" })
  ).toBeUndefined();
});
