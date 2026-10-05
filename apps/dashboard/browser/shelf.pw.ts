import { expect, test } from "@playwright/test";

for (const view of ["table", "board"] as const) {
  test(`${view} expands as parent scrolling reveals it, stays bounded and resizes`, async ({
    page,
  }) => {
    await page.goto(`/?view=${view}&partial`);
    const shelf = page.getByTestId("shelf");
    const content =
      view === "table"
        ? shelf.locator('[data-slot="data-table"]').filter({ visible: true })
        : shelf
            .locator("div.flex.gap-3.overflow-x-auto")
            .filter({ visible: true });
    await expect
      .poll(() => content.evaluate((el) => el.clientHeight))
      .toBe(view === "table" ? 120 : 168);
    await page.getByTestId("scrollport").evaluate((el) => {
      el.scrollTop = 200;
    });
    await expect
      .poll(() => content.evaluate((el) => el.clientHeight))
      .toBe(view === "table" ? 344 : 368);
    await page.getByTestId("scrollport").evaluate((el) => {
      el.scrollTop = 900;
    });
    await expect
      .poll(() => content.evaluate((el) => el.clientHeight))
      .toBe(512);
    await page.setViewportSize({ width: 1440, height: 800 });
    await expect
      .poll(() => content.evaluate((el) => el.clientHeight))
      .toBe(view === "table" ? 680 : 712);
    await page.setViewportSize({ width: 1440, height: 500 });
    await expect
      .poll(() => content.evaluate((el) => el.clientHeight))
      .toBe(view === "table" ? 400 : 412);
  });

  test(`${view} responds to window scrolling and caps height at the viewport`, async ({
    page,
  }) => {
    await page.goto(`/?view=${view}&scroll=window&partial`);
    const shelf = page.getByTestId("shelf");
    const content =
      view === "table"
        ? shelf.locator('[data-slot="data-table"]').filter({ visible: true })
        : shelf
            .locator("div.flex.gap-3.overflow-x-auto")
            .filter({ visible: true });
    await expect
      .poll(() => content.evaluate((el) => el.clientHeight))
      .toBe(view === "table" ? 120 : 168);
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect
      .poll(() => content.evaluate((el) => el.clientHeight))
      .toBe(view === "table" ? 344 : 368);
    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect
      .poll(() => content.evaluate((el) => el.clientHeight))
      .toBe(view === "table" ? 568 : 576);
  });

  test(`${view} reserves a usable scroll region when there is no content below the shelf`, async ({
    page,
  }) => {
    await page.goto(`/?view=${view}&no-footer`);
    const shelf = page.getByTestId("shelf");
    const content =
      view === "table"
        ? shelf.locator('[data-slot="data-table"]').filter({ visible: true })
        : shelf
            .locator("div.flex.gap-3.overflow-x-auto")
            .filter({ visible: true });
    await expect
      .poll(() => content.evaluate((el) => el.clientHeight))
      .toBe(512);
    await page.getByTestId("scrollport").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(content).toBeInViewport({ ratio: 1 });
    await expect
      .poll(() => content.evaluate((el) => el.clientHeight))
      .toBe(512);
    await page.setViewportSize({ width: 1440, height: 500 });
    await expect
      .poll(() => content.evaluate((el) => el.clientHeight))
      .toBe(view === "table" ? 400 : 412);
    await expect(content).toBeInViewport({ ratio: 1 });
  });
}

test("the full table stays virtualized and retains its scroll window across board switches", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?compact");
  const table = page
    .getByTestId("shelf")
    .locator('[data-slot="data-table"]')
    .filter({ visible: true });
  await expect(table.getByText("Shelf 0", { exact: true })).toBeVisible();
  await expect.poll(() => table.locator("tbody tr").count()).toBeLessThan(60);
  await table.locator(".scrollbar-floating").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(table.getByText("Shelf 9999", { exact: true })).toBeVisible();
  await expect(table.getByText("Shelf 0", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Switch view", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Shelf 0", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch view", exact: true }).click();
  await expect(table.getByText("Shelf 9999", { exact: true })).toBeVisible();
  await expect.poll(() => table.locator("tbody tr").count()).toBeLessThan(60);
  await table.getByText("Shelf 9999", { exact: true }).click();
  await expect(page.getByRole("status", { name: "Shelf event" })).toHaveText(
    "open:shelf-9999"
  );
});

test("board keeps the actual dragged card mounted outside the virtual window and completes the drop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=board&compact");
  const board = page
    .getByTestId("shelf")
    .locator("div.flex.gap-3.overflow-x-auto")
    .filter({ visible: true });
  const open = board.locator("section").filter({
    has: page.getByRole("heading", { name: "Open", exact: true }),
  });
  const scrollport = open.locator(".overflow-y-auto");
  const card = open.getByRole("button", { name: "Shelf 0", exact: true });
  await expect(card).toBeVisible();
  await expect
    .poll(() => board.locator("[data-index]").count())
    .toBeLessThan(40);
  await scrollport.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(
    open.getByRole("button", { name: "Shelf 9999", exact: true })
  ).toBeVisible();
  await expect(card).toHaveCount(0);
  await scrollport.evaluate((el) => {
    el.scrollTop = 0;
  });
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  if (!box) {
    throw new Error("The source card must be visible before dragging");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2, {
    steps: 4,
  });
  await expect(card).toHaveClass(/cursor-grabbing/);
  await scrollport.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(
    open.getByRole("button", { name: "Shelf 9999", exact: true })
  ).toBeVisible();
  await expect(card).toHaveCount(1);
  await expect(card.locator("[aria-hidden]")).toHaveCount(1);
  await expect
    .poll(() => board.locator("[data-index]").count())
    .toBeLessThan(40);
  const target = await board
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "In progress", exact: true }),
    })
    .boundingBox();
  if (!target) {
    throw new Error("The target column must be visible before dropping");
  }
  await page.mouse.move(target.x + target.width / 2, target.y + 100, {
    steps: 12,
  });
  await expect(
    board
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "In progress", exact: true }),
      })
      .getByRole("button", { name: "Shelf 0", exact: true })
  ).toHaveCount(1);
  await page.mouse.up();
  await expect(page.getByRole("status", { name: "Shelf event" })).toHaveText(
    "move:shelf-0:in_progress"
  );
});
