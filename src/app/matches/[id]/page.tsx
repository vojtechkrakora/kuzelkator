import { BackToFeed } from "@/components/feed-navigation";
import { TeamLogo } from "@/components/team-logo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { MatchInformation } from "@/components/match-information";
import { getMatch } from "@/server/cka";
import { UpstreamError } from "@/server/cache";
import { resultFor, statusLabel } from "@/domain/models";
import { PlayerIdentity } from "@/components/player-identity";
import { MobilePlayerResults } from "@/components/mobile-player-results";
import { MatchSubstitutions } from "@/components/match-substitutions";
import { dayLabel } from "@/lib/dates";
import { FollowButton, Freshness } from "@/components/common";
import { teamSeasonHref } from "@/lib/team-navigation";

export const dynamic = "force-dynamic";
export default async function MatchDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)
    notFound();
  let resource;
  try {
    resource = await getMatch(Number(id));
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) notFound();
    throw error;
  }
  const match = resource.data;
  const seasonId = match.competition?.season?.id;
  const home = resultFor(match, true),
    away = resultFor(match, false);
  return (
    <main id="main" className="page detail-page">
      <BackToFeed />
      <div className="detail-heading">
        <div className="eyebrow">
          <Trophy size={15} /> {match.competition?.name ?? "Zápas"} ·{" "}
          {match.round ?? "—"}. kolo
        </div>
        <span className="match-status">{statusLabel(match.status)}</span>
      </div>
      <section className="scoreboard">
        <p className="scoreboard-date">
          {dayLabel(match.date, true)}
          {match.time ? ` · ${match.time.slice(0, 5)}` : ""}
        </p>
        <div className="scoreboard-teams">
          <div>
            {match.homeTeam ? (
              <Link
                className="scoreboard-team-link"
                href={teamSeasonHref(
                  match.homeTeam.id,
                  seasonId ? String(seasonId) : undefined,
                )}
                aria-label={`Zápasy týmu ${match.homeTeam.name}`}
              >
                <TeamLogo team={match.homeTeam} size={48} />
                <h1>{match.homeTeam.name}</h1>
              </Link>
            ) : (
              <>
                <TeamLogo team={match.homeTeam} size={48} />
                <h1>Domácí</h1>
              </>
            )}
            {match.homeTeam && <FollowButton team={match.homeTeam} />}
            <span>DOMÁCÍ</span>
          </div>
          <div className="big-score">
            <strong>
              {home?.teamPoints ?? "—"} <i>:</i> {away?.teamPoints ?? "—"}
            </strong>
            <span>
              {home?.totalPerformance ?? "—"} <i>:</i>{" "}
              {away?.totalPerformance ?? "—"} kuželek
            </span>
          </div>
          <div>
            {match.awayTeam ? (
              <Link
                className="scoreboard-team-link"
                href={teamSeasonHref(
                  match.awayTeam.id,
                  seasonId ? String(seasonId) : undefined,
                )}
                aria-label={`Zápasy týmu ${match.awayTeam.name}`}
              >
                <TeamLogo team={match.awayTeam} size={48} />
                <h2>{match.awayTeam.name}</h2>
              </Link>
            ) : (
              <>
                <TeamLogo team={match.awayTeam} size={48} />
                <h2>Hosté</h2>
              </>
            )}
            {match.awayTeam && <FollowButton team={match.awayTeam} />}
            <span>HOSTÉ</span>
          </div>
        </div>
        <MatchInformation match={match} />
        <Freshness {...resource} />
      </section>
      <div className="section-title">
        <div>
          <span className="section-kicker">JAK SE HRÁLO</span>
          <h2>Výsledky hráčů</h2>
        </div>
        <span className="discipline">
          {match.discipline?.replace("T", "") ?? "—"} hodů
        </span>
      </div>
      <nav className="detail-team-navigation" aria-label="Výsledky podle týmu">
        <a href="#home-results">Domácí</a>
        <a href="#away-results">Hosté</a>
      </nav>
      <div className="results-grid">
        {[
          { team: match.homeTeam, result: home },
          { team: match.awayTeam, result: away },
        ].map(({ team, result }, index) => (
          <section
            className="result-panel"
            key={index}
            id={index ? "away-results" : "home-results"}
          >
            <h3>{team?.name ?? (index ? "Hosté" : "Domácí")}</h3>
            <div className="result-substitutions">
              <MatchSubstitutions result={result} />
            </div>
            {result?.playerResults?.length ? (
              <>
                <MobilePlayerResults
                  result={result}
                  opponents={(index ? home : away)?.playerResults}
                />
                <div className="table-scroll desktop-player-table">
                  <table>
                    <caption className="sr-only">Výsledky {team?.name}</caption>
                    <thead>
                      <tr>
                        <th>Hráč</th>
                        <th>Plné</th>
                        <th>Dorážka</th>
                        <th>Chyby</th>
                        <th>Celkem</th>
                        <th>Body</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.playerResults.map((player, i) => (
                        <tr key={`${player.position}-${i}`}>
                          <th scope="row" className="player-cell">
                            <PlayerIdentity
                              result={player}
                              opponents={(index ? home : away)?.playerResults}
                              substitutions={result.substitutions}
                            />
                          </th>
                          <td>{player.totalFull ?? "—"}</td>
                          <td>{player.totalSpare ?? "—"}</td>
                          <td>{player.totalErrors ?? "—"}</td>
                          <td>
                            <strong>{player.totalPerformance ?? "—"}</strong>
                          </td>
                          <td>{player.teamPoints ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>Celkem</th>
                        <td>{result.totalFull ?? "—"}</td>
                        <td>{result.totalSpare ?? "—"}</td>
                        <td>{result.totalErrors ?? "—"}</td>
                        <td>{result.totalPerformance ?? "—"}</td>
                        <td>{result.teamPoints ?? "—"}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : (
              <p className="empty-copy">
                Individuální výsledky zatím nejsou zveřejněné.
              </p>
            )}
          </section>
        ))}
      </div>
      <a
        className="official-link"
        href="https://vysledky.kuzelky.cz/"
        target="_blank"
        rel="noreferrer"
      >
        Zdroj výsledků: Česká kuželkářská asociace ↗
      </a>
    </main>
  );
}
