import { expect, test } from "@playwright/test";
const fixture = (status = "FINISHED") => ({
  id: 513,
  slug: "test",
  date: "2026-10-16",
  time: "16:00",
  round: 4,
  status,
  discipline: "T100",
  competition: { id: 16, name: "Krajský přebor", slug: "prebor" },
  venue: { name: "Kuželna", city: "Tábor" },
  homeTeam: { id: 1, name: "TJ Domácí", club: null },
  awayTeam: { id: 2, name: "TJ Hosté", club: null },
  results: [true, false].map((isHome) => ({
    isHome,
    teamPoints: isHome ? 5.5 : 2.5,
    totalPerformance: isHome ? 3400 : 3350,
    substitutions: [],
    playerResults: Array.from({ length: 6 }, (_, i) => ({
      position: i + 1,
      player: {
        id: i + (isHome ? 1 : 10),
        firstName: isHome ? "Jan" : "Petr",
        lastName: `Hráč ${i + 1}`,
      },
      isEmpty: false,
      substitute:
        i === 0 && isHome
          ? { id: 42, firstName: "Miroslav", lastName: "Náhradník" }
          : null,
      substituteAtThrow: i === 0 && isHome ? 51 : null,
      totalPerformance:
        i === 0 && isHome ? 700 : i === 1 ? 650 : i === 2 ? 0 : 540,
      teamPoints: i === 1 ? 0.5 : isHome ? 1 : 0,
      setPoints: i === 1 ? 1 : isHome ? 2 : 0,
    })).reverse(),
  })),
});
for (const width of [320, 390, 1280])
  test(`social card at ${width}: matching duels, scores and no extra API requests`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    let calls = 0;
    await page.route("**/api/data?**", (route) => {
      calls++;
      return route.fulfill({
        json: {
          data: fixture(),
          checkedAt: "2026-10-16T14:00:00Z",
          stale: false,
        },
      });
    });
    await page.goto("/matches/513/social");
    const card = page.getByRole("article", { name: "Výsledek pro sdílení" });
    await expect(card).toBeVisible();
    await expect(page.locator(".site-header")).toBeHidden();
    await expect(page.locator(".footer")).toBeHidden();
    await expect(card.locator(".social-duel")).toHaveCount(6);
    const first = card.getByRole("region", { name: "Duel 1" });
    await expect(first).toContainText("Jan Hráč 1");
    await expect(first).toContainText("Petr Hráč 1");
    await expect(first).toContainText("Miroslav Náhradník");
    await expect(first).toContainText("společný výkon");
    await expect(card.locator(".social-best")).toHaveCount(2);
    await expect(card.getByRole("region", { name: "Duel 2" })).toContainText(
      "0,5 b.",
    );
    await expect(
      card
        .getByRole("region", { name: "Duel 3" })
        .locator(".social-player-score > strong")
        .first(),
    ).toHaveText("0");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const score = await card.locator(".social-main-score").boundingBox(),
      box = await card.boundingBox();
    expect(
      Math.abs(score!.x + score!.width / 2 - (box!.x + box!.width / 2)),
    ).toBeLessThan(2);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online"));
    });
    expect(calls).toBe(1);
  });
test("live snapshot stays fixed; explicit refresh marks stale results", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/data?**", (route) => {
    calls++;
    return route.fulfill({
      json: {
        data: fixture("IN_PROGRESS"),
        checkedAt: "2026-10-16T14:00:00Z",
        stale: calls > 1,
      },
    });
  });
  await page.goto("/matches/513/social");
  await expect(
    page.getByRole("heading", { name: "Průběžný stav" }),
  ).toBeVisible();
  await expect(page.locator(".social-best")).toHaveCount(0);
  await page.getByRole("button", { name: "Obnovit" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Neaktuální data",
  );
  expect(calls).toBe(2);
});
test("long names and incomplete results remain visible; missing values are not zero", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const data = fixture("FORFEIT");
  data.homeTeam.name = "TJ Dlouhý název týmu z města nad dlouhou řekou";
  data.results[0].playerResults[0].player.lastName =
    "Velmidlouhépříjmeníbezmezer";
  data.results[1].playerResults = [];
  await page.route("**/api/data?**", (route) =>
    route.fulfill({
      json: { data, checkedAt: "2026-10-16T14:00:00Z", stale: false },
    }),
  );
  await page.goto("/matches/513/social");
  await expect(page.getByRole("heading", { name: "Kontumace" })).toBeVisible();
  await expect(page.locator(".social-best")).toHaveCount(0);
  await expect(page.getByText("Výsledek není k dispozici")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("initial failure can be retried without a misleading empty card", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/data?**", (route) =>
    route.fulfill(
      fail
        ? { status: 503, json: { error: "Nedostupné" } }
        : {
            json: {
              data: fixture(),
              checkedAt: "2026-10-16T14:00:00Z",
              stale: false,
            },
          },
    ),
  );
  await page.goto("/matches/513/social");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "nepodařilo načíst",
  );
  fail = false;
  await page.getByRole("button", { name: "Obnovit" }).click();
  await expect(
    page.getByRole("article", { name: "Výsledek pro sdílení" }),
  ).toBeVisible();
});
