import { expect, test, type Page } from "@playwright/test";
const competition = {
  id: 16,
  name: "2. KLM A",
  slug: "2-klm-a-2026-2027",
  discipline: "T120",
};
const row = (id: number) => ({
  round: 4,
  type: "ALL",
  position: id,
  matches: id === 2 ? 0 : 3,
  averagePerformance: id === 2 ? 0 : 600 - id,
  teamPointsWon: id === 3 ? null : 2,
  player: {
    id,
    firstName: "Jan",
    lastName: id === 30 ? "Krakora" : "Hráč " + id,
  },
  team: { id: 57, name: "Dlouhý název domácího družstva" },
});
async function mock(page: Page, mode: "normal" | "empty" | "error" = "normal") {
  const calls: string[] = [];
  let failed = mode === "error";
  await page.route("**/api/data?**", async (route) => {
    const q = new URL(route.request().url()).searchParams;
    const kind = q.get("kind")!;
    calls.push(kind);
    let data: unknown = { items: [], total: 0 };
    if (kind === "seasons")
      data = { items: [{ id: 20, name: "2026/2027", active: true }], total: 1 };
    if (kind === "competitions") data = { items: [competition], total: 1 };
    if (kind === "competition-documents") data = { attachments: [] };
    if (kind === "competition-player-standings") {
      if (failed)
        return route.fulfill({ status: 502, json: { error: "Výpadek" } });
      const type = q.get("type")!;
      data = {
        items:
          mode === "empty"
            ? []
            : Array.from({ length: 30 }, (_, i) => ({
                ...row(i + 1),
                type,
                averagePerformance:
                  i === 1 ? 0 : type === "HOME" ? 555 : 600 - i - 1,
              })),
        total: mode === "empty" ? 0 : 30,
        round: mode === "empty" ? null : 4,
        latestStartedRound: 5,
      };
    }
    await route.fulfill({
      json: { data, checkedAt: "2026-10-13T08:00:00Z", stale: false },
    });
  });
  return {
    calls,
    recover: () => {
      failed = false;
    },
  };
}
for (const width of [320, 1280])
  test(`official player ranking and favourites at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const { calls } = await mock(page);
    await page.addInitScript(() =>
      localStorage.setItem(
        "kuzelkator:preferences:v1",
        JSON.stringify({
          version: 1,
          teams: [],
          leagues: [],
          players: [{ id: 30, firstName: "Jan", lastName: "Krakora" }],
        }),
      ),
    );
    await page.goto("/?competition=16&season=20");
    await expect(
      page.getByRole("group", { name: "Pořadí v soutěži" }),
    ).toBeVisible();
    expect(calls).not.toContain("competition-player-standings");
    await page
      .getByRole("group", { name: "Pořadí v soutěži" })
      .getByRole("button", { name: "Hráči", exact: true })
      .click();
    const section = page.getByRole("region", {
      name: "Pořadí hráčů v soutěži",
    });
    await expect(section).toContainText("2026/2027 · 120 HS");
    await expect(section).toContainText(
      "Zobrazujeme poslední dostupné 4. kolo",
    );
    await section
      .getByRole("combobox", { name: "Řadit podle" })
      .selectOption("official");
    const rows = section.locator(".competition-player-list > li");
    await expect(rows).toHaveCount(25);
    await expect(rows.nth(1).locator("dd").nth(1)).toHaveText("—");
    await expect(rows.nth(2).locator("dd").nth(2)).toHaveText("—");
    await section
      .getByRole("button", { name: "Zobrazit dalších 5 hráčů" })
      .click();
    await expect(rows).toHaveCount(30);
    await section.getByRole("checkbox", { name: "Jen moji hráči" }).check();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveClass("is-favorite");
    await expect(rows.first().locator(".player-standing-position")).toHaveText(
      "30.",
    );
    await expect(
      section.getByRole("link", { name: "Jan Krakora", exact: true }),
    ).toHaveAttribute("href", "/players/30?season=20");
    await section
      .getByRole("button", { name: "Přestat sledovat Jan Krakora" })
      .click();
    await expect(rows).toHaveCount(0);
    await section.getByRole("checkbox", { name: "Jen moji hráči" }).uncheck();
    await section
      .getByRole("searchbox", { name: "Najít hráče nebo tým" })
      .fill("krakora");
    await expect(rows).toHaveCount(1);
    await section
      .getByRole("group", { name: "Pohled pořadí hráčů" })
      .getByRole("button", { name: "Doma", exact: true })
      .click();
    await expect(rows.first().locator("dd").nth(1)).toHaveText("555");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("group", { name: "Pořadí v soutěži" })
      .getByRole("button", { name: "Družstva" })
      .click();
    await expect(page.locator(".standings")).toBeVisible();
  });
test("empty player ranking and retryable error", async ({ page }) => {
  const state = await mock(page, "error");
  await page.goto("/?competition=16&season=20");
  await page
    .getByRole("group", { name: "Pořadí v soutěži" })
    .getByRole("button", { name: "Hráči", exact: true })
    .click();
  const section = page.getByRole("region", { name: "Pořadí hráčů v soutěži" });
  await expect(
    section.getByRole("button", { name: "Zkusit znovu" }),
  ).toBeVisible();
  state.recover();
  await section.getByRole("button", { name: "Zkusit znovu" }).click();
  await expect(section.locator(".competition-player-list > li")).toHaveCount(
    25,
  );
  await page.unroute("**/api/data?**");
  await mock(page, "empty");
  await page.reload();
  await page
    .getByRole("group", { name: "Pořadí v soutěži" })
    .getByRole("button", { name: "Hráči", exact: true })
    .click();
  await expect(section).toContainText("zatím není zveřejněné");
});

test("average is the default, ranking is preserved through search, and official ordering is optional", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/?competition=16&season=20");
  await page
    .getByRole("group", { name: "Pořadí v soutěži" })
    .getByRole("button", { name: "Hráči", exact: true })
    .click();
  const section = page.getByRole("region", { name: "Pořadí hráčů v soutěži" });
  const sort = section.getByRole("combobox", { name: "Řadit podle" });
  await expect(sort).toHaveValue("average");
  const rows = section.locator(".competition-player-list > li");
  await expect(
    rows.nth(1).getByRole("link", { name: "Jan Hráč 3", exact: true }),
  ).toBeVisible();
  await expect(rows.nth(1).locator(".player-standing-position")).toHaveText(
    "2.",
  );
  await section.getByRole("searchbox").fill("krakora");
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator(".player-standing-position")).toHaveText(
    "29.",
  );
  await sort.selectOption("official");
  await expect(rows.first().locator(".player-standing-position")).toHaveText(
    "30.",
  );
  await sort.selectOption("average");
  await section
    .getByRole("group", { name: "Pohled pořadí hráčů" })
    .getByRole("button", { name: "Doma", exact: true })
    .click();
  await expect(rows.first().locator("dd").nth(1)).toHaveText("555");
  await expect(rows.first().locator(".player-standing-position")).toHaveText(
    "1.",
  );
});
