import { test, expect, type Page } from "@playwright/test";
const fixture = (status = "IN_PROGRESS") => ({
  id: 513,
  slug: "test",
  date: "2026-10-12",
  time: "12:00",
  round: 5,
  status,
  homeTeam: { id: 1, name: "TJ Domácí tým" },
  awayTeam: { id: 2, name: "SK Hostující tým" },
  results: [true, false].map((isHome) => ({
    isHome,
    teamPoints: isHome ? 2 : 1,
    totalPerformance: isHome ? 1234 : 1200,
    playerResults: Array.from({ length: 6 }, (_, i) => ({
      position: i + 1,
      player: {
        id: i + (isHome ? 1 : 10),
        firstName: isHome ? "Jan" : "Petr",
        lastName: `Hráč ${i + 1}`,
      },
      ...(i === 0 && isHome
        ? {
            substitute: {
              id: 42,
              firstName: "Miroslav",
              lastName: "Náhradník",
            },
            substituteAtThrow: 61,
          }
        : {}),
      totalPerformance: 300,
      setPoints: 1.5,
      laneResults: [
        { laneNumber: 1, total: isHome ? 150 : 140, setPoints: isHome ? 1 : 0 },
        { laneNumber: 2, total: 150, setPoints: 0.5 },
      ],
    })).reverse(),
  })),
});
async function mock(page: Page, status = "IN_PROGRESS") {
  await page.route("**/api/data?kind=match&**", (route) =>
    route.fulfill({
      json: {
        data: fixture(status),
        checkedAt: new Date().toISOString(),
        stale: false,
      },
    }),
  );
}
for (const panel of ["home", "away", "score"])
  test(`OBS ${panel}: transparent independent source with no application chrome`, async ({
    page,
  }) => {
    await page.setViewportSize(
      panel === "score"
        ? { width: 1920, height: 120 }
        : { width: 360, height: 960 },
    );
    await mock(page);
    await page.goto(`/matches/513/overlay?panel=${panel}&density=full`);
    await expect(page.locator(".obs-panel")).toContainText(
      panel === "away" ? "SK Hostující tým" : "TJ Domácí tým",
    );
    await expect(page.locator(".site-header")).not.toBeVisible();
    await expect(page.locator(".footer")).not.toBeVisible();
    expect(
      await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      ),
    ).toBe("rgba(0, 0, 0, 0)");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    if (panel !== "score") {
      const cards = page.locator(".obs-player");
      await expect(cards).toHaveCount(6);
      await expect(cards.first()).toContainText("Hráč 1");
      await expect(cards.first()).toContainText(
        panel === "home" ? "Náhradník" : "Petr",
      );
      await expect(cards.first().locator(".obs-lane").nth(2)).toContainText(
        "—",
      );
      await expect(cards.first().locator(".obs-lane-draw")).toHaveCount(1);
      await expect(
        cards
          .first()
          .locator(panel === "home" ? ".obs-lane-win" : ".obs-lane-loss"),
      ).toHaveCount(1);
    }
  });
