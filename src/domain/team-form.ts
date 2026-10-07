import { resultFor, type Match } from "./models";

export function teamMatchOutcome(
  match: Match,
  teamId: string,
): "win" | "draw" | "loss" | "unknown" {
  if (
    !["FINISHED", "FORFEIT"].includes(match.status) ||
    ![match.homeTeam?.id, match.awayTeam?.id].some(
      (id) => String(id) === teamId,
    )
  )
    return "unknown";
  const home = String(match.homeTeam?.id) === teamId;
  const points = resultFor(match, home)?.teamPoints;
  const opponentPoints = resultFor(match, !home)?.teamPoints;
  if (typeof points !== "number" || typeof opponentPoints !== "number")
    return "unknown";
  return points > opponentPoints
    ? "win"
    : points < opponentPoints
      ? "loss"
      : "draw";
}

export function teamForm(matches: Match[], teamId: string) {
  return matches
    .filter(
      (match) =>
        ["FINISHED", "FORFEIT"].includes(match.status) &&
        !!match.date &&
        [match.homeTeam?.id, match.awayTeam?.id].some(
          (id) => String(id) === teamId,
        ),
    )
    .sort(
      (a, b) =>
        `${a.date} ${a.time ?? ""}`.localeCompare(
          `${b.date} ${b.time ?? ""}`,
        ) || a.id - b.id,
    )
    .slice(-5)
    .map((match) => {
      const home = String(match.homeTeam?.id) === teamId;
      const points = resultFor(match, home)?.teamPoints;
      const opponentPoints = resultFor(match, !home)?.teamPoints;
      const outcome = teamMatchOutcome(match, teamId);
      return {
        match,
        outcome,
        points,
        opponentPoints,
        opponent: home ? match.awayTeam : match.homeTeam,
      };
    });
}
