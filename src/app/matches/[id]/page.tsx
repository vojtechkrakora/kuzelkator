import { BackToFeed } from "@/components/feed-navigation";
import { ShareButton } from "@/components/share-button";
import { StatisticsGlossary } from "@/components/statistics-glossary";
import { TeamLogo } from "@/components/team-logo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, Image as ImageIcon } from "lucide-react";
import { MatchInformation } from "@/components/match-information";
import { getMatch } from "@/server/cka";
import { UpstreamError } from "@/server/cache";
import { resultFor, statusLabel } from "@/domain/models";
import { MatchDuels } from "@/components/match-duels";
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
        <div className="match-share-actions">
          <Link
            className="share-button"
            href={`/matches/${id}/social`}
            prefetch={false}
            aria-label="Výsledek pro screenshot"
            title="Výsledek pro screenshot"
          >
            <ImageIcon size={18} aria-hidden="true" />
          </Link>
          <ShareButton
            title={`${match.homeTeam?.name ?? "Domácí"} – ${match.awayTeam?.name ?? "Hosté"}`}
            label="Sdílet zápas"
            href={`/matches/${id}`}
          />
        </div>
        <p className="scoreboard-date">
          {dayLabel(match.date, true)}
          {match.time ? ` · ${match.time.slice(0, 5)}` : ""}
          {(match.discipline ?? match.competition?.discipline)
            ? ` · ${(match.discipline ?? match.competition?.discipline)!.replace("T", "")} hodů`
            : ""}
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
              {away?.totalPerformance ?? "—"}
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
      <MatchDuels match={match} stale={resource.stale} />
      <StatisticsGlossary
        context="výsledky zápasu"
        items={[
          "full",
          "spare",
          "errors",
          "total",
          "playerPoints",
          "setPoints",
          "missing",
        ]}
      />
      <a
        className="official-link"
        href="https://vysledky.kuzelky.cz/"
        target="_blank"
        rel="noreferrer"
      >
        Zdroj výsledků: Česká kuželkářská asociace ↗
      </a>
      <details className="match-organizer-tools">
        <summary>Pro pořadatele</summary>
        <Link href={`/matches/${id}/overlay`} prefetch={false}>
          Nastavení výsledků pro OBS
        </Link>
      </details>
    </main>
  );
}
