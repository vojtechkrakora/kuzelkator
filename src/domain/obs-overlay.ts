import { playerName, resultFor, type Match } from "./models";
export type OverlayDensity = "compact" | "full";
export type OverlayPanel = "home" | "away" | "score";
export type PlayerResult = NonNullable<
  NonNullable<Match["results"]>[number]["playerResults"]
>[number];
export type Lane = NonNullable<PlayerResult["laneResults"]>[number];
export const overlayPanels = ["home", "away", "score"] as const;
export function overlayPositions(match: Match) {
  return [
    ...new Set(
      (match.results ?? []).flatMap((r) =>
        (r.playerResults ?? []).map((p) => p.position),
      ),
    ),
  ].sort((a, b) => a - b);
}
export function overlayLanes(
  match: Match,
  player?: PlayerResult,
  rival?: PlayerResult,
) {
  const discipline = match.discipline ?? match.competition?.discipline;
  const expected = discipline === "T100" ? [1, 2] : [1, 2, 3, 4];
  return [
    ...new Set([
      ...expected,
      ...(player?.laneResults ?? []).map((lane) => lane.laneNumber),
      ...(rival?.laneResults ?? []).map((lane) => lane.laneNumber),
    ]),
  ].sort((a, b) => a - b);
}
export function laneOutcome(lane?: Lane, opponent?: Lane) {
  // Only published complementary points establish an outcome. Initial zeroes do not.
  if (
    lane?.total == null ||
    opponent?.total == null ||
    lane.setPoints == null ||
    opponent.setPoints == null ||
    lane.setPoints + opponent.setPoints !== 1
  )
    return "pending";
  return lane.setPoints === 1
    ? "win"
    : lane.setPoints === 0.5
      ? "draw"
      : lane.setPoints === 0
        ? "loss"
        : "pending";
}
export function overlayPlayerName(
  match: Match,
  home: boolean,
  player?: PlayerResult,
  compact = false,
) {
  if (!player) return "Čekáme na nominaci";
  if (player.isEmpty) return "Neobsazená pozice";
  const change = resultFor(match, home)?.substitutions?.find(
    (s) => s.playerOut?.id === player.player?.id,
  );
  const substitute = player.substitute ?? change?.playerIn;
  const name = (person: PlayerResult["player"]) => {
    if (!compact || !person?.lastName) return playerName(person);
    const initials = (person.firstName ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `${part[0]}.`)
      .join(" ");
    return [initials, person.lastName].filter(Boolean).join(" ");
  };
  return name(player.player) + (substitute ? ` → ${name(substitute)}` : "");
}
export function overlayPollDelay(
  now: number,
  failures: number,
  finished: boolean,
  retryAfter = 0,
) {
  if (failures)
    return Math.max(
      Math.min(15000 * 2 ** Math.min(failures, 5), 300000),
      retryAfter,
    );
  const interval = finished ? 300000 : 15000;
  return interval - (now % interval);
}
