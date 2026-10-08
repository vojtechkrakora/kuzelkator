import { test, expect } from "@playwright/test";
const player = { id: 711, firstName: "Jiří", lastName: "Semerád" };
const competition = { id: 16, name: "2. KLM A", slug: "2-klm-a" };
const total = {
  player,
  type: "TOTAL",
  matches: 3,
  substituteStarts: 0,
  averageResult: 577.33,
  averagePerformance: 586,
  homeAverage: 560,
  awayAverage: 612,
  positionStarts: { "5": 2, "6": 1 },
};
for (const width of [320, 390, 1280])
  test(`team player statistics at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const requests: string[] = [];
    await page.route("**/api/data?**", async (route) => {
      const q = new URL(route.request().url()).searchParams;
      const kind = q.get("kind");
      let data: unknown = { items: [], total: 0 };
      if (kind === "seasons")
        data = {
          items: [
            { id: 20, name: "2026/2027", active: true },
            { id: 19, name: "2025/2026", active: false },
          ],
          total: 2,
        };
      if (kind === "team") data = { id: 57, name: "SKK Bohušovice" };
      if (kind === "team-roster" && q.get("seasonId") === "20")
        data = {
          items: [player],
          total: 1,
          competitions: [
            competition,
            { ...competition, id: 17, name: "Druhá soutěž" },
          ],
        };
      if (kind === "team-player-statistics") {
        expect(q.get("teamId")).toBe("57");
        expect(q.get("seasonId")).toBe("20");
        requests.push(q.get("competitionId")!);
        data =
          q.get("competitionId") === "16"
            ? {
                items: [
                  total,
                  {
                    ...total,
                    type: "ERRORS",
                    averageResult: 0,
                    averagePerformance: 0,
                  },
                  {
                    ...total,
                    type: "FULL",
                    averageResult: null,
                    averagePerformance: null,
                  },
                ],
                total: 3,
              }
            : {
                items: [
                  {
                    ...total,
                    matches: 1,
                    averageResult: 500,
                    averagePerformance: 500,
                  },
                ],
                total: 1,
              };
      }
      await route.fulfill({
        json: { data, checkedAt: "2026-10-08T08:00:00Z", stale: false },
      });
    });
    await page.goto("/?team=57&season=20");
    const roster = page.getByRole("region", { name: "Hráči týmu" });
    await expect(roster).toContainText("nikoli úplná oficiální soupiska");
    await expect(roster.locator(".team-player-summary")).toContainText(
      "577,33",
    );
    await expect(roster.locator(".team-player-summary")).toContainText("586");
    await expect(
      roster.getByRole("link", { name: "Jiří Semerád" }),
    ).toHaveAttribute("href", "/players/711?season=20");
    await roster
      .getByRole("button", { name: "Sledovat hráče Jiří Semerád" })
      .click();
    await expect(
      roster.getByRole("button", { name: "Přestat sledovat Jiří Semerád" }),
    ).toBeVisible();
    await roster.locator("summary").click();
    await expect(roster.getByRole("row", { name: "Chyby 0 0" })).toBeVisible();
    await expect(roster.getByRole("row", { name: "Plné — —" })).toBeVisible();
    await expect(roster).toContainText("5. pozice: 2×");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await roster.getByLabel("Soutěž statistik").selectOption("17");
    await expect(roster.locator(".team-player-summary")).toContainText("500");
    await expect(roster.locator("details")).not.toHaveAttribute("open", "");
    await expect(roster).not.toContainText("577,33");
    expect(requests).toEqual(["16", "17"]);
    await page.goto("/?team=57&season=19");
    await expect(roster).toContainText(
      "V této sezóně zatím nejsou evidovaní hráči týmu.",
    );
    await expect(roster.locator(".team-player-card")).toHaveCount(0);
  });
