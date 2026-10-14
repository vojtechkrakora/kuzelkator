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
  test(`OBS ${panel}: opaque independent source with no application chrome`, async ({
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
    ).toBe("rgb(14, 25, 30)");
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
    /panel=home.*density=compact$/,
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
  await page.getByRole("button", { name: "Plný · 360 × 1320" }).click();
  await expect(page.getByLabel("Adresa: Domácí")).toHaveValue(/density=full$/);
  await expect(page.locator(".obs-density-full")).toHaveCount(2);
  await page.getByRole("button", { name: "Kompaktní · 240 × 720" }).click();
  await expect(page.locator(".obs-density-compact")).toHaveCount(2);
  await expect(page.getByLabel("Adresa: Skóre")).toHaveValue(/panel=score&/);
});

test("OBS configuration persists across matches and height does not change width", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/matches/513/overlay");
  await page.getByLabel("Výška: Domácí", { exact: true }).fill("800");
  await page
    .getByLabel("Mezery hráčů (px): Domácí", { exact: true })
    .fill("12");
  await expect(page.getByLabel("Šířka: Domácí", { exact: true })).toHaveValue(
    "240",
  );
  await expect(page.getByLabel("Adresa: Domácí")).toHaveValue(
    /width=240&height=800&scale=100&gap=12/,
  );
  await page.goto("/matches/514/overlay");
  await expect(page.getByLabel("Výška: Domácí", { exact: true })).toHaveValue(
    "800",
  );
});

test("OBS small source fits all players and paints gaps and unused space", async ({
  page,
}) => {
  await page.setViewportSize({ width: 240, height: 360 });
  await mock(page);
  await page.goto("/matches/513/overlay?panel=home&scale=150&gap=24");
  await expect(page.locator(".obs-player")).toHaveCount(6);
  await expect
    .poll(async () => {
      const last = await page.locator(".obs-freshness").boundingBox();
      return last ? last.y + last.height : Infinity;
    })
    .toBeLessThanOrEqual(361);
  await expect(page.locator(".obs-frame")).toHaveCSS(
    "background-color",
    "rgb(14, 25, 30)",
  );
  await page.setViewportSize({ width: 240, height: 1000 });
  await expect(page.locator(".obs-frame")).toHaveCSS("height", "1000px");
});

for (const density of ["compact", "full"]) {
  test(`OBS four lanes use two rows (${density})`, async ({ page }) => {
    await page.setViewportSize({ width: 240, height: 1320 });
    await mock(page);
    await page.goto(`/matches/513/overlay?panel=home&density=${density}`);
    const lanes = page.locator(".obs-player").first().locator(".obs-lane");
    await expect(lanes).toHaveCount(4);
    const boxes = await lanes.evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width } = element.getBoundingClientRect();
        return { x, y, width };
      }),
    );
    expect(boxes[0].y).toBeCloseTo(boxes[1].y);
    expect(boxes[2].y).toBeCloseTo(boxes[3].y);
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
    expect(boxes[0].x).toBeCloseTo(boxes[2].x);
    expect(boxes[1].x).toBeGreaterThan(boxes[0].x + boxes[0].width);
  });
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
      const positions = await cards
        .first()
        .locator(".obs-lane")
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().y),
        );
      expect(positions[0]).toBeCloseTo(positions[1]);
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

for (const width of [1920, 1280, 390]) {
  test(`OBS score stays centered with unequal names and totals at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1920 ? 120 : 500 });
    const data = fixture();
    data.homeTeam.name = "TJ Dlouhý domácí název družstva";
    data.awayTeam.name = "Hosté";
    data.results[0].teamPoints = 7;
    data.results[1].teamPoints = 1;
    data.results[0].totalPerformance = 1064;
    data.results[1].totalPerformance = 999;
    await page.route("**/api/data?kind=match&**", (route) =>
      route.fulfill({
        json: { data, checkedAt: new Date().toISOString(), stale: false },
      }),
    );
    await page.goto("/matches/513/overlay?panel=score");
    await expect(page.locator(".obs-score-numbers strong")).toHaveText("7 : 1");
    const score = await page.locator(".obs-score-numbers").boundingBox();
    const panel = await page.locator(".obs-score").boundingBox();
    expect(
      Math.abs(score!.x + score!.width / 2 - (panel!.x + panel!.width / 2)),
    ).toBeLessThan(1);
    await expect(page.locator(".obs-pin-difference")).toHaveText("+65");
    await expect(page.locator(".obs-pin-difference")).toHaveClass(
      /obs-pin-home/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1920) expect(panel!.height).toBeLessThanOrEqual(120);
  });
}

test("OBS pin lead follows refreshed results, ties, zeroes and missing totals", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-12T12:00:00Z") });
  let home: number | null = 1000,
    away: number | null = 1065;
  await page.route("**/api/data?kind=match&**", (route) => {
    const data = fixture();
    return route.fulfill({
      json: {
        data: {
          ...data,
          results: data.results.map((result) => ({
            ...result,
            totalPerformance: result.isHome ? home : away,
          })),
        },
        checkedAt: new Date().toISOString(),
        stale: false,
      },
    });
  });
  await page.goto("/matches/513/overlay?panel=score");
  const lead = page.locator(".obs-pin-difference");
  await expect(lead).toHaveText("65+");
  await expect(lead).toHaveClass(/obs-pin-away/);
  await expect(lead).toHaveAttribute("aria-label", "Hosté vedou o 65 kuželek");
  home = 1065;
  await page.clock.fastForward(16000);
  await expect(lead).toHaveText("0");
  await expect(lead).not.toHaveClass(/obs-pin-(home|away)/);
  home = null;
  await page.clock.fastForward(16000);
  await expect(lead).toHaveText("—");
  await expect(lead).toHaveAttribute(
    "aria-label",
    "Rozdíl kuželek není dostupný",
  );
  home = 65;
  away = 0;
  await page.clock.fastForward(16000);
  await expect(lead).toHaveText("+65");
  await expect(lead).toHaveClass(/obs-pin-home/);
});
