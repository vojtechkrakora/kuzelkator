import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/data?**", (route) =>
    route.fulfill({
      json: {
        data: { items: [], total: 0 },
        checkedAt: new Date().toISOString(),
        stale: false,
      },
    }),
  );
  await page.goto("/players");
  await page.getByRole("button", { name: "Oblíbené", exact: false }).click();
  await expect(page.getByRole("dialog", { name: "Oblíbené" })).toBeVisible();
});

test("closing favourites releases scrolling synchronously before the queued close event", async ({
  page,
}) => {
  const overflow = await page.evaluate(() => {
    document
      .querySelector<HTMLButtonElement>('[aria-label="Zavřít oblíbené"]')!
      .click();
    return {
      open: document.querySelector<HTMLDialogElement>(".favorites-sheet")!.open,
      overflow: document.body.style.overflow,
    };
  });
  expect(overflow).toEqual({ open: false, overflow: "" });
});

test("a delayed close event cannot unlock a newly reopened favourites dialog", async ({
  page,
}) => {
  const state = await page.evaluate(
    () =>
      new Promise<{ open: boolean; overflow: string }>((resolve) => {
        const dialog =
          document.querySelector<HTMLDialogElement>(".favorites-sheet")!;
        dialog.addEventListener(
          "close",
          () =>
            queueMicrotask(() =>
              resolve({
                open: dialog.open,
                overflow: document.body.style.overflow,
              }),
            ),
          { once: true },
        );
        document
          .querySelector<HTMLButtonElement>('[aria-label="Zavřít oblíbené"]')!
          .click();
        document
          .querySelector<HTMLButtonElement>(
            '.mobile-navigation button[aria-haspopup="dialog"]',
          )!
          .click();
      }),
  );
  expect(state).toEqual({ open: true, overflow: "hidden" });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Oblíbené" }),
  ).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("Escape, backdrop and desktop resize restore the original overflow value", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Zavřít oblíbené" }).click();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("");
  await page.evaluate(() => {
    document.body.style.overflow = "auto";
  });
  const trigger = page.getByRole("button", { name: "Oblíbené", exact: false });
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Oblíbené" }),
  ).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("auto");
  await trigger.click();
  const backdrop = await page.evaluate(() => {
    document.querySelector<HTMLDialogElement>(".favorites-sheet")!.click();
    return document.body.style.overflow;
  });
  expect(backdrop).toBe("auto");
  await trigger.click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(
    page.getByRole("dialog", { name: "Oblíbené" }),
  ).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("auto");
});
