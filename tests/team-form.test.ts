import { describe, expect, it } from "vitest";
import type { Match } from "../src/domain/models";
import { teamForm, teamMatchOutcome } from "../src/domain/team-form";

function match(id: number, overrides: Partial<Match> = {}): Match {
  return {
    id,
    slug: String(id),
    date: `2026-09-${String(id).padStart(2, "0")}`,
    time: "14:00",
    round: id,
    status: "FINISHED",
    homeTeam: { id: 1, name: "Home" },
    awayTeam: { id: 2, name: "Away" },
    results: [
      { isHome: true, teamPoints: 0 },
      { isHome: false, teamPoints: 8 },
    ],
    ...overrides,
  };
}

describe("team form", () => {
  it("does not assign an outcome to live, future, or unrelated matches", () => {
    expect(teamMatchOutcome(match(1, { status: "IN_PROGRESS" }), "1")).toBe(
      "unknown",
    );
    expect(teamMatchOutcome(match(1, { status: "SCHEDULED" }), "1")).toBe(
      "unknown",
    );
    expect(teamMatchOutcome(match(1), "3")).toBe("unknown");
    expect(teamMatchOutcome(match(1, { date: null }), "1")).toBe("loss");
  });
  it("takes five latest completed games by date rather than round or input order", () => {
    const matches = [
      match(7, { status: "SCHEDULED" }),
      match(3),
      match(1),
      match(6),
      match(2),
      match(5),
      match(4),
      match(8, { status: "IN_PROGRESS" }),
      match(9, { date: null }),
    ];
    expect(teamForm(matches, "1").map(({ match }) => match.id)).toEqual([
      2, 3, 4, 5, 6,
    ]);
    expect(matches[0].id).toBe(7);
  });
  it("uses the selected team's perspective and preserves zero scores", () => {
    expect(teamForm([match(1)], "1")[0].outcome).toBe("loss");
    expect(teamForm([match(1)], "2")[0].outcome).toBe("win");
    expect(teamForm([match(1)], "3")).toEqual([]);
    expect(
      teamForm(
        [
          match(1, {
            results: [
              { isHome: true, teamPoints: 4 },
              { isHome: false, teamPoints: 4 },
            ],
          }),
        ],
        "1",
      )[0].outcome,
    ).toBe("draw");
  });
  it("includes forfeits but does not interpret missing scores as draws", () => {
    expect(teamForm([match(1, { status: "FORFEIT" })], "2")[0].outcome).toBe(
      "win",
    );
    expect(
      teamForm(
        [match(1, { results: [{ isHome: true, teamPoints: null }] })],
        "1",
      )[0].outcome,
    ).toBe("unknown");
  });
});
