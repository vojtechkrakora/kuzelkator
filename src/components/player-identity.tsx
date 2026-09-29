import { playerName, type Match } from "../domain/models";

type PlayerResult = NonNullable<
  NonNullable<Match["results"]>[number]["playerResults"]
>[number];

export function PlayerIdentity({ result }: { result: PlayerResult }) {
  return (
    <>
      <span className="player-position">{result.position}.</span>{" "}
      {result.isEmpty ? "Neobsazená pozice" : playerName(result.player)}
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
