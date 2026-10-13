"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { nextTeamMatch, type TeamRecords } from "@/domain/next-opponent";
import type { Match, Team } from "@/domain/models";
import { teamForm } from "@/domain/team-form";
import { dayLabel, todayPrague } from "@/lib/dates";
import { getData } from "@/lib/client-api";
import { teamSeasonHref } from "@/lib/team-navigation";
import { venueLinks } from "@/lib/match-links";
import { ErrorNotice, Freshness } from "./common";
import { TeamLogo } from "./team-logo";

const outcomes = {
  win: ["V", "Výhra"],
  draw: ["R", "Remíza"],
  loss: ["P", "Prohra"],
  unknown: ["?", "Výsledek nezveřejněn"],
};

function OpponentStatistics({
  match,
  opponent,
  seasonId,
  opponentHome,
}: {
  match: Match;
  opponent: Team;
  seasonId: string;
  opponentHome: boolean;
}) {
  const competitionId = String(match.competition!.id);
  const history = useQuery({
    queryKey: ["team-season", String(opponent.id), seasonId],
    queryFn: ({ signal }) =>
      getData<{ items: Match[]; total: number }>(
        {
          kind: "team-season",
          teamId: String(opponent.id),
          seasonId,
        },
        signal,
      ),
    staleTime: 60000,
    refetchInterval: 300000,
    refetchIntervalInBackground: false,
  });
  const records = useQuery({
    queryKey: ["team-records", opponent.id, competitionId],
    queryFn: ({ signal }) =>
      getData<TeamRecords>(
        {
          kind: "team-records",
          teamId: String(opponent.id),
          competitionId,
        },
        signal,
      ),
    staleTime: 300000,
    refetchInterval: 300000,
    refetchIntervalInBackground: false,
  });
  const completed = (history.data?.data.items ?? []).filter(
    (m) =>
      m.competition?.id === match.competition!.id &&
      ["FINISHED", "FORFEIT"].includes(m.status) &&
      [m.homeTeam?.id, m.awayTeam?.id].includes(opponent.id),
  );
  const form = teamForm(completed, String(opponent.id));
  const sideCount = completed.filter(
    (m) => (opponentHome ? m.homeTeam : m.awayTeam)?.id === opponent.id,
  ).length;
  const average = opponentHome
    ? records.data?.data.homeAveragePerformance
    : records.data?.data.awayAveragePerformance;
  const sources = [history.data, records.data].filter((value) => value != null);
  const oldest = sources.map((value) => value.checkedAt).sort()[0];
  return (
    <div className="next-opponent-stats">
      <p className="muted">
        Statistiky soupeře · {match.competition!.name} · vybraná sezóna
      </p>
      {history.isPending && <p role="status">Načítání formy soupeře…</p>}
      {history.isError && (
        <ErrorNotice
          message="Formu soupeře se nepodařilo načíst."
          retry={() => void history.refetch()}
        />
      )}
      {history.data && (
        <>
          <p>Forma soupeře · dohrané zápasy v soutěži: {completed.length}</p>
          {form.length ? (
            <>
              <ol
                className="team-form-list"
                aria-label="Posledních až pět zápasů soupeře"
              >
                {form.map(
                  ({
                    match: played,
                    outcome,
                    points,
                    opponentPoints,
                    opponent: rival,
                  }) => {
                    const [letter, label] = outcomes[outcome];
                    const description = `${label} · ${rival?.name ?? "Soupeř"} · ${dayLabel(played.date)}${outcome === "unknown" ? "" : ` · ${points}:${opponentPoints}`}`;
                    return (
                      <li key={played.id}>
                        <Link
                          prefetch={false}
                          href={`/matches/${played.id}`}
                          className={`team-form-box team-form-${outcome}`}
                          aria-label={description}
                          title={description}
                        >
                          {letter}
                        </Link>
                      </li>
                    );
                  },
                )}
              </ol>
              <p className="muted">
                Nejnovější vpravo → · V výhra · R remíza · P prohra
              </p>
            </>
          ) : (
            <p>Zatím bez dohraných zápasů se známým datem.</p>
          )}
        </>
      )}
      {records.isPending && <p role="status">Načítání průměru soupeře…</p>}
      {records.isError && (
        <ErrorNotice
          message="Průměr soupeře se nepodařilo načíst."
          retry={() => void records.refetch()}
        />
      )}
      {records.data && (
        <div className="next-opponent-average">
          <span>Průměr soupeře {opponentHome ? "doma" : "venku"}</span>
          <strong>
            {average != null && average > 0 && (!history.data || sideCount > 0)
              ? new Intl.NumberFormat("cs-CZ", {
                  maximumFractionDigits: 2,
                }).format(average)
              : "—"}
          </strong>
          <small>
            Údaj ČKA
            {history.data
              ? ` · dohráno ${opponentHome ? "doma" : "venku"}: ${sideCount}`
              : " · počet zápasů není dostupný"}
          </small>
        </div>
      )}
      {oldest && (
        <Freshness
          checkedAt={oldest}
          stale={sources.some((value) => value.stale)}
        />
      )}
    </div>
  );
}

