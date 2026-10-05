import { expect, test } from "@playwright/test";
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
