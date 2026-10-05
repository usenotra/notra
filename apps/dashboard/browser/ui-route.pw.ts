import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?test=redirect");
  await expect(
    page.getByRole("heading", { name: "Fixture home" })
  ).toBeVisible();
});

test("follows an access redirect after the gated destination has committed", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open traffic", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Traffic loading" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Expire access" }).click();
  await expect(page).toHaveURL(/\/login\?test=redirect$/);
  await expect(
    page.getByRole("heading", { name: "Redirect destination" })
  ).toBeVisible();
});

test("does not navigate for a failed hover prefetch until that page is opened", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "Prefetch traffic" }).click();
  await expect(page.getByText("Traffic prefetched")).toBeVisible();
  await page.getByRole("button", { name: "Expire access" }).click();
  await expect(
    page.getByRole("heading", { name: "Fixture home" })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/\?test=redirect$/);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Open traffic", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?test=redirect$/);
  await expect(
    page.getByRole("heading", { name: "Redirect destination" })
  ).toBeVisible();
});

test("ignores a late redirect from a destination the user has left", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open traffic", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Traffic loading" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Open other page" }).click();
  await expect(page.getByRole("heading", { name: "Other page" })).toBeVisible();
  await page.getByRole("button", { name: "Expire access" }).click();
  await expect(page.getByRole("heading", { name: "Other page" })).toBeVisible();
  await expect(page).toHaveURL(/\/\?test=redirect$/);
});

test("continues to render deferred success and ordinary errors", async ({
  page,
}) => {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("uncached promise")) {
      warnings.push(message.text());
    }
  });
  await page.getByRole("button", { name: "Open traffic", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Traffic loading" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Resolve data" }).click();
  await expect(
    page.getByRole("heading", { name: "Traffic ready" })
  ).toBeVisible();
  expect(warnings).toEqual([]);
  await page.reload();
  await page.getByRole("button", { name: "Open traffic", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Traffic loading" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Fail data" }).click();
  await expect(
    page.getByRole("heading", { name: "Data loading failed" })
  ).toBeVisible();
});
