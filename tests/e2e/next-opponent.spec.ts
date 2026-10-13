import { test, expect, type Page } from "@playwright/test";
const competition = { id: 16, name: "2. KLM A", slug: "2-klm-a" };
const team = { id: 57, name: "SKK Bohušovice" };
const opponent = { id: 58, name: "TJ Soupeř s dlouhým názvem" };
const upcoming = {
  id: 101,
  slug: "next",
  date: "2099-10-15",
  time: "10:00",
  round: 22,
  status: "SCHEDULED",
  homeTeam: opponent,
  awayTeam: team,
  competition,
  venue: {
    name: "Kuželna soupeře",
    street: "Sportovní 1",
    city: "Tábor",
    gpsLat: 49.4,
    gpsLong: 14.6,
  },
};
async function mock(
  page: Page,
  mode: "normal" | "empty" | "error" = "normal",
  home = false,
) {
  let fail = mode === "error";
  const calls: string[] = [];
  await page.route("**/api/data?**", async (route) => {
    const q = new URL(route.request().url()).searchParams;
    const kind = q.get("kind");
    calls.push(`${kind}:${q.get("teamId")}`);
    let data: unknown = { items: [], total: 0 };
    if (kind === "seasons")
      data = { items: [{ id: 20, name: "2026/2027", active: true }], total: 1 };
    if (kind === "team") data = team;
    if (kind === "team-season") {
      if (q.get("teamId") === "57")
        data = {
          items:
            mode === "empty"
              ? []
              : [
                  {
                    ...upcoming,
                    ...(home ? { homeTeam: team, awayTeam: opponent } : {}),
                  },
                  { ...upcoming, id: 102, date: "2099-10-18", round: 1 },
                  { ...upcoming, id: 103, date: null },
                ],
          total: mode === "empty" ? 0 : 3,
        };
      else
        data = {
          items: [
            {
              ...upcoming,
              id: 201,
              date: "2026-10-01",
              status: "FINISHED",
              results: [
                { isHome: true, teamPoints: 6 },
                { isHome: false, teamPoints: 2 },
              ],
            },
            {
              ...upcoming,
              id: 202,
              date: "2026-10-02",
              status: "FINISHED",
              homeTeam: team,
              awayTeam: opponent,
              results: [
                { isHome: true, teamPoints: 4 },
                { isHome: false, teamPoints: 4 },
              ],
            },
            {
              ...upcoming,
              id: 203,
              date: "2026-10-03",
              status: "FINISHED",
              competition: { ...competition, id: 99 },
              results: [
                { isHome: true, teamPoints: 0 },
                { isHome: false, teamPoints: 8 },
              ],
            },
          ],
          total: 3,
        };
    }
    if (kind === "team-records") {
      expect(q.get("competitionId")).toBe("16");
      expect(q.get("teamId")).toBe("58");
      if (fail)
        return route.fulfill({ status: 502, json: { error: "Výpadek" } });
      data = { homeAveragePerformance: 3250.5, awayAveragePerformance: 3100 };
    }
    await route.fulfill({
      json: { data, stale: false, checkedAt: "2026-10-13T10:00:00Z" },
    });
  });
  return {
    calls,
    recover: () => {
      fail = false;
    },
  };
}
for (const width of [320, 1280])
  test(`next opponent at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    await page.goto("/?team=57&season=20");
    await page.getByRole("tab", { name: "Příští soupeř", exact: true }).click();
    const section = page.getByRole("region", {
      name: "Příští soupeř",
      exact: true,
    });
    await expect(
      section.getByRole("link", { name: opponent.name }),
    ).toHaveAttribute("href", "/?team=58&season=20");
    await expect(
      section.getByRole("link", { name: "Detail zápasu" }),
    ).toHaveAttribute("href", "/matches/101");
    await expect(section).toContainText("Hrajeme venku");
    await expect(section).toContainText("Průměr soupeře doma");
    await expect(section).toContainText("3 250,5");
    await expect(section).toContainText("dohrané zápasy v soutěži: 2");
    await expect(section).toContainText("dohráno doma: 1");
    await expect(
      section
        .getByRole("list", { name: "Posledních až pět zápasů soupeře" })
        .locator("li"),
    ).toHaveCount(2);
    await expect(section).toContainText("bez určeného termínu");
    await expect(
      section.getByRole("link", { name: /Navigovat/ }),
    ).toHaveAttribute("href", /google.com\/maps/);
    expect(
      (await section
        .getByRole("link", { name: "Detail zápasu" })
        .boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("home fixture uses opponent away average; error preserves match and form and supports retry", async ({
  page,
}) => {
  const { recover } = await mock(page, "error", true);
  await page.goto("/?team=57&season=20");
  await page.getByRole("tab", { name: "Příští soupeř", exact: true }).click();
  const section = page.getByRole("region", {
    name: "Příští soupeř",
    exact: true,
  });
  await expect(section).toContainText("Průměr soupeře se nepodařilo načíst.");
  await expect(
    section.getByRole("link", { name: "Detail zápasu" }),
  ).toBeVisible();
  await expect(section).toContainText("dohrané zápasy v soutěži: 2");
  recover();
  await section.getByRole("button", { name: /Zkusit|Znovu/ }).click();
  await expect(section).toContainText("Průměr soupeře venku");
  await expect(section).toContainText("3 100");
});
test("no upcoming fixture does not fetch opponents", async ({ page }) => {
  const { calls } = await mock(page, "empty");
  await page.goto("/?team=57&season=20");
  await page.getByRole("tab", { name: "Příští soupeř", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Příští soupeř", exact: true }),
  ).toContainText("není další naplánované utkání");
  expect(calls).not.toContain("team-season:58");
  expect(calls.some((c) => c.startsWith("team-records:"))).toBe(false);
});

test("team overview is default; opponent loads only after switching and tabs support keyboard", async ({
  page,
}) => {
  const { calls } = await mock(page);
  await page.goto("/?team=57&season=20");
  const overview = page.getByRole("tab", { name: "Přehled týmu", exact: true });
  const opponentTab = page.getByRole("tab", {
    name: "Příští soupeř",
    exact: true,
  });
  await expect(
    page.getByRole("heading", { name: "Forma týmu", exact: true }),
  ).toBeVisible();
  await expect(overview).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("region", { name: "Příští soupeř", exact: true }),
  ).toHaveCount(0);
  expect(calls).not.toContain("team-season:58");
  expect(calls.some((c) => c.startsWith("team-records:"))).toBe(false);
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(opponentTab).toBeFocused();
  await expect(opponentTab).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { name: "Forma týmu", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("region", { name: "Příští soupeř", exact: true }),
  ).toContainText("3 250,5");
  await page.keyboard.press("Home");
  await expect(overview).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Forma týmu", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Příští soupeř", exact: true }),
  ).toHaveCount(0);
});
