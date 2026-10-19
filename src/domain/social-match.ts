import { playerName, type Match } from "./models";
import type { PlayerResult } from "./obs-overlay";

type Result = NonNullable<Match["results"]>[number];
export function socialPlayer(player: PlayerResult, result: Result) {
  const people = new Map<number, NonNullable<PlayerResult["player"]>>();
  if (player.player) people.set(player.player.id, player.player);
  if (player.substitute) people.set(player.substitute.id, player.substitute);
  // Follow the whole substitution chain, including APIs which report the last player.
  let changed = true;
  while (changed) {
    changed = false;
    for (const sub of result.substitutions ?? []) {
      if (
        !people.has(sub.playerOut?.id ?? -1) &&
        !people.has(sub.playerIn?.id ?? -1)
      )
        continue;
      for (const person of [sub.playerOut, sub.playerIn]) {
        if (person && !people.has(person.id)) {
          people.set(person.id, person);
          changed = true;
        }
      }
    }
  }
  const substituted =
    !!player.substitute ||
    player.substituteAtThrow != null ||
    (result.substitutions ?? []).some(
      (s) =>
        people.has(s.playerOut?.id ?? -1) || people.has(s.playerIn?.id ?? -1),
    );
  return {
    name: player.isEmpty
      ? "Neobsazená pozice"
      : [...people.values()].map(playerName).join(" / ") || playerName(null),
    substituted,
    people: [...people.values()],
    changes: (result.substitutions ?? []).filter(
      (s) =>
        people.has(s.playerOut?.id ?? -1) || people.has(s.playerIn?.id ?? -1),
    ),
  };
}

export function highestSocialPerformance(match: Match): number | undefined {
  if (match.status !== "FINISHED") return undefined;
  const scores = (match.results ?? []).flatMap((result) =>
    (result.playerResults ?? [])
      .filter(
        (player) =>
          player.player &&
          player.isEmpty === false &&
          Array.isArray(result.substitutions) &&
          player.substitute === null &&
          player.substituteAtThrow === null &&
          !socialPlayer(player, result).substituted &&
          typeof player.totalPerformance === "number" &&
          player.totalPerformance > 0,
      )
      .map((player) => player.totalPerformance!),
  );
  return scores.length ? Math.max(...scores) : undefined;
}

export function isHighestSocialPlayer(
  player: PlayerResult,
  result: Result,
  highest?: number,
) {
  return (
    highest != null &&
    player.totalPerformance === highest &&
    player.player != null &&
    player.isEmpty === false &&
    player.substitute === null &&
    player.substituteAtThrow === null &&
    Array.isArray(result.substitutions) &&
    !socialPlayer(player, result).substituted
  );
}
