import { afterEach, expect, it, vi } from "vitest";
import { apiCache } from "../src/server/cache";
import { getMatchDays } from "../src/server/cka";
afterEach(() => vi.restoreAllMocks());
it("looks up nearest dates in both directions, with timezone boundaries and competition filter", async () => {
  const request = vi
    .spyOn(apiCache, "get")
    .mockResolvedValueOnce({
      data: { items: [{ date: "2026-10-03" }], total: 1 },
      checkedAt: "2026-10-04T10:00:00Z",
      stale: false,
    })
    .mockResolvedValueOnce({
      data: { items: [{ date: "2026-10-10" }], total: 1 },
      checkedAt: "2026-10-04T10:01:00Z",
      stale: true,
    });
  const result = await getMatchDays("2026-10-04", 17);
  expect(result.data).toEqual({ previous: "2026-10-03", next: "2026-10-10" });
  expect(result.stale).toBe(true);
  const queries = request.mock.calls.map(
    ([path]) => new URL(path, "https://example.test").searchParams,
  );
  expect(queries[0].get("sort")).toBe("-date,-time,-id");
  expect(queries[0].get("dateTo")).toBe("2026-10-03T21:59:59+00:00");
  expect(queries[1].get("dateFrom")).toBe("2026-10-04T22:00:00+00:00");
  for (const query of queries) {
    expect(query.get("limit")).toBe("1");
    expect(query.get("competitionId")).toBe("17");
  }
});
it("handles no prior or upcoming fixtures", async () => {
  vi.spyOn(apiCache, "get").mockResolvedValue({
    data: { items: [], total: 0 },
    checkedAt: "",
    stale: false,
  });
  expect((await getMatchDays("2026-10-04")).data).toEqual({
    previous: null,
    next: null,
  });
});