export function NextOpponent({
  matches,
  teamId,
  seasonId,
}: {
  matches: Match[];
  teamId: string;
  seasonId: string;
}) {
  const { match, hasUnscheduled } = nextTeamMatch(
    matches,
    teamId,
    todayPrague(),
  );
  const opponentHome = match ? String(match.awayTeam?.id) === teamId : false;
  const opponent = match
    ? opponentHome
      ? match.homeTeam
      : match.awayTeam
    : null;
  const { address, directions } = venueLinks(match?.venue);
  return (
    <section className="next-opponent" aria-label="Příští soupeř">
      <span className="section-kicker">
        {match?.status === "IN_PROGRESS" ? "PRÁVĚ HRAJEME" : "PŘÍŠTÍ SOUPEŘ"}
      </span>
      {!match ? (
        <p>
          Ve vybrané sezóně není další naplánované utkání se známým budoucím
          termínem.
        </p>
      ) : (
        <>
          <div className="next-opponent-heading">
            <h4>
              {opponent ? (
                <Link
                  href={teamSeasonHref(opponent.id, seasonId)}
                  prefetch={false}
                >
                  <TeamLogo team={opponent} size={32} />
                  <span>{opponent.name}</span>
                </Link>
              ) : (
                "Soupeř zatím není uveden"
              )}
            </h4>
            <span className="next-opponent-location">
              {opponentHome ? "Hrajeme venku" : "Hrajeme doma"}
            </span>
          </div>
          <p>
            <time dateTime={match.date ?? undefined}>
              {dayLabel(match.date, true)}
              {match.time ? ` · ${match.time.slice(0, 5)}` : " · čas neurčen"}
            </time>
            {match.round ? ` · ${match.round}. kolo` : ""}
          </p>
          <p className="muted">
            {match.competition?.name ?? "Soutěž neuvedena"}
          </p>
          <p className="next-opponent-venue">
            {match.venue?.name ?? "Kuželna zatím není uvedena"}
            {address && <span>{address}</span>}
          </p>
          <div className="next-opponent-actions">
            <Link href={`/matches/${match.id}`} prefetch={false}>
              Detail zápasu
            </Link>
            {directions && (
              <a href={directions} target="_blank" rel="noopener noreferrer">
                Navigovat na kuželnu
                <span className="sr-only"> (otevře se v nové kartě)</span>
              </a>
            )}
          </div>
          {opponent && match.competition && (
            <OpponentStatistics
              key={`${match.id}:${opponent.id}:${seasonId}`}
              match={match}
              opponent={opponent}
              seasonId={seasonId}
              opponentHome={opponentHome}
            />
          )}
        </>
      )}
      {hasUnscheduled && (
        <p className="muted">
          V rozpisu je také neodehrané utkání bez určeného termínu.
        </p>
      )}
    </section>
  );
}
