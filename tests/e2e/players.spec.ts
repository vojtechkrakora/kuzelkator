import { expect, test } from "@playwright/test";

for (const failed of [false, true]) {
  test(`player teams join favourite matches without blocking the feed (failure=${failed})`, async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        "kuzelkator:preferences:v1",
        JSON.stringify({
          version: 1,
          teams: [],
          leagues: [],
          players: [{ id: 3130, firstName: "Martin", lastName: "Tesařík" }],
        }),
      ),
    );
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let lookups = 0;
    await page.route("**/api/data?**", async (route) => {
      const q = new URL(route.request().url()).searchParams;
      const kind = q.get("kind");
      let data: unknown = { items: [], total: 0 };
      if (kind === "seasons")
        data = {
          items: [{ id: 20, name: "2026/2027", active: true }],
          total: 1,
        };
      if (kind === "match-days") data = { previous: null, next: null };
      if (kind === "matches")
        data = {
          items: [
            {
              id: 1,
              date: "2026-10-05",
              status: "PLANNED",
              homeTeam: { id: 10, name: "Jiný tým" },
              awayTeam: { id: 11, name: "Hosté" },
              competition: { id: 1, name: "A liga" },
            },
            {
              id: 2,
              date: "2026-10-05",
              status: "PLANNED",
              homeTeam: { id: 67, name: "Prušánky" },
              awayTeam: { id: 12, name: "Soupeř" },
              competition: { id: 2, name: "Z liga" },
            },
          ],
          total: 2,
        };
      if (kind === "player-teams") {
        lookups++;
        expect(q.get("id")).toBe("3130");
        expect(q.get("seasonId")).toBe("20");
        await gate;
        if (failed)
          return route.fulfill({ status: 502, json: { error: "Nedostupné" } });
        data = { teamIds: [67] };
      }
      return route.fulfill({
        json: { data, checkedAt: "2026-10-05T10:00:00Z", stale: false },
      });
    });
    await page.goto("/?date=2026-10-05");
    await expect(page.locator(".match-card")).toHaveCount(2);
    await expect(
      page.getByText("Načítání týmů oblíbených hráčů…"),
    ).toBeVisible();
    release();
    if (failed) {
      await expect(
        page.getByText(
          "Týmy některých oblíbených hráčů se nepodařilo aktualizovat.",
          { exact: false },
        ),
      ).toBeVisible();
      await expect(page.locator(".match-card")).toHaveCount(2);
      return;
    }
    await expect(page.locator(".match-card").first()).toContainText("Prušánky");
    await expect(page.locator(".favourite-match")).toContainText(
      "Tým oblíbeného hráče",
    );
    await page.getByRole("checkbox", { name: "Jen oblíbené" }).check();
    await expect(page.locator(".match-card")).toHaveCount(1);
    await expect(page.locator(".match-card")).toContainText("Prušánky");
    await page.getByRole("checkbox", { name: "Jen oblíbené" }).uncheck();
    await expect(page.locator(".match-card")).toHaveCount(2);
    await page
      .getByRole("button", { name: "Přestat sledovat Martin Tesařík" })
      .click();
    await expect(page.locator(".favourite-match")).toHaveCount(0);
    await expect(
      page.getByRole("checkbox", { name: "Jen oblíbené" }),
    ).toHaveCount(0);
    expect(lookups).toBe(1);
  });
}

test("player search and favourites persist without removing existing teams", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.addInitScript(() => {
    if (!localStorage.getItem("kuzelkator:preferences:v1"))
      localStorage.setItem(
        "kuzelkator:preferences:v1",
        JSON.stringify({
          version: 1,
          teams: [{ id: 67, name: "Prušánky" }],
          leagues: [],
        }),
      );
  });
  await page.route("**/api/data?**", (route) => {
    const q = new URL(route.request().url()).searchParams;
    const data =
      q.get("kind") === "seasons"
        ? { items: [{ id: 20, name: "2026/2027", active: true }], total: 1 }
        : {
            items: [
              {
                id: 3130,
                firstName: "Martin",
                lastName: "Tesařík",
                teams: ["Prušánky"],
              },
            ],
            total: 1,
          };
    return route.fulfill({
      json: { data, checkedAt: "2026-10-05T10:00:00Z", stale: false },
    });
  });
  await page.goto("/players");
  await page.getByLabel("Jméno nebo tým").fill("tesarik");
  await page.getByRole("button", { name: "Hledat hráče", exact: true }).click();
  await expect(page.locator(".player-search-results")).toContainText(
    "Martin Tesařík",
  );
  await page
    .locator(".player-search-results")
    .getByRole("button", { name: "Sledovat hráče Martin Tesařík" })
    .click();
  await expect(page.locator(".favourite-players")).toContainText(
    "Martin Tesařík",
  );
  await page.reload();
  await expect(page.locator(".favourite-players")).toContainText(
    "Martin Tesařík",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kuzelkator:preferences:v1")!),
  );
  expect(saved.teams).toHaveLength(1);
  expect(saved.players).toHaveLength(1);
  await page
    .locator(".favourite-players")
    .getByRole("button", { name: "Přestat sledovat Martin Tesařík" })
    .click();
  await expect(page.locator(".favourite-players li")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
