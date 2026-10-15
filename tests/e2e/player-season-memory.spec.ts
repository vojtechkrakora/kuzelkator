import { expect, test, type Page } from "@playwright/test";

async function mock(page: Page) {
  const calls: URLSearchParams[] = [];
  await page.route("**/api/data?**", (route) => {
    const query = new URL(route.request().url()).searchParams;
    calls.push(query);
    const data =
      query.get("kind") === "seasons"
        ? {
            items: [
              { id: 20, name: "2026/2027", active: true },
              { id: 19, name: "2025/2026", active: false },
            ],
            total: 2,
          }
        : { items: [], total: 0 };
    return route.fulfill({
      json: { data, checkedAt: new Date().toISOString(), stale: false },
    });
  });
  return calls;
}
test("selected season survives player navigation and refresh and is encoded in links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  const calls = await mock(page);
  await page.goto("/players");
  await page
    .getByRole("combobox", { name: "Sezóna", exact: true })
    .selectOption("19");
  await expect(page).toHaveURL(/season=19/);
  await page.goto("/players/711");
  await expect(
    page.getByRole("combobox", { name: "Sezóna", exact: true }),
  ).toHaveValue("19");
  await expect(page.locator(".back-link")).toHaveAttribute(
    "href",
    "/players?season=19",
  );
  await expect
    .poll(() => calls.filter((q) => q.get("kind") === "player-history").length)
    .toBeGreaterThan(0);
  expect(
    calls
      .filter((q) => q.get("kind") === "player-history")
      .every((q) => q.get("seasonId") === "19"),
  ).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Sezóna", exact: true }),
  ).toHaveValue("19");
  await page.locator(".back-link").click();
  await expect(
    page.getByRole("combobox", { name: "Sezóna", exact: true }),
  ).toHaveValue("19");
  await page.getByLabel("Jméno nebo tým").fill("Krakora");
  await page.getByRole("button", { name: "Hledat hráče", exact: true }).click();
  await expect
    .poll(() =>
      calls.find((q) => q.get("kind") === "player-search")?.get("seasonId"),
    )
    .toBe("19");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const season of ["20", "999999", "invalid", ""]) {
  test(`explicit season ${season || "empty"} takes precedence over saved season`, async ({
    page,
  }) => {
    await page.addInitScript(() =>
      sessionStorage.setItem("kuzelkator:player-season:v1", "19"),
    );
    await mock(page);
    await page.goto(`/players?season=${season}`);
    await expect(
      page.getByRole("combobox", { name: "Sezóna", exact: true }),
    ).toHaveValue("20");
    await expect(page).toHaveURL(/season=20/);
  });
}

for (const stored of ["invalid-json", "999999", "blocked"]) {
  test(`season selection works with ${stored} storage`, async ({ page }) => {
    await page.addInitScript((value) => {
      if (value === "blocked")
        Object.defineProperty(window, "sessionStorage", {
          get() {
            throw new Error("blocked");
          },
        });
      else sessionStorage.setItem("kuzelkator:player-season:v1", value);
    }, stored);
    await mock(page);
    await page.goto("/players");
    await expect(
      page.getByRole("combobox", { name: "Sezóna", exact: true }),
    ).toHaveValue("20");
    await page
      .getByRole("combobox", { name: "Sezóna", exact: true })
      .selectOption("19");
    await expect(page).toHaveURL(/season=19/);
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "Sezóna", exact: true }),
    ).toHaveValue("19");
  });
}

test("overview does not restore the player's old season or date", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/players?season=19");
  await expect(
    page.getByRole("combobox", { name: "Sezóna", exact: true }),
  ).toHaveValue("19");
  await page.locator(".back-link").click();
  await expect(page).not.toHaveURL(/season=19/);
  await expect(
    page.getByRole("heading", { name: "Hráči", exact: true }),
  ).toHaveCount(0);
});
