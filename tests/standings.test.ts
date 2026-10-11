import { afterEach, expect, it, vi } from "vitest";
import { getStandings } from "../src/server/cka";
import { apiCache, UpstreamError } from "../src/server/cache";
const row = {
  position: 4,
  matches: 4,
  wins: 3,
  draws: 0,
  losses: 1,
  tablePoints: 6,
  averagePerformance: 3300,
  team: { id: 57, name: "Bohušovice" },
};
const resource = (data: unknown, stale = false) => ({
  data,
  stale,
  checkedAt: "2026-10-11T08:00:00Z",
});
const draw = Array.from({ length: 22 }, (_, i) => ({
  round: i + 1,
  status: [2, 3, 4, 5].includes(i + 1) ? "FINISHED" : "SCHEDULED",
}));
function mock(
  schedule = draw,
  table = (path: string) => resource({ items: [row], total: 1 }),
) {
  return vi.spyOn(apiCache, "get").mockImplementation(async (path) => {
    if (path === "/competitions/league") return resource({ id: 16 });
    if (path.endsWith("/schedule"))
      return resource({ items: schedule, total: schedule.length });
    return table(path);
  });
}
afterEach(() => vi.restoreAllMocks());
it("ignores populated future tables and compares round5 against4 despite only4 starts", async () => {
  const get = mock(draw, (path) =>
    resource({
      items: [{ ...row, position: path.includes("/4/table") ? 1 : 4 }],
      total: 1,
    }),
  );
  const current = await getStandings("league");
  const previous = await getStandings("league", current.data.round! - 1);
  expect(current.data.round).toBe(5);
  expect(current.data.items[0].matches).toBe(4);
  expect(previous.data.round).toBe(4);
  expect(previous.data.items[0].position - current.data.items[0].position).toBe(
    -3,
  );
  expect(current.data.incompleteMatches).toBe(1);
  expect(
    get.mock.calls.some(
      ([p]) =>
        p.includes("/22/table") ||
        p.includes("/21/table") ||
        p.endsWith("/rounds"),
    ),
  ).toBe(false);
});
it("clamps explicit future selection to actual play", async () => {
  mock();
  expect((await getStandings("league", 22)).data.round).toBe(5);
});
it("does not claim a table before the season starts", async () => {
  const get = mock([{ round: 1, status: "SCHEDULED" }]);
  expect((await getStandings("league")).data.round).toBeNull();
  expect(get).toHaveBeenCalledTimes(2);
});
it("keeps completed historical final rounds", async () => {
  mock(draw.map((m) => ({ ...m, status: "FINISHED" })));
  expect((await getStandings("league")).data.round).toBe(22);
});
it("uses a preplayed round but marks earlier unfinished matches", async () => {
  mock([
    { round: 1, status: "SCHEDULED" },
    { round: 2, status: "FINISHED" },
    { round: 6, status: "IN_PROGRESS" },
    { round: 6, status: "SCHEDULED" },
  ]);
  const r = await getStandings("league");
  expect(r.data.round).toBe(2);
  expect(r.data.comparisonRound).toBe(1);
  expect(r.data.incompleteMatches).toBe(3);
});
it("a late low-round match never moves the latest round backwards", async () => {
  mock([
    { round: 1, status: "IN_PROGRESS" },
    { round: 5, status: "FINISHED" },
  ]);
  expect((await getStandings("league")).data.round).toBe(5);
});
it.each(["HOME", "AWAY"] as const)(
  "preserves %s fallback and pagination",
  async (type) => {
    const get = mock(draw, (path) => {
      if (path.includes("/5/table")) throw new UpstreamError(404);
      if (path.includes("/4/table")) return resource({ items: [], total: 0 });
      return resource(
        {
          items: [
            path.includes("offset=1")
              ? { ...row, team: { id: 2, name: "Praha" } }
              : row,
          ],
          total: 2,
        },
        true,
      );
    });
    const r = await getStandings("league", 4, type);
    expect(r.data.round).toBe(3);
    expect(r.data.items).toHaveLength(2);
    expect(r.stale).toBe(true);
    expect(
      get.mock.calls
        .filter(([p]) => p.includes("/table"))
        .every(([p]) => p.includes(`type=${type}`)),
    ).toBe(true);
  },
);
it("does not hide API failures as a missing comparison", async () => {
  mock(draw, () => {
    throw new UpstreamError(429);
  });
  await expect(getStandings("league")).rejects.toMatchObject({ status: 429 });
});
it("rejects a truncated schedule rather than selecting the wrong round", async () => {
  vi.spyOn(apiCache, "get")
    .mockResolvedValueOnce(resource({ id: 16 }))
    .mockResolvedValueOnce(resource({ items: draw.slice(0, 2), total: 22 }));
  await expect(getStandings("league")).rejects.toMatchObject({ status: 502 });
});
it("keeps stale schedule metadata", async () => {
  vi.spyOn(apiCache, "get")
    .mockResolvedValueOnce(resource({ id: 16 }))
    .mockResolvedValueOnce(resource({ items: draw, total: 22 }, true))
    .mockResolvedValueOnce(resource({ items: [row], total: 1 }));
  expect((await getStandings("league")).stale).toBe(true);
});

it("counts forfeits as resolved but not pre-match preparation", async () => {
  mock([
    { round: 5, status: "FORFEIT" },
    { round: 6, status: "PREPARATION" },
  ]);
  const result = await getStandings("league");
  expect(result.data.round).toBe(5);
  expect(result.data.incompleteMatches).toBe(0);
});

it("includes a distant advance without moving the comparison round", async () => {
  const schedule = [
    { round: 4, status: "FINISHED" },
    { round: 5, status: "FINISHED" },
    ...Array.from({ length: 6 }, (_, i) => ({
      round: 8,
      status: i === 0 ? "FINISHED" : "SCHEDULED",
    })),
  ];
  const get = mock(schedule, (path) =>
    resource({
      items: [{ ...row, matches: path.includes("/8/table") ? 5 : 4 }],
      total: 1,
    }),
  );
  const result = await getStandings("league");
  expect(result.data.round).toBe(5);
  expect(result.data.comparisonRound).toBe(4);
  expect(result.data.items[0].matches).toBe(5);
  expect(get.mock.calls.some(([p]) => p.includes("/8/table"))).toBe(true);
});
it("does not omit an advance by falling back to an older current table", async () => {
  mock(draw, () => resource({ items: [], total: 0 }));
  await expect(getStandings("league")).rejects.toMatchObject({ status: 502 });
});
