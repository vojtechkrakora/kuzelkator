import { expect, test, type Page } from "@playwright/test";
const competition = { id: 16, name: "2. KLM A", slug: "2-klm-a-2026-2027" };
async function mock(
  page: Page,
  mode: "populated" | "empty" | "error" = "populated",
) {
  let failed = mode === "error";
  const calls: string[] = [];
  await page.route("**/api/data?**", async (route) => {
    const kind = new URL(route.request().url()).searchParams.get("kind")!;
    calls.push(kind);
    let data: unknown = { items: [], total: 0 };
    if (kind === "seasons")
      data = { items: [{ id: 20, name: "2026/2027", active: true }], total: 1 };
    if (kind === "competitions") data = { items: [competition], total: 1 };
    if (kind === "competition-documents")
      data = {
        attachments:
          mode === "empty"
            ? []
            : [
                {
                  url: "/data/soupiska.pdf",
                  filename: "soupisky-podzim-velmi-dlouhy-nazev-dokumentu.pdf",
                  extension: "pdf",
                  size: "855.31 KB",
                  updatedAt: "2026-10-08T07:04:15+02:00",
                },
                { url: "javascript:alert(1)", filename: "Unsafe" },
              ],
      };
    if (kind === "competition-articles") {
      if (failed)
        return route.fulfill({ status: 502, json: { error: "Výpadek" } });
      data = {
        items:
          mode === "empty"
            ? []
            : [
                {
                  id: 1,
                  title: "Zpravodaj soutěže <b>nový</b>",
                  slug: "zpravodaj",
                  publishedAt: "2026-10-08T10:00:00Z",
                },
              ],
        total: mode === "empty" ? 0 : 1,
      };
    }
    await route.fulfill({
      json: {
        data,
        checkedAt: "2026-10-08T10:00:00Z",
        stale: kind === "competition-documents" && mode === "error",
      },
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
  test(`competition documents and official news at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    await page.goto("/?competition=16&season=20");
    const section = page.locator(".competition-resources");
    const summary = section.locator("summary");
    await expect(summary).toBeVisible();
    expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await summary.focus();
    await page.keyboard.press("Enter");
    const pdf = section.getByRole("link", { name: /soupisky-podzim/ });
    await expect(pdf).toHaveAttribute(
      "href",
      "https://kuzelky.cz/data/soupiska.pdf",
    );
    await expect(pdf).toContainText(
      "PDF · 855.31 KB · Aktualizováno 8. 10. 2026",
    );
    await expect(pdf).toHaveAttribute("target", "_blank");
    await expect(section.getByText("Unsafe")).toHaveCount(0);
    await expect(
      section.getByRole("link", { name: /Zpravodaj/ }),
    ).toHaveAttribute(
      "href",
      "https://kuzelky.cz/zpravodajstvi/zpravodaj.html",
    );
    await expect(section.locator("b")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(pdf).not.toBeVisible();
  });
test("empty competition hides section and overview does not fetch competition resources", async ({
  page,
}) => {
  const { calls } = await mock(page, "empty");
  await page.goto("/");
  await expect(page.locator("#competitions")).toBeVisible();
  expect(calls.filter((x) => x.startsWith("competition-"))).toEqual([]);
  await page.goto("/?competition=16&season=20");
  await expect.poll(() => calls.includes("competition-articles")).toBe(true);
  await expect(page.locator(".competition-resources-loading")).toHaveCount(0);
  await expect(page.locator(".competition-resources")).toHaveCount(0);
});
test("article failure preserves stale documents and retry recovers news", async ({
  page,
}) => {
  const state = await mock(page, "error");
  await page.goto("/?competition=16&season=20");
  const section = page.locator(".competition-resources");
  await section.locator("summary").click();
  await expect(section.getByRole("link", { name: /soupisky/ })).toBeVisible();
  await expect(section.getByText(/Uložená data/)).toBeVisible();
  const retry = section.getByRole("button", { name: "Zkusit znovu" });
  await expect(retry).toBeVisible();
  state.recover();
  await retry.click();
  await expect(section.getByRole("link", { name: /Zpravodaj/ })).toBeVisible();
  await expect(retry).toHaveCount(0);
});
