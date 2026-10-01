import { playerName, type Match } from "../domain/models";
import { ArrowDownUp } from "lucide-react";

type PlayerResult = NonNullable<
  NonNullable<Match["results"]>[number]["playerResults"]
>[number];

export function PlayerIdentity({
  result,
  substitutions,
}: {
  result: PlayerResult;
  substitutions?: NonNullable<Match["results"]>[number]["substitutions"];
}) {
  const substituted =
    !result.isEmpty &&
    (Boolean(result.substitute) ||
      (result.player != null &&
        substitutions?.some(
          (substitution) => substitution.playerOut?.id === result.player?.id,
        )));
  return (
    <>
      <span className="player-position">{result.position}.</span>{" "}
      {result.isEmpty ? "Neobsazená pozice" : playerName(result.player)}
      {substituted && (
        <span className="substituted-player-badge">
          <ArrowDownUp size={12} aria-hidden="true" /> Střídání
        </span>
      )}
      {!result.isEmpty && result.substitute && (
        <span className="player-substitute">
          Střídání: {playerName(result.substitute)}
          {result.substituteAtThrow != null
            ? ` · hod ${result.substituteAtThrow}`
            : ""}
        </span>
      )}
    </>
  );
}
