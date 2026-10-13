import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const row = (id: number, position: number, round = 5, type = "ALL") => ({
  round,
  type,
  position,
  matches: 2,
  averagePerformance: 600 - id,
  teamPointsWon: 1,
  player: { id, firstName: "Jan", lastName: String(id) },
  team: { id: 1, name: "Tým" },
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
function mock(table: (url: URL) => Response) {
  const request = vi.fn(async (value: string | URL | Request) => {
    const url = new URL(String(value));
    if (url.pathname.endsWith("/schedule"))
      return Response.json({
        items: [
          { round: 22, status: "SCHEDULED" },
          { round: 5, status: "IN_PROGRESS" },
          { round: 4, status: "FINISHED" },
        ],
        total: 3,
      });
    if (!url.pathname.includes("player-table"))
      return Response.json({ id: 16 });
    return table(url);
  });
  vi.stubGlobal("fetch", request);
  vi.resetModules();
  return request;
}
it("fetches every page, sorts official positions (not averages), and never asks for future round22", async () => {
  const request = mock((url) =>
    Response.json({
      items:
        url.searchParams.get("offset") === "0"
          ? [row(1, 80), row(2, 1)]
          : [row(3, 2)],
      total: 3,
    }),
  );
  const { getCompetitionPlayerStandings } =
    await import("../src/server/competition-player-standings");
  const r = await getCompetitionPlayerStandings("test");
  expect(r.data.items.map((r) => r.position)).toEqual([1, 2, 80]);
  expect(r.data.round).toBe(5);
  expect(r.data.total).toBe(3);
  expect(
    request.mock.calls.some(([url]) => String(url).includes("/rounds/22/")),
  ).toBe(false);
  expect(
    request.mock.calls.some(([url]) => String(url).includes("offset=2")),
  ).toBe(true);
});
it.each([404, 200])(
  "falls back only for unavailable/empty round (%s) and reports real round",
  async (status) => {
    mock((url) =>
      url.pathname.includes("/5/")
        ? Response.json(
            status === 200 ? { items: [], total: 0 } : { error: "not found" },
            { status },
          )
        : Response.json({ items: [row(1, 1, 4, "HOME")], total: 1 }),
    );
    const { getCompetitionPlayerStandings } =
      await import("../src/server/competition-player-standings");
    const r = await getCompetitionPlayerStandings("test", undefined, "HOME");
    expect(r.data.round).toBe(4);
    expect(r.data.latestStartedRound).toBe(5);
    expect(r.data.items[0].type).toBe("HOME");
  },
);
it("does not hide upstream failures with an older ranking", async () => {
  const request = mock(() =>
    Response.json({ error: "outage" }, { status: 503 }),
  );
  const { getCompetitionPlayerStandings } =
    await import("../src/server/competition-player-standings");
  await expect(getCompetitionPlayerStandings("test")).rejects.toMatchObject({
    status: 503,
  });
  expect(
    request.mock.calls.some(([url]) => String(url).includes("/4/player-table")),
  ).toBe(false);
});
it.each(["empty", "duplicate", "changed-total", "wrong-round"])(
  "rejects incomplete or mixed pages: %s",
  async (failure) => {
    mock((url) =>
      url.searchParams.get("offset") === "0"
        ? Response.json({ items: [row(1, 1)], total: 2 })
        : Response.json({
            items:
              failure === "empty"
                ? []
                : [
                    row(
                      failure === "duplicate" ? 1 : 2,
                      2,
                      failure === "wrong-round" ? 4 : 5,
                    ),
                  ],
            total: failure === "changed-total" ? 3 : 2,
          }),
    );
    const { getCompetitionPlayerStandings } =
      await import("../src/server/competition-player-standings");
    await expect(getCompetitionPlayerStandings("test")).rejects.toMatchObject({
      status: 502,
    });
  },
);
it("explicit earlier rounds never query newer data", async () => {
  const request = mock(() =>
    Response.json({ items: [row(1, 1, 4)], total: 1 }),
  );
  const { getCompetitionPlayerStandings } =
    await import("../src/server/competition-player-standings");
  expect((await getCompetitionPlayerStandings("test", 4)).data.round).toBe(4);
  expect(
    request.mock.calls.some(([url]) => String(url).includes("/5/player-table")),
  ).toBe(false);
});
it("rejects invalid API filters before upstream access", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  vi.resetModules();
  const { GET } = await import("../src/app/api/data/route");
  for (const q of [
    "slug=../x",
    "slug=test&round=0",
    "slug=test&round=1001",
    "slug=test&type=INVALID",
  ])
    expect(
      (
        await GET(
          new NextRequest(
            `http://localhost/api/data?kind=competition-player-standings&${q}`,
          ),
        )
      ).status,
    ).toBe(400);
  expect(request).not.toHaveBeenCalled();
});

it("ranks the whole list by descending average, handles ties/missing/zero, and preserves official positions", async () => {
  const { orderCompetitionPlayers } =
    await import("../src/domain/competition-player-standings");
  const items = [
    { ...row(1, 1), averagePerformance: 550 },
    { ...row(2, 2), averagePerformance: 600 },
    { ...row(3, 3), averagePerformance: 600 },
    { ...row(4, 4), averagePerformance: null },
    { ...row(5, 5), matches: 0, averagePerformance: 999 },
    { ...row(6, 6), averagePerformance: 0 },
  ].map((r) => ({ ...r, type: "ALL" as const }));
  const result = orderCompetitionPlayers(items, "average");
  expect(result.map((r) => r.player.id)).toEqual([2, 3, 1, 6, 4, 5]);
  expect(result.map((r) => r.displayPosition)).toEqual([
    1,
    1,
    3,
    4,
    null,
    null,
  ]);
  expect(result.find((r) => r.player.id === 2)?.position).toBe(2);
  expect(
    orderCompetitionPlayers(items, "official").map((r) => r.displayPosition),
  ).toEqual([1, 2, 3, 4, 5, 6]);
  expect(items.map((r) => r.player.id)).toEqual([1, 2, 3, 4, 5, 6]);
});
