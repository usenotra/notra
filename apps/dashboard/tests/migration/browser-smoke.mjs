import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { FIXTURE } from "./constants/parity.mjs";
import { parityTarget } from "./utils/parity-target.mjs";

const [target, profile, artifactDirectory] = process.argv.slice(2);
const base = parityTarget(target);
assert.ok(["production-anonymous", "development-fixture"].includes(profile));
const artifacts = resolve(artifactDirectory);
mkdirSync(dirname(artifacts), { recursive: true });
mkdirSync(artifacts);
const { chromium } = await import(
  pathToFileURL(
    resolve(".hoplite/playwright/node_modules/playwright/index.mjs")
  ).href
);
const browser = await chromium.launch({ headless: true });
const reducedMotion =
  process.env.MIGRATION_REDUCED_MOTION === "1" ? "reduce" : "no-preference";
const context = await browser.newContext({
  baseURL: base,
  reducedMotion,
  viewport: { width: 1440, height: 1000 },
  serviceWorkers: "block",
});
const blocked = new Set();
await context.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== base && !["data:", "blob:"].includes(url.protocol)) {
    blocked.add(`${url.protocol}//${url.host}`);
    await route.abort("blockedbyclient");
    return;
  }
  await route.continue();
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const results = [];
try {
  if (profile === "production-anonymous") {
    for (const locale of ["en", "de"]) {
      await context.clearCookies();
      await context.setExtraHTTPHeaders({ "accept-language": locale });
      const response = await page.goto("/login");
      assert.equal(response?.status(), 200);
      await page.locator('input[type="email"]').waitFor({ state: "visible" });
      assert.equal(await page.locator("html").getAttribute("lang"), locale);
      assert.ok(await page.locator('input[type="password"]').isVisible());
      await page.screenshot({
        path: resolve(artifacts, `login-${locale}.png`),
        fullPage: true,
      });
      results.push({ check: `login-render-${locale}`, passed: true });
    }
    await context.addCookies([
      { name: "notra_locale", value: "en", url: base },
    ]);
    await page.goto("/login");
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    results.push({
      check: "locale-cookie-overrides-german-header",
      passed: true,
    });
    await page.goto(`/${FIXTURE.slug}/integrations`);
    await page.waitForURL((url) => url.pathname === "/login");
    assert.ok(
      new URL(page.url()).searchParams
        .get("returnTo")
        ?.startsWith(`/${FIXTURE.slug}`)
    );
    results.push({ check: "anonymous-protected-redirect", passed: true });
    const session = await context.request.get(`${base}/api/session`, {
      maxRedirects: 0,
    });
    assert.equal(session.status(), 200);
    assert.equal(await session.json(), null);
    results.push({ check: "production-session-is-anonymous", passed: true });
  } else {
    const session = await context.request.get(`${base}/api/session`, {
      maxRedirects: 0,
    });
    assert.equal(session.status(), 200);
    assert.equal((await session.json()).user.id, FIXTURE.userId);
    results.push({ check: "real-seeded-development-identity", passed: true });
    const ownedResponse = await context.request.post(
      `${base}/rpc/user/organizations/listOwned`,
      {
        data: { json: null },
        maxRedirects: 0,
      }
    );
    assert.equal(ownedResponse.status(), 200);
    const owned = await ownedResponse.json();
    assert.deepEqual(
      owned.json.ownedOrganizations.map((organization) => organization.slug),
      [FIXTURE.slug]
    );
    results.push({
      check: "real-rpc-owned-organizations-excludes-other-tenant",
      passed: true,
    });
    await page.goto(`/${FIXTURE.slug}/integrations/framer`);
    await page
      .getByRole("heading", { name: "Framer setup", exact: true })
      .waitFor({ state: "visible" });
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.screenshot({
      path: resolve(artifacts, "framer-direct.png"),
      fullPage: true,
    });
    results.push({ check: "framer-direct-full-page", passed: true });
    await page.goto(`/${FIXTURE.slug}/integrations`);
    const framerLink = page
      .locator(`a[href="/${FIXTURE.slug}/integrations/framer"]`)
      .first();
    await framerLink.waitFor({ state: "visible" });
    await page.waitForFunction((href) => {
      const link = document.querySelector(`a[href="${href}"]`);
      return (
        link !== null &&
        Object.getOwnPropertyNames(link).some(
          (key) =>
            key.startsWith("__reactProps") &&
            typeof link[key]?.onClick === "function"
        )
      );
    }, `/${FIXTURE.slug}/integrations/framer`);
    results.push({
      check: "framer-link-react-click-handler-ready",
      passed: true,
    });
    await page.evaluate(() => {
      window.__migrationNavigationToken = "same-document";
    });
    await framerLink.click();
    await page.waitForURL(`**/${FIXTURE.slug}/integrations/framer`);
    await page.getByRole("dialog").waitFor({ state: "visible" });
    assert.equal(
      await page.evaluate(() => window.__migrationNavigationToken),
      "same-document"
    );
    await page.screenshot({
      path: resolve(artifacts, "framer-soft-modal.png"),
      fullPage: true,
    });
    results.push({
      check: "framer-soft-client-navigation-modal",
      passed: true,
    });
    await page.keyboard.press("Escape");
    await page.waitForURL(`**/${FIXTURE.slug}/integrations`);
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    results.push({ check: "modal-close-restores-background", passed: true });
    for (const [path, heading] of [
      ["content", "Content"],
      ["skills", "Skills"],
    ]) {
      const response = await page.goto(`/${FIXTURE.slug}/${path}`);
      assert.equal(response?.status(), 200);
      await page
        .getByRole("heading", { name: heading, exact: true })
        .waitFor({ state: "visible" });
      await page.screenshot({
        path: resolve(artifacts, `${path}.png`),
        fullPage: true,
      });
      results.push({ check: `${path}-loader-and-hydrated-page`, passed: true });
    }
    await page.goto(`/${FIXTURE.slug}/settings/general`);
    await page.waitForURL(
      (url) => url.searchParams.get("settings") === "general"
    );
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page
      .locator('input[value="Migration Test Workspace"]')
      .waitFor({ state: "visible" });
    await page.screenshot({
      path: resolve(artifacts, "general-settings.png"),
      fullPage: true,
    });
    results.push({
      check: "legacy-settings-redirect-opens-populated-modal",
      passed: true,
    });
    await page.goto(`/${FIXTURE.otherSlug}/integrations`);
    assert.equal(
      await page
        .getByRole("heading", {
          name: "Migration Other Workspace",
          exact: true,
        })
        .count(),
      0
    );
    assert.ok(
      await page
        .getByText(/not found|couldn.t find|does not exist/i)
        .first()
        .isVisible()
    );
    results.push({ check: "cross-tenant-page-denied", passed: true });
    const spoofed = await context.request.get(`${base}/api/session`, {
      maxRedirects: 0,
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    assert.equal(spoofed.status(), 403);
    const blockedBody = await spoofed.text();
    assert.equal(blockedBody.includes(FIXTURE.userId), false);
    assert.equal(blockedBody.includes(FIXTURE.email), false);
    results.push({
      check: "forwarded-public-development-identity-denied",
      passed: true,
    });
  }
  assert.deepEqual(errors, []);
  results.push({ check: "no-uncaught-browser-errors", passed: true });
} catch (error) {
  results.push({
    check: "browser-sequence",
    passed: false,
    error: String(error),
  });
  await page
    .screenshot({ path: resolve(artifacts, "failure.png"), fullPage: true })
    .catch(() => undefined);
} finally {
  writeFileSync(
    resolve(artifacts, "results.json"),
    JSON.stringify(
      {
        base,
        profile,
        reducedMotion,
        results,
        browserErrors: errors,
        blockedExternalOrigins: [...blocked],
      },
      null,
      2
    ),
    { flag: "wx" }
  );
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
process.exitCode = results.every((result) => result.passed) ? 0 : 1;
