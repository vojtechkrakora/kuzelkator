import { expect, it } from "vitest";
import {
  laneOutcome,
  overlayPositions,
  overlayPlayerName,
  overlayPollDelay,
} from "../src/domain/obs-overlay";
import type { Match } from "../src/domain/models";
const match: Match = {
  id: 1,
  slug: "test",
  date: null,
  time: null,
  round: null,
  status: "IN_PROGRESS",
  results: [
    {
      isHome: true,
      playerResults: [
        { position: 2, player: { id: 2, firstName: "Jan", lastName: "Novák" } },
        { position: 1 },
      ],
      substitutions: [
        {
          id: 1,
          playerOut: { id: 2 },
          playerIn: { id: 3, firstName: "Petr", lastName: "Svoboda" },
        },
      ],
    },
    { isHome: false, playerResults: [{ position: 3 }, { position: 1 }] },
  ],
};
it("aligns both sides by lineup position despite unsorted and incomplete nominations", () =>
  expect(overlayPositions(match)).toEqual([1, 2, 3]));
it("preserves substitutions on one slot without summing duplicate player performances", () => {
  expect(
    overlayPlayerName(match, true, match.results![0].playerResults![0]),
  ).toBe("Jan Novák → Petr Svoboda");
  expect(overlayPlayerName(match, false)).toBe("Čekáme na nominaci");
});
it("does not mark initial zero points or unpublished opponent scores as defeats", () => {
  expect(
    laneOutcome(
      { laneNumber: 1, total: 100, setPoints: 0 },
      { laneNumber: 1, total: 110, setPoints: 0 },
    ),
  ).toBe("pending");
  expect(
    laneOutcome(
      { laneNumber: 1, total: 100, setPoints: 0 },
      { laneNumber: 1, total: null, setPoints: 1 },
    ),
  ).toBe("pending");
  expect(
    laneOutcome(
      { laneNumber: 1, total: 0, setPoints: 0 },
      { laneNumber: 1, total: 110, setPoints: 1 },
    ),
  ).toBe("loss");
  expect(
    laneOutcome(
      { laneNumber: 1, total: 110, setPoints: 1 },
      { laneNumber: 1, total: 0, setPoints: 0 },
    ),
  ).toBe("win");
  expect(
    laneOutcome(
      { laneNumber: 1, total: 110, setPoints: 0.5 },
      { laneNumber: 1, total: 110, setPoints: 0.5 },
    ),
  ).toBe("draw");
});
it("aligns healthy polling, slows completed matches and backs off failures including Retry-After", () => {
  expect(overlayPollDelay(14000, 0, false)).toBe(1000);
  expect(overlayPollDelay(15000, 0, false)).toBe(15000);
  expect(overlayPollDelay(15000, 0, true)).toBe(285000);
  expect(overlayPollDelay(15000, 1, false)).toBe(30000);
  expect(overlayPollDelay(15000, 9, false)).toBe(300000);
  expect(overlayPollDelay(15000, 1, false, 600000)).toBe(600000);
});
