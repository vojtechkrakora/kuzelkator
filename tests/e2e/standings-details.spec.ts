import { test, expect } from "@playwright/test";
const competition = { id: 16, name: "2. KLM A", slug: "2-klm-a-2026-2027" };
const row = {
  position: 1,
  matches: 2,
  wins: 1,
  draws: 1,
  losses: 0,
  tablePoints: 3,
  averagePerformance: 3300,
  simpleAveragePerformance: 3368,
  minPerformance: 3357,
  maxPerformance: 3379,
  teamPointsWon: 11,
  teamPointsLost: 5,
  setPointsWon: 30.5,
  setPointsLost: 17.5,
  team: { id: 57, name: "SKK Bohušovice" },
};
for (const width of [320, 390, 1280])
  test(`standings details and views at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const requests: string[] = [];
    await page.route("**/api/data?**", async (route) => {
      const q = new URL(route.request().url()).searchParams;
      let data: unknown = { items: [], total: 0 };
      if (q.get("kind") === "seasons")
        data = {
          items: [{ id: 20, name: "2026/2027", active: true }],
          total: 1,
        };
      if (q.get("kind") === "competitions")
        data = { items: [competition], total: 1 };
      if (q.get("kind") === "standings") {
        const type = q.get("type");
        const previous = q.get("round") === "3";
        requests.push(`${type}:${q.get("round") ?? "latest"}`);
        data = previous
          ? {
              items: type === "AWAY" ? [] : [{ ...row, position: 3 }],
              total: type === "AWAY" ? 0 : 1,
              round: type === "AWAY" ? null : 2,
            }
          : {
              items: [
                {
                  ...row,
                  simpleAveragePerformance: type === "HOME" ? 3400 : 3368,
                },
                {
                  ...row,
                  position: 2,
                  tablePoints: 1,
                  team: { id: 58, name: "SKK Náchod" },
                },
              ],
              total: 2,
              round: 4,
            };
      }
      await route.fulfill({
        json: { data, checkedAt: "2026-10-09T08:00:00Z", stale: false },
      });
    });
    await page.goto("/?competition=16&season=20&date=2026-10-09");
    const table = page.locator(".standings");
    await expect(table).toContainText("Změna pořadí proti 2. kolu · celkem.");
    await expect(table.locator(".standing-movement").first()).toHaveText("↑2");
    await expect(
      table.getByRole("link", { name: "SKK Bohušovice" }),
    ).toHaveAttribute("href", "/?team=57&season=20");
    await table.locator("summary").first().click();
    const details = table.locator("details").first();
    await expect(details).toContainText("3 368");
    await expect(details).toContainText("11 : 5");
    await expect(details).toContainText("30,5 : 17,5");
    await expect(details).toContainText(
      "Náskok před SKK Náchod: 2 tabulkových bodů.",
    );
    await table.getByRole("button", { name: "Doma", exact: true }).click();
    await expect(table).toContainText("Změna pořadí proti 2. kolu · doma.");
    await expect(table.locator("details").first()).not.toHaveAttribute(
      "open",
      "",
    );
    await table.locator("summary").first().click();
    await expect(table.locator("details").first()).toContainText("3 400");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await table
        .locator(".table-scroll")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await table.getByRole("button", { name: "Venku", exact: true }).click();
    await expect(table).toContainText(
      "Předchozí tabulka pro srovnání není dostupná.",
    );
    await expect(table.locator(".standing-movement").first()).toHaveText("—");
    expect(requests).toEqual([
      "ALL:latest",
      "ALL:3",
      "HOME:latest",
      "HOME:3",
      "AWAY:latest",
      "AWAY:3",
    ]);
  });
