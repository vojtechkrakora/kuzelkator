import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const input = { competitionId: 16, seasonId: 20, discipline: "T120" as const };
const row = (id: number, score = 700 - id) => ({
  position: 1,
  totalPerformance: score,
  totalFull: 400,
  totalSpare: 200,
  totalErrors: 0,
  isEmpty: false,
  substitute: null,
  substituteAtThrow: null,
  player: { id, firstName: "Jan", lastName: String(id) },
  teamMatchResult: {
    isHome: true,
    team: { id: 1, name: "Tým" },
    substitutions: [],
    teamMatch: {
      id,
      slug: String(id),
      date: "2026-10-01",
      time: "10:00",
      status: "FINISHED",
      round: 4,
      discipline: "T120",
      competition: {
        id: 16,
        name: "Liga",
        slug: "liga",
        discipline: "T120",
        season: { id: 20 },
      },
      venue: { name: "Kuželna" },
    },
  },
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
function mock(pages: (offset: number) => { items: unknown[]; total: number }) {
  vi.resetModules();
  const request = vi.fn(async (value: string | URL | Request) => {
    const url = new URL(String(value));
    expect(url.searchParams.get("competitionId")).toBe("16");
    expect(url.searchParams.get("seasonFromId")).toBe("20");
    expect(url.searchParams.get("seasonToId")).toBe("20");
    expect(url.searchParams.get("discipline")).toBe("T120");
    return Response.json(pages(Number(url.searchParams.get("offset"))));
  });
  vi.stubGlobal("fetch", request);
  return request;
}
it("continues after ineligible pages and excludes substitutions, missing metadata, wrong season/discipline and unfinished games", async () => {
  const substituted = row(1, 800);
  const items = [
    { ...substituted, substitute: { id: 2 } },
    { ...substituted, substituteAtThrow: 40 },
    { ...substituted, isEmpty: true },
    { ...substituted, player: null },
    {
      ...substituted,
      teamMatchResult: {
        ...substituted.teamMatchResult,
        substitutions: [{ id: 1, playerIn: { id: 1 } }],
      },
    },
    {
      ...substituted,
      teamMatchResult: {
        ...substituted.teamMatchResult,
        substitutions: undefined,
      },
    },
    ...["IN_PROGRESS", "FORFEIT"].map((status) => ({
      ...substituted,
      teamMatchResult: {
        ...substituted.teamMatchResult,
        teamMatch: { ...substituted.teamMatchResult.teamMatch, status },
      },
    })),
    {
      ...substituted,
      teamMatchResult: {
        ...substituted.teamMatchResult,
        teamMatch: {
          ...substituted.teamMatchResult.teamMatch,
          discipline: "T100",
        },
      },
    },
    {
      ...substituted,
      teamMatchResult: {
        ...substituted.teamMatchResult,
        teamMatch: {
          ...substituted.teamMatchResult.teamMatch,
          competition: {
            ...substituted.teamMatchResult.teamMatch.competition,
            season: { id: 19 },
          },
        },
      },
    },
  ].map((r, i) => ({
    ...r,
    teamMatchResult: {
      ...r.teamMatchResult,
      teamMatch: { ...r.teamMatchResult.teamMatch, id: i + 1 },
    },
  }));
  const request = mock((offset) => ({
    items: offset === 0 ? items : [row(99, 650)],
    total: items.length + 1,
  }));
  const { getBestPerformances } =
    await import("../src/server/best-performances");
  const result = await getBestPerformances(input);
  expect(result.data.items.map((r) => r.player.id)).toEqual([99]);
  expect(result.data.items[0].errors).toBe(0);
  expect(request).toHaveBeenCalledTimes(2);
});
it("includes all cutoff ties across pages, shares ranks and stops before fetching lower pages", async () => {
  const request = mock((offset) => ({
    items:
      offset === 0
        ? Array.from({ length: 20 }, (_, i) =>
            row(i + 1, i < 2 ? 700 : 700 - i),
          )
        : [row(21, 681), row(22, 681), row(23, 680)],
    total: 300,
  }));
  const { getBestPerformances } =
    await import("../src/server/best-performances");
  const result = await getBestPerformances(input);
  expect(result.data.items).toHaveLength(22);
  expect(result.data.items.slice(0, 3).map((r) => r.rank)).toEqual([1, 1, 3]);
  expect(result.data.items.slice(-3).map((r) => r.rank)).toEqual([20, 20, 20]);
  expect(request).toHaveBeenCalledTimes(2);
});
it.each(["duplicate", "empty", "changed-total", "unsorted"])(
  "rejects an invalid %s snapshot",
  async (kind) => {
    mock((offset) =>
      offset === 0
        ? { items: [row(1)], total: 3 }
        : {
            items:
              kind === "empty"
                ? []
                : kind === "duplicate"
                  ? [row(1)]
                  : kind === "unsorted"
                    ? [row(2, 800)]
                    : [row(2)],
            total: kind === "changed-total" ? 4 : 3,
          },
    );
    const { getBestPerformances } =
      await import("../src/server/best-performances");
    await expect(getBestPerformances(input)).rejects.toMatchObject({
      status: 502,
    });
  },
);
it("handles an empty competition", async () => {
  mock(() => ({ items: [], total: 0 }));
  const { getBestPerformances } =
    await import("../src/server/best-performances");
  expect((await getBestPerformances(input)).data.items).toEqual([]);
});
it("rejects invalid API filters before contacting upstream", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  vi.resetModules();
  const { GET } = await import("../src/app/api/data/route");
  const result = await GET(
    new NextRequest(
      "https://local/api/data?kind=competition-best-performances&competitionId=16&seasonId=20&discipline=other",
    ),
  );
  expect(result.status).toBe(400);
  expect(request).not.toHaveBeenCalled();
});
