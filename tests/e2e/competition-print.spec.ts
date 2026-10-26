import { expect, test, type Page } from "@playwright/test";

const slug = "2-klm-a-2026-2027";
const url = `/competitions/${slug}/print?name=2.+KLM+A&competition=16&season=20&seasonName=2026%2F2027`;
const teamRows = Array.from({ length: 12 }, (_, i) => ({
  position: i + 1,
  team: { id: i + 1, name: `TJ Družstvo ${i + 1}` },
  matches: 6,
  wins: 3,
  draws: 1,
  losses: 2,
  tablePoints: 7,
  teamPointsWon: i === 11 ? null : i === 10 ? 0 : 27.5,
  teamPointsLost: i === 11 ? null : i === 10 ? 0 : 12.5,
  averagePerformance: 3400,
}));
const playerRows = Array.from({ length: 100 }, (_, i) => ({
  player: { id: i + 1, firstName: "Vojtěch", lastName: `Hráč ${i + 1}` },
  team: { id: (i % 12) + 1, name: `TJ Družstvo ${(i % 12) + 1}` },
  position: i + 1,
  round: 4,
  type: "ALL",
  matches: 5,
  averagePerformance: 600 - i / 10,
  venuesPlayed: 3,
  qualification:
    i === 99
      ? null
      : { eligible: i < 75, teamVenuesPlayed: 5, requiredVenues: 3 },
}));
async function mock(
  page: Page,
  options: { failPlayers?: boolean; stale?: boolean } = {},
) {
  const calls: string[] = [];
  let failPlayers = options.failPlayers;
  await page.route("**/api/data?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const kind = params.get("kind")!;
    calls.push(kind);
    if (kind === "competition-player-standings" && failPlayers)
      return route.fulfill({ status: 502, json: { error: "Výpadek" } });
    let data: unknown = { items: [], total: 0 };
    if (kind === "standings")
      data = {
        items: teamRows,
        total: 12,
        isCurrent: true,
        round: 6,
        incompleteMatches: 2,
      };
    if (kind === "competition-player-standings")
      data = { items: playerRows, total: 100, round: 4, latestStartedRound: 6 };
    if (kind === "competitions")
      data = { items: [{ id: 16, name: "2. KLM A", slug }], total: 1 };
    if (kind === "seasons")
      data = { items: [{ id: 20, name: "2026/2027", active: true }], total: 1 };
    await route.fulfill({
      json: { data, checkedAt: "2026-10-26T08:00:00Z", stale: !!options.stale },
    });
  });
  return {
    calls,
    recover: () => {
      failPlayers = false;
    },
  };
}