test("polling updates scores, keeps last good data on failure, then recovers without reloading", async ({
  page,
}) => {
  await page.clock.install();
  let calls = 0;
  let fail = false;
  let points = 2;
  await page.route("**/api/data?kind=match&**", (route) => {
    calls++;
    const data = fixture();
    data.results[0].teamPoints = points;
    return route.fulfill(
      fail
        ? { status: 503, json: { error: "offline" } }
        : { json: { data, checkedAt: new Date().toISOString(), stale: false } },
    );
  });
  await page.goto("/matches/513/overlay?panel=score");
  await expect(page.locator(".obs-score-numbers")).toContainText("2 : 1");
  points = 3;
  await page.clock.fastForward(16000);
  await expect(page.locator(".obs-score-numbers")).toContainText("3 : 1");
  fail = true;
  await page.clock.fastForward(16000);
  await expect(page.locator(".obs-stale")).toContainText("Neaktuální data");
  await expect(page.locator(".obs-score-numbers")).toContainText("3 : 1");
  fail = false;
  points = 4;
  await page.clock.fastForward(31000);
  await expect(page.locator(".obs-score-numbers")).toContainText("4 : 1");
  await expect(page.locator(".obs-stale")).toHaveCount(0);
  expect(calls).toBeGreaterThanOrEqual(4);
});
test("setup works on phones and offers three source URLs without hiding the site header", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mock(page);
  await page.goto("/matches/513/overlay");
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page.locator(".obs-source")).toHaveCount(3);
  await expect(page.getByLabel("Adresa: Domácí")).toHaveValue(
    /panel=home&density=compact$/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("finished match refreshes slowly; initial unavailable match recovers", async ({
  page,
}) => {
  await page.clock.install();
  let calls = 0;
  await page.route("**/api/data?kind=match&**", (route) => {
    calls++;
    return route.fulfill(
      calls === 1
        ? { status: 502, json: { error: "offline" } }
        : {
            json: {
              data: fixture("FINISHED"),
              checkedAt: new Date().toISOString(),
              stale: false,
            },
          },
    );
  });
  await page.goto("/matches/513/overlay?panel=score");
  await expect(page.locator(".obs-loading")).toContainText("Zkoušíme znovu");
  await page.clock.fastForward(31000);
  await expect(page.locator(".obs-score")).toContainText("Dohráno");
  const before = calls;
  await page.clock.fastForward(16000);
  expect(calls).toBe(before);
});

test("incomplete nominations, zero scores and one-sided substitutions preserve aligned slots", async ({
  page,
}) => {
  const data = fixture();
  data.results[0].playerResults = data.results[0].playerResults.filter(
    (p) => p.position !== 2,
  );
  const first = data.results[0].playerResults.find((p) => p.position === 1)!;
  first.player.firstName = "Alexandr";
  first.player.lastName = "Dlouhé České Příjmení";
  first.substitute = {
    id: 42,
    firstName: "Stanislav",
    lastName: "Další Dlouhé Příjmení",
  };
  first.totalPerformance = 0;
  await page.route("**/api/data?kind=match&**", (route) =>
    route.fulfill({
      json: { data, checkedAt: new Date().toISOString(), stale: false },
    }),
  );
  await page.setViewportSize({ width: 240, height: 500 });
  await page.goto("/matches/513/overlay?panel=home");
  await expect(page.locator(".obs-player")).toHaveCount(6);
  await expect(page.locator(".obs-player").nth(1)).toContainText(
    "Čekáme na nominaci",
  );
  await expect(page.locator(".obs-compact-total").first()).toHaveText("0");
  const fits = await page
    .locator(".obs-player-name")
    .first()
    .evaluate((el) => {
      const name = el.querySelector("strong")!.getBoundingClientRect();
      const bounds = el.getBoundingClientRect();
      return name.top >= bounds.top - 1 && name.bottom <= bounds.bottom + 1;
    });
  expect(fits).toBe(true);
});

for (const panel of ["home", "away"])
  test(`compact ${panel} fits six aligned players into 240x500`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 240, height: 500 });
    await mock(page);
    await page.goto(`/matches/513/overlay?panel=${panel}`);
    await expect(page.locator(".obs-player")).toHaveCount(6);
    await expect(page.locator(".obs-compact-total").first()).toHaveText("300");
    await expect(page.locator(".obs-player").first()).toContainText(
      panel === "home" ? "J. Hráč 1 → M. Náhradník" : "P. Hráč 1",
    );
    await expect(page.locator(".obs-player-total").first()).not.toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    expect(
      await page.locator(".obs-player").evaluateAll((rows) =>
        rows.every((row) => {
          const bounds = row.getBoundingClientRect();
          return [
            ...row.querySelectorAll(
              ".obs-player-name strong, .obs-compact-total, .obs-lane",
            ),
          ].every((el) => {
            const box = el.getBoundingClientRect();
            return (
              box.left >= bounds.left &&
              box.right <= bounds.right &&
              box.bottom <= bounds.bottom
            );
          });
        }),
      ),
    ).toBe(true);
  });
test("setup density switch updates source links, dimensions and previews", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/matches/513/overlay");
  await expect(page.getByLabel("Adresa: Domácí")).toHaveValue(
    /density=compact$/,
  );
  await page.getByRole("button", { name: "Plný · 360 × 960" }).click();
  await expect(page.getByLabel("Adresa: Domácí")).toHaveValue(/density=full$/);
  await expect(page.locator(".obs-density-full")).toHaveCount(2);
  await page.getByRole("button", { name: "Kompaktní · 240 × 500" }).click();
  await expect(page.locator(".obs-density-compact")).toHaveCount(2);
  await expect(page.getByLabel("Adresa: Skóre")).toHaveValue(/panel=score$/);
});

for (const density of ["compact", "full"]) {
  test(`OBS T100 shows two lanes for both teams (${density})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 240, height: 960 });
    await page.route("**/api/data?kind=match&**", (route) =>
      route.fulfill({
        json: {
          data: { ...fixture(), discipline: "T100" },
          checkedAt: new Date().toISOString(),
          stale: false,
        },
      }),
    );
    for (const panel of ["home", "away"]) {
      await page.goto(`/matches/513/overlay?panel=${panel}&density=${density}`);
      const cards = page.locator(".obs-player");
      await expect(cards).toHaveCount(6);
      for (const card of await cards.all())
        await expect(card.locator(".obs-lane")).toHaveCount(2);
      await expect(cards.first().locator(".obs-lane").first()).toContainText(
        panel === "home" ? "150" : "140",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}
