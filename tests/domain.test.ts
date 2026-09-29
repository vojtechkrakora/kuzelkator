import { describe, expect, it, vi } from "vitest";
import { matchSchema, resultFor, statusLabel } from "../src/domain/models";
import { pragueMidnight, todayPrague, weekRange } from "../src/lib/dates";
import { getMatches, matchFilters } from "../src/server/cka";
import { apiCache } from "../src/server/cache";

describe("official score interpretation", () => {
  it("finds the correct side even when away results come first, preserving zero", () => {
    const match = matchSchema.parse({
      id: 1,
      slug: "test",
      date: null,
      time: null,
      round: 1,
      status: "FINISHED",
      results: [
        { isHome: false, teamPoints: 8 },
        { isHome: true, teamPoints: 0 },
      ],
    });
    expect(resultFor(match, true)?.teamPoints).toBe(0);
    expect(resultFor(match, false)?.teamPoints).toBe(8);
    expect(resultFor(match, true)?.totalPerformance).toBeUndefined();
  });
  it("does not fabricate labels for unknown statuses", () =>
    expect(statusLabel("NEW_STATUS")).toBe("Stav neuveden"));
});
describe("Prague calendar boundaries", () => {
  it("sends ČKA whole-second timestamps with explicit offsets", async () => {
    const request = vi
      .spyOn(apiCache, "get")
      .mockResolvedValue({
        data: { items: [], total: 0 },
        checkedAt: "",
        stale: false,
      });
    try {
      await getMatches({ from: "2026-09-28", to: "2026-10-04", offset: 0 });
      const url = new URL(request.mock.calls[0][0], "https://example.test");
      expect(url.searchParams.get("dateFrom")).toBe(
        "2026-09-27T22:00:00+00:00",
      );
      expect(url.searchParams.get("dateTo")).toBe("2026-10-04T21:59:59+00:00");
    } finally {
      request.mockRestore();
    }
  });
  it("uses the local day even across UTC midnight", () =>
    expect(todayPrague(new Date("2026-09-27T23:30:00Z"))).toBe("2026-09-28"));
  it("starts the week on Monday", () =>
    expect(weekRange("2026-09-27")).toEqual({
      from: "2026-09-21",
      to: "2026-09-27",
    }));
  it("handles 23-hour and 25-hour daylight-saving days", () => {
    expect(
      (Date.parse(pragueMidnight("2026-03-30")) -
        Date.parse(pragueMidnight("2026-03-29"))) /
        3600000,
    ).toBe(23);
    expect(
      (Date.parse(pragueMidnight("2026-10-26")) -
        Date.parse(pragueMidnight("2026-10-25"))) /
        3600000,
    ).toBe(25);
  });
  it("rejects invalid dates, backwards and unbounded ranges, and invalid IDs", () => {
    for (const data of [
      { from: "2026-02-30", to: "2026-03-02" },
      { from: "2026-09-28", to: "2026-09-01" },
      { from: "2026-01-01", to: "2026-12-31" },
      { from: "2026-09-01", to: "2026-09-02", teamId: "-1" },
    ])
      expect(matchFilters.safeParse(data).success).toBe(false);
  });
});
