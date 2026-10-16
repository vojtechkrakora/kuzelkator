import { expect, it } from "vitest";
import {
  highestSocialPerformance,
  isHighestSocialPlayer,
  socialPlayer,
} from "../src/domain/social-match";
import type { Match } from "../src/domain/models";
const person = (id: number) => ({
  id,
  firstName: `Hráč ${id}`,
  lastName: "Test",
});
const player = (id: number, totalPerformance = 600) => ({
  position: id,
  player: person(id),
  isEmpty: false,
  substitute: null,
  substituteAtThrow: null,
  totalPerformance,
});
const fixture = (): Match => ({
  id: 1,
  slug: "test",
  date: null,
  time: null,
  round: null,
  status: "FINISHED",
  results: [
    { isHome: true, substitutions: [], playerResults: [player(1), player(2)] },
    { isHome: false, substitutions: [], playerResults: [player(3, 599)] },
  ],
});
it("marks all tied complete performances but excludes shared results and empty positions", () => {
  const match = fixture(),
    result = match.results![0];
  result.playerResults!.push(
    { ...player(4, 700), substitute: person(5) },
    { ...player(6, 800), isEmpty: true },
  );
  expect(highestSocialPerformance(match)).toBe(600);
  expect(
    result.playerResults!.map((p) => isHighestSocialPlayer(p, result, 600)),
  ).toEqual([true, true, false, false]);
  match.status = "IN_PROGRESS";
  expect(highestSocialPerformance(match)).toBeUndefined();
  match.status = "FORFEIT";
  expect(highestSocialPerformance(match)).toBeUndefined();
});
it("retains every name from a substitution chain even if the row contains the last player", () => {
  const result = {
    isHome: true,
    substitutions: [
      { id: 1, playerOut: person(1), playerIn: person(2) },
      { id: 2, playerOut: person(2), playerIn: person(3) },
    ],
  };
  const identity = socialPlayer(player(3), result);
  for (const id of [1, 2, 3]) expect(identity.name).toContain(`Hráč ${id}`);
  expect(identity.substituted).toBe(true);
  expect(isHighestSocialPlayer(player(3), result, 600)).toBe(false);
});
it("does not award best performance when substitution metadata is missing", () => {
  const match = fixture();
  for (const r of match.results!) delete r.substitutions;
  expect(highestSocialPerformance(match)).toBeUndefined();
});
