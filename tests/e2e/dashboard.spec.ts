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
          : kind === "matches"
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
  await expect(
    page.getByRole("combobox", { name: "Soutěž", exact: true }),
  ).toContainText("2. KLM B");
  const request = page.waitForRequest(
    (request) =>
      new URL(request.url()).searchParams.get("kind") === "standings",
  );
  await page
    .getByRole("combobox", { name: "Soutěž", exact: true })
    .selectOption("17");
  await request;
  await expect(page).toHaveURL(/competition=17/);
  await expect(
    page.getByText("Pro toto kolo zatím není tabulka zveřejněna.", {
      exact: false,
    }),
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
    for (const name of ["Soutěž", "Sezóna soutěží"]) {
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
      page.getByRole("textbox", { name: "Hledat v načtených soutěžích" }),
    ).toBeInViewport();
  });
}
