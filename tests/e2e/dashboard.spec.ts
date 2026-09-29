import { expect, test, type Page } from "@playwright/test";

const match = {
  id: 640,
  slug: "example",
  date: "2026-09-26",
  time: "14:00",
  round: 3,
  status: "FINISHED",
  discipline: "T120",
  homeTeam: { id: 67, name: "SK Podlužan Prušánky" },
  awayTeam: { id: 64, name: "KK Blansko" },
  competition: { id: 17, name: "2. KLM B", slug: "2-klm-b-2026-2027" },
  results: [
    { isHome: false, teamPoints: 8, totalPerformance: 3522 },
    { isHome: true, teamPoints: 0, totalPerformance: 3334 },
  ],
};
async function mockApi(page: Page, failFirst = false) {
  let failed = false;
  await page.route("**/api/data?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const kind = params.get("kind");
    if (kind === "matches" && failFirst && !failed) {
      failed = true;
      await route.fulfill({
        status: 502,
        json: { error: "Dočasná chyba ČKA" },
      });
      return;
    }
    const items =
      kind === "seasons"
        ? [{ id: 20, name: "2026/2027", active: true }]
        : kind === "competitions"
          ? [match.competition]
          : kind === "matches" || kind === "team-season"
            ? [match]
            : [];
    await route.fulfill({
      json: {
        data: { items, total: items.length },
        checkedAt: "2026-09-28T18:00:00Z",
        stale: false,
      },
    });
  });
}
test("follow, persist, filter by team, and unfollow", async ({ page }) => {
  await mockApi(page);
  await page.goto("/?date=2026-09-26");
  await page
    .getByRole("button", { name: "Sledovat SK Podlužan Prušánky", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "SK Podlužan Prušánky", exact: true }),
  ).toBeVisible();
  const request = page.waitForRequest(
    (request) => new URL(request.url()).searchParams.get("teamId") === "67",
  );
  await page
    .getByRole("button", { name: "SK Podlužan Prušánky", exact: true })
    .click();
  await request;
  await expect(page).toHaveURL(/team=67/);
  await page
    .getByRole("button", {
      name: "Přestat sledovat SK Podlužan Prušánky",
      exact: true,
    })
    .first()
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Sledovat SK Podlužan Prušánky",
      exact: true,
    }),
  ).toBeVisible();
});
test("competition filtering requests official standings", async ({ page }) => {
  await mockApi(page);
  await page.goto("/?date=2026-09-26");
  await page.locator("#competitions summary").click();
  await expect(page.getByRole("button", { name: /2. KLM B/ })).toBeVisible();
  const request = page.waitForRequest(
    (request) =>
      new URL(request.url()).searchParams.get("kind") === "standings",
  );
  await page.getByRole("button", { name: /2. KLM B/ }).click();
  await request;
  await expect(page).toHaveURL(/competition=17/);
  await expect(
    page.getByText(
      "Pro toto kolo ani předchozí kola zatím není tabulka zveřejněna.",
      {
        exact: false,
      },
    ),
  ).toBeVisible();
});
test("upstream error is recoverable without a blank page", async ({ page }) => {
  await mockApi(page, true);
  await page.goto("/?date=2026-09-26");
  await expect(page.locator('.notice[role="alert"]')).toContainText(
    "Dočasná chyba ČKA",
  );
  await page.getByRole("button", { name: "Zkusit znovu" }).click();
  await expect(
    page.getByRole("link", {
      name: "Detail zápasu SK Podlužan Prušánky – KK Blansko",
    }),
  ).toBeVisible();
  await expect(page.locator('.notice[role="alert"]')).toHaveCount(0);
});
test("mobile scores fit the viewport and preserve zero", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto("/?date=2026-09-26");
  await expect(page.locator(".team-score").first()).toHaveText("0");
  await expect(page.locator(".team-score").last()).toHaveText("8");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("corrupt preferences do not prevent loading results", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("kuzelkator:preferences:v1", "{broken"),
  );
  await mockApi(page);
  await page.goto("/?date=2026-09-26");
  await expect(page.getByRole("status")).toContainText(
    "Uložené týmy nelze načíst",
  );
  await expect(
    page.getByRole("link", {
      name: "Detail zápasu SK Podlužan Prušánky – KK Blansko",
    }),
  ).toBeVisible();
});

for (const width of [320, 390, 430]) {
  test(`phone ${width}px: readable controls, reachable navigation and favourites`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await mockApi(page);
    await page.goto("/?date=2026-09-26");
    const follow = page.getByRole("button", {
      name: "Sledovat SK Podlužan Prušánky",
      exact: true,
    });
    await expect(follow).toBeVisible();
    const touchSize = await follow.boundingBox();
    expect(touchSize!.height).toBeGreaterThanOrEqual(44);
    expect(touchSize!.width).toBeGreaterThanOrEqual(44);
    await page.locator("#competitions summary").click();
    for (const name of ["Oblast soutěží", "Sezóna soutěží"]) {
      const select = page.getByRole("combobox", { name, exact: true });
      expect(
        await select.evaluate((el) =>
          parseFloat(getComputedStyle(el).fontSize),
        ),
      ).toBeGreaterThanOrEqual(16);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await follow.click();
    const favorites = page.getByRole("button", {
      name: "Moje týmy",
      exact: false,
    });
    await favorites.click();
    const dialog = page.getByRole("dialog", { name: "Moje týmy" });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: "SK Podlužan Prušánky", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/team=67/);
    await favorites.click();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(favorites).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden",
    );
    await page.getByRole("link", { name: "Soutěže", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Hledat soutěž nebo okres" }),
    ).toBeInViewport();
  });
}

