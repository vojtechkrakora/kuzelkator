import { test, expect } from "@playwright/test";

const team = { id: 57, name: "SKK Bohušovice" };
const competition = {
  id: 16,
  name: "2. KLM A",
  slug: "2-klm-a",
  discipline: "T120",
};
const aggregate = {
  player: { id: 711 },
  type: "TOTAL",
  matches: 3,
  substituteStarts: 0,
  averagePerformance: 586,
  averageResult: 577.33333333,
  homeAverage: 560,
  awayAverage: 612,
  positionStarts: { "5": 2, "6": 1 },
};
const summary = {
  team,
  competition,
  matches: 3,
  venuesPlayed: 2,
  teamPointsWon: 3,
  setPointsWon: 9,
  aggregates: [
    aggregate,
    {
      ...aggregate,
      type: "ERRORS",
      averagePerformance: 1,
      averageResult: 1,
      homeAverage: 1,
      awayAverage: 1,
    },
  ],
};
const history = [550, 612, 570, 999].map((score, i) => ({
  player: { id: 711 },
  position: 5,
  totalPerformance: score,
  totalErrors: 1,
  substitute: i === 3 ? { id: 999 } : null,
  teamMatchResult: {
    isHome: i !== 1,
    team,
    substitutions: [],
    teamMatch: {
      id: 500 + i,
      slug: "fixture",
      status: "FINISHED",
      date: `2026-09-${19 + i}`,
      time: "09:00",
      round: i + 1,
      competition,
      venue: {
        id: i === 1 ? 65 : 80,
        name: i === 1 ? "Lomnice" : "Bohušovice",
      },
    },
  },
}));

for (const width of [320, 390, 1280]) {
  test(`automatic player statistics, graphs and season switching at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let statsRequests = 0;
    await page.route("**/api/data?**", async (route) => {
      const q = new URL(route.request().url()).searchParams;
      let data: unknown = { items: [], total: 0 };
      if (q.get("kind") === "seasons")
        data = {
          items: [
            { id: 20, name: "2026/2027", active: true },
            { id: 19, name: "2025/2026", active: false },
          ],
          total: 2,
        };
      if (q.get("kind") === "player-statistics") {
        statsRequests++;
        if (q.get("seasonId") === "20")
          data = {
            items: [
              summary,
              {
                ...summary,
                team: { id: 58, name: "Jiný tým" },
                competition: { ...competition, id: 99, name: "Jiná soutěž" },
                aggregates: [
                  { ...aggregate, averageResult: 400, averagePerformance: 400 },
                ],
              },
            ],
            total: 2,
          };
      }
      if (q.get("kind") === "player-history" && q.get("seasonId") === "20")
        data = { items: history, total: history.length };
      await route.fulfill({
        json: { data, checkedAt: "2026-10-08T08:00:00Z", stale: false },
      });
    });
    await page.goto("/players/711?season=20");
    const stats = page.getByRole("region", { name: "Statistiky sezóny" });
    await expect(stats.locator(".stats-card-primary")).toContainText("586");
    await expect(stats.locator(".stats-cards")).toContainText("577,33");
    await expect(stats.locator(".stats-match-picker button")).toHaveCount(3);
    await expect(
      stats.getByRole("region", { name: "Průměry na kuželnách" }),
    ).toContainText("560");
    await expect(
      stats.getByRole("region", { name: "Pozice v sestavě" }),
    ).toContainText("5. pozice");
    await stats.locator(".stats-match-picker button").first().click();
    await expect(stats.locator(".stats-active-match")).toHaveAttribute(
      "href",
      "/matches/500",
    );
    await stats.getByRole("button", { name: "Chyby", exact: true }).click();
    await expect(
      stats.locator(".stats-match-picker strong").first(),
    ).toHaveText("1");
    await stats.getByLabel("Soutěž a tým").selectOption("99-58");
    await expect(stats.locator(".stats-card-primary")).toContainText("400");
    await expect(stats.locator(".stats-match-picker button")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".player-season-select select").selectOption("19");
    await expect(stats).toContainText(
      "Pro tuto sezónu zatím nejsou zveřejněné statistiky.",
    );
    await expect(stats.locator(".stats-cards")).toHaveCount(0);
    expect(statsRequests).toBe(2);
  });
}
