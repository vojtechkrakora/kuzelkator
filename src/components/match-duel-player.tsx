import { Trophy } from "lucide-react";
import type { Match } from "@/domain/models";
import type { PlayerResult } from "@/domain/obs-overlay";
import { isHighestSocialPlayer, socialPlayer } from "@/domain/social-match";
import "./match-duel-summary.css";
const number = (value: number | null | undefined) =>
  value == null ? "—" : String(value).replace(".", ",");
type Result = NonNullable<Match["results"]>[number];

export function MatchDuelPlayer({
  player,
  result,
  highest,
  opponent,
}: {
  player?: PlayerResult;
  result?: Result;
  highest?: number;
  opponent?: PlayerResult;
}) {
  if (!player || !result)
    return (
      <div className="social-player">
        <span>Výsledek není k dispozici</span>
        <strong>—</strong>
      </div>
    );
  const identity = socialPlayer(player, result);
  const best = isHighestSocialPlayer(player, result, highest);
  const scored = (player.teamPoints ?? 0) > 0;
  const won =
    player.teamPoints != null &&
    opponent?.teamPoints != null &&
    player.teamPoints > opponent.teamPoints;
  return (
    <div
      className={`social-player ${scored ? "social-scored" : ""} ${won ? "social-winner" : ""} ${best ? "social-best" : ""}`}
    >
      <div className="social-player-name">
        {identity.name}
        {identity.substituted && <small>Střídání · společný výkon</small>}
      </div>
      <div className="social-player-score">
        <strong>{number(player.totalPerformance)}</strong>
        <span className="social-player-points">
          {scored ? "● " : ""}
          {number(player.teamPoints)} b.
        </span>
      </div>
      {best && (
        <span
          className="social-best-label"
          title="Nejvyšší výkon"
          aria-label="Nejvyšší výkon"
        >
          <Trophy size={11} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