test("phone league discovery remembers an area and respects a linked competition", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await mockApi(page);
  await page.route("**/api/data?kind=competitions**", async (route) => {
    const items = [
      {
        id: 68,
        name: "OP Tábor",
        slug: "op-tabor",
        regions: [{ id: 31, name: "Jihočeský kraj" }],
      },
      {
        id: 13,
        name: "Divize Jih",
        slug: "divize-jih",
        regions: [
          { id: 31, name: "Jihočeský kraj" },
          { id: 63, name: "Kraj Vysočina" },
        ],
      },
      {
        id: 39,
        name: "Jihomoravská divize",
        slug: "jmk",
        regions: [{ id: 64, name: "Jihomoravský kraj" }],
      },
    ];
    await route.fulfill({
      json: {
        data: { items, total: items.length },
        checkedAt: "2026-09-28T18:00:00Z",
        stale: false,
      },
    });
  });
  await page.goto("/?date=2026-09-26");
  await page.getByRole("link", { name: "Soutěže", exact: true }).click();
  await page.getByLabel("Oblast soutěží").selectOption("31");
  await expect(page.getByRole("button", { name: /OP Tábor/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Divize Jih/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Jihomoravská divize/ }),
  ).toHaveCount(0);
  await page.getByLabel("Hledat soutěž nebo okres").fill("tabor");
  await expect(page.getByRole("button", { name: /Divize Jih/ })).toHaveCount(0);
  await page.getByRole("button", { name: /OP Tábor/ }).click();
  await expect(page).toHaveURL(/competition=68/);
  await page.reload();
  await page.locator("#competitions summary").click();
  await expect(page.getByLabel("Oblast soutěží")).toHaveValue("31");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/?date=2026-09-26&competition=39");
  await expect(page.locator("#competitions summary")).toContainText(
    "Jihomoravská divize",
  );
  await expect(page).toHaveURL(/competition=39/);
});

test("standings label an earlier available table and show its teams", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("**/api/data?kind=standings**", async (route) => {
    await route.fulfill({
      json: {
        checkedAt: "2026-09-28T18:00:00Z",
        stale: false,
        data: {
          round: 2,
          total: 1,
          items: [
            {
              position: 1,
              team: { id: 101, name: "TJ Tábor" },
              matches: 2,
              wins: 1,
              draws: 0,
              losses: 1,
              tablePoints: 2,
              averagePerformance: 3200,
            },
          ],
        },
      },
    });
  });
  await page.goto("/?date=2026-09-26&competition=17");
  await expect(page.getByLabel("Kolo tabulky")).toHaveValue("3");
  await expect(
    page.getByText(
      "Pro 3. kolo tabulka zatím není zveřejněna. Zobrazujeme poslední dostupnou tabulku po 2. kole.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveAccessibleName(
    "Tabulka 2. KLM B, 2. kolo",
  );
  await expect(page.getByRole("table")).toContainText("TJ Tábor");
});

test("favourite team shows the whole season with results, pins and future fixtures on phones", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await mockApi(page);
  await page.route("**/api/data?kind=team-season**", async (route) => {
    expect(new URL(route.request().url()).searchParams.get("seasonId")).toBe(
      "20",
    );
    const future = {
      ...match,
      id: 641,
      date: "2027-04-17",
      round: 22,
      status: "SCHEDULED",
      results: [{ isHome: true, teamPoints: 0, totalPerformance: 0 }],
    };
    await route.fulfill({
      json: {
        data: { items: [match, future], total: 2 },
        checkedAt: "2026-09-28T18:00:00Z",
        stale: false,
      },
    });
  });
  await page.goto("/?date=2026-09-26");
  await page
    .getByRole("button", { name: "Sledovat SK Podlužan Prušánky", exact: true })
    .click();
  await page.getByRole("button", { name: "Moje týmy", exact: false }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "SK Podlužan Prušánky", exact: true })
    .click();
  const table = page.locator(".season-matches");
  await expect(table).toBeVisible();
  await expect(table.locator("tbody")).toHaveCount(2);
  await expect(
    table.locator("tbody").first().locator(".season-score").first(),
  ).toHaveText("0");
  await expect(table.locator("tbody").first()).toContainText("3334");
  await expect(table.locator("tbody").first()).toContainText("3522");
  await expect(table.locator("tbody").last()).toContainText("17. 4. 2027");
  await expect(
    table.locator("tbody").last().locator(".season-score").first(),
  ).toHaveText("—");
  await expect(page.getByLabel("Datum v požadovaném týdnu")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(table.locator("tbody")).toHaveCount(2);
  await page.getByRole("button", { name: "Zrušit filtry" }).click();
  await expect(page.getByLabel("Datum v požadovaném týdnu")).toBeVisible();
});
