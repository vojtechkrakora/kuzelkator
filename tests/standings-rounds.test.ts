import { expect, it } from "vitest";
import { standingsRounds } from "../src/domain/standings-rounds";
it("one advance does not choose a future regular round", () => {
  const rows = [
    { round: 5, status: "FINISHED" },
    ...Array.from({ length: 6 }, (_, i) => ({
      round: 8,
      status: i === 0 ? "FINISHED" : "SCHEDULED",
      date: i === 0 ? "2026-10-10" : "2026-11-01",
    })),
  ];
  expect(standingsRounds(rows, "2026-10-11")).toEqual({
    playedRounds: [8, 5],
    regularRound: 5,
  });
});
it("starts normal round on its majority scheduled day, not the first advance", () => {
  const rows = Array.from({ length: 6 }, (_, i) => ({
    round: 5,
    status: i === 0 ? "FINISHED" : "SCHEDULED",
    date: "2026-10-10",
  }));
  expect(standingsRounds(rows, "2026-10-09").regularRound).toBeNull();
  expect(standingsRounds(rows, "2026-10-10").regularRound).toBe(5);
});
it("requires a strict majority and at least one actual result", () => {
  expect(
    standingsRounds(
      [
        { round: 8, status: "FINISHED" },
        { round: 8, status: "SCHEDULED" },
      ],
      "2026-10-11",
    ).regularRound,
  ).toBeNull();
  expect(
    standingsRounds(
      [{ round: 1, status: "SCHEDULED", date: "2026-10-01" }],
      "2026-10-11",
    ).regularRound,
  ).toBeNull();
});
