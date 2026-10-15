import { expect, test, type Page } from "@playwright/test";
const competition = {
  id: 16,
  name: "2. KLM A",
  slug: "2-klm-a",
  discipline: "T120",
};
const item = (id: number) => ({
  rank: 1,
  performance: 659,
  full: 420,
  spare: 239,
  errors: 0,
  player: { id, firstName: "Viktor", lastName: id === 1 ? "Pytlík" : "Jiný" },
  team: { id: 55, name: "TJ Sokol Kdyně" },
  matchId: 500 + id,
  date: "2026-10-03",
  venue: "Kuželna Kdyně",
});
async function mock(page: Page, mode: "normal" | "empty" | "error" = "normal") {
  let failed = mode === "error";
  const calls: URL[] = [];
  await page.route("**/api/data?**", async (route) => {
    const url = new URL(route.request().url());
    calls.push(url);
    const kind = url.searchParams.get("kind");
    let data: unknown = { items: [], total: 0 };
    if (kind === "seasons")
      data = { items: [{ id: 20, name: "2026/2027", active: true }], total: 1 };
    if (kind === "competitions") data = { items: [competition], total: 1 };
    if (kind === "competition-best-performances") {
      expect(url.searchParams.get("competitionId")).toBe("16");
      expect(url.searchParams.get("seasonId")).toBe("20");
      expect(url.searchParams.get("discipline")).toBe("T120");
      if (failed)
        return route.fulfill({ status: 502, json: { error: "Výpadek" } });
      data = { items: mode === "empty" ? [] : [item(1), item(2)] };
    }
    await route.fulfill({
      json: { data, checkedAt: "2026-10-14T08:00:00Z", stale: false },
    });
  });
  return {
    calls,
    recover: () => {
      failed = false;
    },
  };
}
for (const width of [320, 390, 1280])
  test(`best performances load on demand and fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const { calls } = await mock(page);
    await page.goto("/?competition=16&season=20");
    const picker = page.getByRole("group", { name: "Pořadí v soutěži" });
    await expect(
      picker.getByRole("button", { name: "Družstva", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      calls.some(
        (u) => u.searchParams.get("kind") === "competition-best-performances",
      ),
    ).toBe(false);
    const button = picker.getByRole("button", {
      name: "Nejlepší výkony",
      exact: true,
    });
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await button.click();
    const section = page.getByRole("region", {
      name: "Nejlepší výkony soutěže",
      exact: true,
    });
    await expect(section.locator("li")).toHaveCount(2);
    await expect(section).toContainText("2026/2027 · 120 HS");
    await expect(section.locator(".best-performance-rank")).toHaveText([
      "1.",
      "1.",
    ]);
    await expect(
      section.getByRole("link", { name: "Viktor Pytlík", exact: true }),
    ).toHaveAttribute("href", "/players/1?season=20");
    await expect(
      section
        .getByRole("link", { name: "TJ Sokol Kdyně", exact: true })
        .first(),
    ).toHaveAttribute("href", "/?team=55&season=20");
    await expect(
      section.getByRole("link", { name: /Detail zápasu · Viktor Pytlík/ }),
    ).toHaveAttribute("href", "/matches/501");
    await expect(section).toContainText("Kuželna Kdyně");
    await expect(section.locator("li").first()).toContainText("Chyby 0");
    await section
      .getByRole("button", {
        name: "Sledovat hráče Viktor Pytlík",
        exact: true,
      })
      .click();
    await expect(section.locator("li").first()).toHaveClass(
      "best-performance-favorite",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await picker.getByRole("button", { name: "Družstva", exact: true }).click();
    await expect(section).toHaveCount(0);
  });
test("empty results and recoverable API failure", async ({ page }) => {
  const { recover } = await mock(page, "error");
  await page.goto("/?competition=16&season=20");
  await page
    .getByRole("button", { name: "Nejlepší výkony", exact: true })
    .click();
  const section = page.getByRole("region", {
    name: "Nejlepší výkony soutěže",
    exact: true,
  });
  await expect(section).toContainText("Nejlepší výkony se nepodařilo načíst.");
  recover();
  await section.getByRole("button", { name: /Zkusit znovu/ }).click();
  await expect(section.locator("li")).toHaveCount(2);
  await page.unroute("**/api/data?**");
  await mock(page, "empty");
  await page.reload();
  await page
    .getByRole("button", { name: "Nejlepší výkony", exact: true })
    .click();
  await expect(section).toContainText(
    "Zatím nejsou dostupné samostatné výkony",
  );
});
