import { afterEach, describe, expect, it, vi } from "vitest";
import { getMatches, matchFilters } from "../src/server/cka";
import { apiCache } from "../src/server/cache";
const filters = {
  from: "2026-09-28",
  to: "2026-10-04",
  offset: 0,
  favoriteCompetitionIds: [22],
};
const items = Array.from({ length: 125 }, (_, i) => ({
  id: i + 1,
  competition: { id: i >= 100 ? 22 : 17 },
  date: "2026-09-30",
}));
afterEach(() => vi.restoreAllMocks());
function mockPages() {
  return vi.spyOn(apiCache, "get").mockImplementation(async (path) => {
    const offset = Number(
      new URL(path, "https://test.local").searchParams.get("offset"),
    );
    return {
      data: { items: items.slice(offset, offset + 100), total: items.length },
      stale: offset > 0,
      checkedAt: offset > 0 ? "2026-09-28" : "2026-09-30",
    };
  });
}
describe("favourite matches before pagination", () => {
  it("moves matches from a later upstream page onto page one", async () => {
    const get = mockPages();
    const result = await getMatches(filters);
    expect(result.data.items.map((x) => x.id)).toEqual(
      Array.from({ length: 24 }, (_, i) => 101 + i),
    );
    expect(result.data.total).toBe(125);
    expect(result.stale).toBe(true);
    expect(result.checkedAt).toBe("2026-09-28");
    expect(get).toHaveBeenCalledTimes(2);
  });
  it("continues favourites on page two before others, without losing or repeating matches", async () => {
    mockPages();
    const all = [];
    for (let offset = 0; offset < 125; offset += 24)
      all.push(
        ...(await getMatches({ ...filters, offset })).data.items.map(
          (x) => x.id,
        ),
      );
    expect(all).toEqual(
      [...items.slice(100), ...items.slice(0, 100)].map((x) => x.id),
    );
    expect(new Set(all).size).toBe(125);
  });
  it("keeps direct pagination for explicit competition and team filters", async () => {
    const get = mockPages();
    await getMatches({ ...filters, competitionId: 17, offset: 24 });
    await getMatches({
      ...filters,
      teamId: 67,
      offset: 24,
    });
    expect(get).toHaveBeenCalledTimes(2);
    for (const [path] of get.mock.calls) {
      expect(path).toContain("limit=24");
      expect(path).toContain("offset=24");
    }
  });
  it("rejects malformed or oversized favourite lists", () => {
    for (const ids of ["0", "-1", "1,x", Array(21).fill(1).join(",")])
      expect(
        matchFilters.safeParse({ ...filters, favoriteCompetitionIds: ids })
          .success,
      ).toBe(false);
    expect(
      matchFilters.parse({ ...filters, favoriteCompetitionIds: "22,17" })
        .favoriteCompetitionIds,
    ).toEqual([22, 17]);
  });
  it("fails rather than silently sorting an incomplete date range", async () => {
    vi.spyOn(apiCache, "get").mockResolvedValue({
      data: { items: [], total: 125 },
      checkedAt: "now",
      stale: false,
    });
    await expect(getMatches(filters)).rejects.toMatchObject({ status: 502 });
  });
});

it("returns complete days for the overview, including favourites beyond the first page", async () => {
  mockPages();
  const result = await getMatches({ ...filters, daily: "1" });
  expect(result.data.items).toHaveLength(125);
  expect(
    result.data.items.filter((match) => match.competition?.id === 22),
  ).toHaveLength(25);
});
