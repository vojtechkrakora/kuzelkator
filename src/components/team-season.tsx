"use client";

import { TeamLogo } from "./team-logo";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { Match } from "@/domain/models";
import { resultFor, statusLabel } from "@/domain/models";
import { getData } from "@/lib/client-api";
import { ErrorNotice, FollowButton, Freshness } from "./common";

function matchDate(value: string | null) {
  if (!value) return "Termín neurčen";
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? "Termín neurčen"
    : new Intl.DateTimeFormat("cs", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        timeZone: "Europe/Prague",
      }).format(date);
}
export function TeamSeason({
  teamId,
  seasonId,
  teamName,
  seasonName,
}: {
  teamId: string;
  seasonId: string;
  teamName?: string;
  seasonName?: string;
}) {
  const matches = useQuery({
    queryKey: ["team-season", teamId, seasonId],
    enabled: !!seasonId,
    queryFn: ({ signal }) =>
      getData<{ items: Match[]; total: number }>(
        { kind: "team-season", teamId, seasonId },
        signal,
      ),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
  const items = matches.data?.data.items ?? [];
  const team = items
    .flatMap((match) => [match.homeTeam, match.awayTeam])
    .find((team) => String(team?.id) === teamId);
  const name = teamName ?? team?.name ?? "Vybraný tým";
  const played = items.filter((match) =>
    ["FINISHED", "FORFEIT"].includes(match.status),
  ).length;
  const multipleCompetitions =
    new Set(items.map((match) => match.competition?.id)).size > 1;
  return (
    <section className="team-season" aria-label="Zápasy týmu za celou sezónu">
      <div className="season-summary">
        <div>
          <span className="section-kicker">CELÁ SEZÓNA {seasonName}</span>
          <h3>
            <TeamLogo team={team} size={36} /> {name}{" "}
            {team && <FollowButton team={team} />}
          </h3>
          <p>
            Odehráno {played} z {items.length} zápasů · domácí tým vždy první
          </p>
        </div>
        {matches.data && <Freshness {...matches.data} />}
      </div>
      {matches.isPending && <p role="status">Načítání celé sezóny…</p>}
      {matches.isError && (
        <ErrorNotice
          retry={() => void matches.refetch()}
          message="Zápasy týmu se nepodařilo načíst."
        />
      )}
      {matches.data && !items.length && (
        <p className="empty-copy">
          Pro tento tým nejsou ve vybrané sezóně zveřejněné žádné zápasy.
        </p>
      )}
      {!!items.length && (
        <table className="season-matches">
          <caption className="sr-only">
            {name} — všechny zápasy sezóny {seasonName}
          </caption>
          <thead>
            <tr>
              <th scope="col">Termín</th>
              <th scope="col">Domácí / Hosté</th>
              <th scope="col">Body</th>
              <th scope="col">Kuželky</th>
            </tr>
          </thead>
          {items.map((match) => {
            const hasScore = ["FINISHED", "FORFEIT", "IN_PROGRESS"].includes(
              match.status,
            );
            return (
              <tbody
                key={match.id}
                className={hasScore ? "has-result" : "upcoming-match"}
              >
                {[true, false].map((isHome) => {
                  const side = isHome ? match.homeTeam : match.awayTeam;
                  const result = resultFor(match, isHome);
                  return (
                    <tr key={String(isHome)}>
                      {isHome && (
                        <td rowSpan={2}>
                          <time dateTime={match.date ?? undefined}>
                            {matchDate(match.date)}
                          </time>
                          <small>{match.time?.slice(0, 5)}</small>
                          <small>
                            {match.round ? `${match.round}. kolo · ` : ""}
                            {statusLabel(match.status)}
                          </small>
                          {multipleCompetitions && (
                            <small>{match.competition?.name}</small>
                          )}
                        </td>
                      )}
                      <th scope="row">
                        <Link
                          prefetch={false}
                          href={`/matches/${match.id}`}
                          aria-label={
                            isHome
                              ? `Detail zápasu ${match.homeTeam?.name ?? "Domácí"} – ${match.awayTeam?.name ?? "Hosté"}`
                              : undefined
                          }
                          className={
                            String(side?.id) === teamId ? "followed-side" : ""
                          }
                        >
                          <TeamLogo team={side} size={22} />
                          <span>
                            {side?.name ??
                              (isHome
                                ? "Domácí tým neuveden"
                                : "Hostující tým neuveden")}
                          </span>
                        </Link>
                      </th>
                      <td className="season-score">
                        {hasScore ? (result?.teamPoints ?? "—") : "—"}
                      </td>
                      <td className="season-pins">
                        {hasScore ? (result?.totalPerformance ?? "—") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      )}
    </section>
  );
}
