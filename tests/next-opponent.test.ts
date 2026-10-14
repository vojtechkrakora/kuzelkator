import { expect, it, vi } from "vitest";
import type { Match } from "../src/domain/models";
import { nextTeamMatch } from "../src/domain/next-opponent";
const m = (id: number, overrides: Partial<Match> = {}): Match => ({
  id,
  slug: String(id),
  date: "2026-10-18",
  time: "10:00",
  round: id,
  status: "SCHEDULED",
  homeTeam: { id: 1, name: "A" },
  awayTeam: { id: 2, name: "B" },
  ...overrides,
});
it("chooses actual future date and time, not round, ignoring completed, unrelated and old scheduled games", () => {
  const input = [
    m(1),
    m(22, { date: "2026-10-15" }),
    m(3, { date: "2026-10-15", time: "09:00" }),
    m(4, { date: "2026-10-14", status: "FINISHED" }),
    m(5, { date: "2026-10-10" }),
    m(6, {
      date: "2026-10-14",
      homeTeam: { id: 3, name: "C" },
      awayTeam: { id: 4, name: "D" },
    }),
    m(7, { date: "2026-10-14", status: "CANCELLED" }),
    m(8, { date: "2026-10-14", status: "FORFEIT" }),
  ];
  expect(nextTeamMatch(input, "1", "2026-10-13").match?.id).toBe(3);
  expect(input[0].id).toBe(1);
});
it("keeps live match first and reports undated postponement separately", () => {
  const data = nextTeamMatch(
    [
      m(1),
      m(2, { date: "2026-10-12", status: "IN_PROGRESS" }),
      m(3, { date: null, status: "POSTPONED" }),
    ],
    "1",
    "2026-10-13",
  );
  expect(data.match?.id).toBe(2);
  expect(data.hasUnscheduled).toBe(true);
  expect(nextTeamMatch([m(3, { date: null })], "1", "2026-10-13")).toEqual({
    match: null,
    hasUnscheduled: true,
  });
  expect(nextTeamMatch([], "1", "2026-10-13")).toEqual({
    match: null,
    hasUnscheduled: false,
  });
});
it("records API requires competition context and forwards it to the upstream", async () => {
  vi.resetModules();
  const request = vi.fn(async (_input: RequestInfo | URL) =>
    Response.json({
      homeAveragePerformance: 3200,
      awayAveragePerformance: 3100,
    }),
  );
  vi.stubGlobal("fetch", request);
  try {
    const { getTeamRecords, teamRecordsInput } =
      await import("../src/server/team-records");
    expect(teamRecordsInput.safeParse({ teamId: "1" }).success).toBe(false);
    expect(
      teamRecordsInput.safeParse({ teamId: "1", competitionId: "-1" }).success,
    ).toBe(false);
    const result = await getTeamRecords(
      teamRecordsInput.parse({ teamId: "2", competitionId: "16" }),
    );
    expect(String(request.mock.calls[0]?.[0])).toContain(
      "/teams/2/records?competitionId=16",
    );
    expect(result.data.awayAveragePerformance).toBe(3100);
  } finally {
    vi.unstubAllGlobals();
  }
});