for (const width of [320, 1280]) {
  test(`competition print modes, all players and print styles at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const { calls } = await mock(page);
    await page.goto("/?competition=16&season=20");
    await page.getByRole("link", { name: "Tisk soutěže" }).click();
    const preview = page.getByRole("article", {
      name: "Náhled tisku soutěže",
    });
    await expect(preview).toContainText("2026/2027");
    await expect(preview.locator(".print-team-table tbody tr")).toHaveCount(12);
    await expect(preview.locator(".print-score").first()).toHaveText(
      "27,5:12,5",
    );
    await expect(preview.locator(".print-score").nth(10)).toHaveText("0:0");
    await expect(preview.locator(".print-score").last()).toHaveText("—");
    await page
      .getByRole("combobox", { name: "Zvýraznit tým a jeho hráče" })
      .selectOption("1");
    await expect(
      preview.locator('.print-team-table tr[data-highlighted="true"]'),
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Vytisknout / uložit PDF" }),
    ).toBeEnabled();
    expect(calls).not.toContain("competition-player-standings");
    await page
      .getByRole("radio", { name: "Tabulku a hráče s průměry" })
      .check();
    await expect(preview.locator(".print-player-table tbody tr")).toHaveCount(
      75,
    );
    await expect(preview).toContainText("75 z 100 hráčů");
    await expect(preview).toContainText("Stav k 4. kolu");
    await expect(
      preview.locator('.print-player-table tr[data-highlighted="true"]'),
    ).toHaveCount(7);
    await page
      .getByRole("combobox", { name: "Hráči", exact: true })
      .selectOption("all");
    await expect(preview.locator(".print-player-table tbody tr")).toHaveCount(
      100,
    );
    await expect(preview).toContainText("Hráč 100");
    await expect(
      preview.locator(".print-player-table tbody tr").last(),
    ).toContainText("?");
    await expect(
      preview.locator(".print-player-table tbody tr").nth(75),
    ).toContainText("–");
    await expect(preview).not.toContainText("†");
    await expect(
      preview.locator('.print-player-table tr[data-highlighted="true"]'),
    ).toHaveCount(9);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.emulateMedia({ media: "print" });
    await expect(
      page.getByRole("heading", { name: "Tisk soutěže", exact: true }),
    ).toBeHidden();
    await expect(page.locator(".site-header")).toBeHidden();
    await expect(page.locator(".footer")).toBeHidden();
    expect(
      await preview
        .locator('.print-team-table tr[data-highlighted="true"] td')
        .first()
        .evaluate((e) => getComputedStyle(e).backgroundColor),
    ).toBe("rgb(225, 241, 231)");
    expect(
      await page
        .locator(".print-player-columns")
        .evaluate((e) => getComputedStyle(e).columnCount),
    ).toBe("2");
    expect(
      await preview
        .locator("tbody tr")
        .first()
        .evaluate((e) => getComputedStyle(e).breakInside),
    ).toBe("avoid");
    await page.emulateMedia({ media: "screen" });
    await page
      .getByRole("combobox", { name: "Zvýraznit tým a jeho hráče" })
      .selectOption("");
    await expect(preview.locator('tr[data-highlighted="true"]')).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Zpět na přehled" }),
    ).toHaveAttribute("href", "/?competition=16&season=20");
  });
}

test("failed player data blocks partial printing and supports recovery or teams only", async ({
  page,
}) => {
  const { recover } = await mock(page, { failPlayers: true, stale: true });
  await page.goto(url);
  const print = page.getByRole("button", { name: "Vytisknout / uložit PDF" });
  await expect(print).toBeEnabled();
  await page.getByRole("radio", { name: "Tabulku a hráče s průměry" }).check();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Pořadí hráčů se nepodařilo načíst",
  );
  await expect(print).toBeDisabled();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("article")).toBeHidden();
  await expect(page.locator(".print-not-ready")).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("radio", { name: "Jen tabulku družstev" }).check();
  await expect(print).toBeEnabled();
  recover();
  await page.getByRole("radio", { name: "Tabulku a hráče s průměry" }).check();
  await page.getByRole("button", { name: "Obnovit data" }).click();
  await expect(print).toBeEnabled();
  await expect(page.getByRole("article")).toContainText("Pozor: uložená data");
});

test("A4 PDF stays compact without dropping players", async ({ page }) => {
  await mock(page);
  await page.goto(url);
  await expect(
    page.getByRole("button", { name: "Vytisknout / uložit PDF" }),
  ).toBeEnabled();
  const pages = (pdf: Buffer) =>
    (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
  const teams = await page.pdf({ preferCSSPageSize: true });
  expect(pages(teams)).toBe(1);
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printCalled = "yes";
    };
  });
  await page.getByRole("button", { name: "Vytisknout / uložit PDF" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-print-called",
    "yes",
  );
  await page.getByRole("radio", { name: "Tabulku a hráče s průměry" }).check();
  await page
    .getByRole("combobox", { name: "Hráči", exact: true })
    .selectOption("all");
  await expect(page.locator(".print-player-table tbody tr")).toHaveCount(100);
  const all = await page.pdf({ preferCSSPageSize: true });
  expect(pages(all)).toBeGreaterThan(0);
  expect(pages(all)).toBeLessThanOrEqual(2);
});
