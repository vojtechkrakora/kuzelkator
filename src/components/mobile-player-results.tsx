import type { Match } from "../domain/models";
import { PlayerIdentity } from "./player-identity";

type Result = NonNullable<Match["results"]>[number];

export function MobilePlayerResults({ result }: { result: Result }) {
  return (
    <div className="mobile-player-results">
      <ol className="player-cards">
        {result.playerResults?.map((player, index) => (
          <li className="player-card" key={`${player.position}-${index}`}>
            <div className="player-card-heading">
              <h4>
                <PlayerIdentity
                  result={player}
                  substitutions={result.substitutions}
                />
              </h4>
              <div className="player-total">
                <strong>{player.totalPerformance ?? "—"}</strong>
                <span>kuželek</span>
              </div>
            </div>
            <dl className="player-stats">
              <div>
                <dt>Plné</dt>
                <dd>{player.totalFull ?? "—"}</dd>
              </div>
              <div>
                <dt>Dorážka</dt>
                <dd>{player.totalSpare ?? "—"}</dd>
              </div>
              <div>
                <dt>Chyby</dt>
                <dd>{player.totalErrors ?? "—"}</dd>
              </div>
              <div>
                <dt>Body</dt>
                <dd>{player.teamPoints ?? "—"}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
      <div className="team-totals">
        <span>Celkem za tým</span>
        <strong>
          {result.totalPerformance ?? "—"} <small>kuželek</small>
        </strong>
      </div>
      <dl className="player-stats total-stats">
        <div>
          <dt>Plné</dt>
          <dd>{result.totalFull ?? "—"}</dd>
        </div>
        <div>
          <dt>Dorážka</dt>
          <dd>{result.totalSpare ?? "—"}</dd>
        </div>
        <div>
          <dt>Chyby</dt>
          <dd>{result.totalErrors ?? "—"}</dd>
        </div>
        <div>
          <dt>Body</dt>
          <dd>{result.teamPoints ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
