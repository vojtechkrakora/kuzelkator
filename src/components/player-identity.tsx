import { playerName, type Match } from "../domain/models";
import { PlayerDetail } from "./player-detail";
import { ArrowDownUp } from "lucide-react";

type PlayerResult = NonNullable<
  NonNullable<Match["results"]>[number]["playerResults"]
>[number];

export function PlayerIdentity({
  result,
  substitutions,
  opponents,
}: {
  result: PlayerResult;
  opponents?: PlayerResult[];
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
      {result.isEmpty ? (
        "Neobsazená pozice"
      ) : (
        <PlayerDetail
          result={result}
          opponents={opponents}
          substitutions={substitutions}
        />
      )}
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
