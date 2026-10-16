import { expect, test, type Page } from "@playwright/test";
async function mock(page: Page) {
  await page.route("**/api/data?**", (route) => {
    const q = new URL(route.request().url()).searchParams;
    let data: unknown = { items: [], total: 0 };
    if (q.get("kind") === "seasons")
      data = { items: [{ id: 20, name: "2026/2027", active: true }], total: 1 };
    if (q.get("kind") === "player-statistics")
      data = {
        items: [
          {
            team: { id: 57, name: "Tým A" },
            competition: { id: 16, name: "Soutěž A" },
            matches: 3,
            venuesPlayed: 2,
            teamPointsWon: 2,
            setPointsWon: 4,
            aggregates: [],
          },
          {
            team: { id: 58, name: "Tým B" },
            competition: { id: 17, name: "Soutěž B" },
            matches: 2,
            venuesPlayed: 1,
            teamPointsWon: 1,
            setPointsWon: 2,
            aggregates: [],
          },
        ],
        total: 2,
      };
    return route.fulfill({
      json: { data, checkedAt: new Date().toISOString(), stale: false },
    });
  });
}
async function sharing(
  page: Page,
  mode: "native" | "cancel" | "copy" | "failed",
) {
  await page.addInitScript((mode) => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value:
        mode === "copy" || mode === "failed"
          ? undefined
          : async (data: ShareData) => {
              if (mode === "cancel")
                throw new DOMException("Cancelled", "AbortError");
              (window as unknown as { shared: ShareData }).shared = data;
            },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (url: string) => {
          if (mode === "failed") throw Error("Denied");
          (window as unknown as { copied: string }).copied = url;
        },
      },
    });
  }, mode);
}
test("native sharing preserves date and season without personal favourites", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await mock(page);
  await sharing(page, "native");
  await page.goto("/?date=2026-10-15&season=20&favourites=1");
  const button = page.getByRole("button", {
    name: "Sdílet přehled",
    exact: true,
  });
  await button.click();
  const shared = await page.evaluate(
    () => (window as unknown as { shared: ShareData }).shared,
  );
  expect(shared.url).toContain("date=2026-10-15");
  expect(shared.url).toContain("season=20");
  expect(shared.url).not.toContain("favour");
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("player context copies and opens in a clean browser", async ({
  page,
  browser,
}) => {
  await mock(page);
  await sharing(page, "copy");
  await page.goto("/players/711?season=20&competition=17&team=58");
  const select = page.getByRole("combobox", { name: "Soutěž a tým" });
  await expect(select).toHaveValue("17-58");
  await select.selectOption("16-57");
  await page.getByRole("button", { name: "Sdílet hráče" }).click();
  await expect(page.locator(".share-toast")).toHaveText("Odkaz zkopírován.");
  const url = await page.evaluate(
    () => (window as unknown as { copied: string }).copied,
  );
  expect(url).toContain("competition=16&team=57");
  const context = await browser.newContext();
  try {
    const recipient = await context.newPage();
    await mock(recipient);
    await recipient.goto(url);
    await expect(
      recipient.getByRole("combobox", { name: "Soutěž a tým" }),
    ).toHaveValue("16-57");
    await expect(
      recipient.getByRole("combobox", { name: "Sezóna", exact: true }),
    ).toHaveValue("20");
  } finally {
    await context.close();
  }
});
test("cancelled native dialog does not copy anything", async ({ page }) => {
  await mock(page);
  await sharing(page, "cancel");
  await page.goto("/players/711?season=20");
  await page.getByRole("button", { name: "Sdílet hráče" }).click();
  await expect(
    page.getByRole("button", { name: "Sdílet hráče" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { copied?: string }).copied,
    ),
  ).toBeUndefined();
  await expect(page.locator(".share-toast")).toHaveCount(0);
});
test("clipboard failure offers a selectable link", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await mock(page);
  await sharing(page, "failed");
  await page.goto("/?team=57&season=20");
  await page.getByRole("button", { name: "Sdílet tým" }).click();
  await expect(page.getByLabel("Odkaz ke zkopírování")).toHaveValue(
    /team=57&season=20/,
  );
  await expect(page.locator(".share-status")).toContainText("nepodařilo");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("match sharing uses the match permalink", async ({ page }) => {
  await sharing(page, "copy");
  await page.goto("/matches/513");
  await page.getByRole("button", { name: "Sdílet zápas" }).click();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toMatch(/\/matches\/513$/);
});

test("compact share icon shows a temporary toast above mobile navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await mock(page);
  await sharing(page, "copy");
  await page.goto("/?date=2026-10-15&season=20");
  const button = page.getByRole("button", {
    name: "Sdílet přehled",
    exact: true,
  });
  await expect(button).toBeEnabled();
  const before = await button.boundingBox();
  expect(before!.width).toBe(44);
  expect(before!.height).toBe(44);
  await expect(button).toHaveText("");
  await button.click();
  const toast = page.locator(".share-toast");
  await expect(toast).toBeVisible();
  expect(await button.boundingBox()).toEqual(before);
  const box = await toast.boundingBox();
  const nav = await page.locator(".mobile-navigation").boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(nav!.y);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await expect(toast).toHaveCount(0, { timeout: 4500 });
  await button.click();
  await expect(toast).toBeVisible();
});
