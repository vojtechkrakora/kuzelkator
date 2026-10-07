"use client";

import { useFeedReturn } from "./feed-navigation";
import { TeamLogo } from "./team-logo";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { Match } from "@/domain/models";
import { playerName, resultFor, statusLabel } from "@/domain/models";
import type { PlayerProfile } from "@/domain/players";
import { getData } from "@/lib/client-api";
import { ErrorNotice, FollowButton, Freshness } from "./common";
import { teamSeasonHref } from "@/lib/team-navigation";
import { FollowPlayerButton } from "./player-pages";
import { teamForm } from "@/domain/team-form";

const formLabels = {
  win: { letter: "V", label: "Výhra" },
  draw: { letter: "R", label: "Remíza" },
  loss: { letter: "P", label: "Prohra" },
  unknown: { letter: "?", label: "Výsledek nezveřejněn" },
};

type Page<T> = { items: T[]; total: number };

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
  onChooseTeam,
}: {
  teamId: string;
  seasonId: string;
  teamName?: string;
  seasonName?: string;
  onChooseTeam: (id: string) => void;
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
  const roster = useQuery({
    queryKey: ["team-roster", teamId, seasonId],
    enabled: !!seasonId,
    queryFn: ({ signal }) =>
      getData<Page<PlayerProfile>>(
        { kind: "team-roster", teamId, seasonId },
        signal,
      ),
    staleTime: 3600000,
  });
  useFeedReturn(!!matches.data);
  const items = matches.data?.data.items ?? [];
  const form = teamForm(items, teamId);
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
      {matches.data && (
        <section className="team-form" aria-labelledby="team-form-title">
          <h4 id="team-form-title">Forma týmu</h4>
          {form.length ? (
            <>
              <p>Poslední dohrané zápasy · nejnovější vpravo →</p>
              <ol className="team-form-list">
                {form.map(
                  ({ match, outcome, points, opponentPoints, opponent }) => {
                    const { letter, label } = formLabels[outcome];
                    const description = `${label} · ${opponent?.name ?? "Soupeř"}${outcome === "unknown" ? "" : ` · ${points}:${opponentPoints}`} · ${matchDate(match.date)}`;
                    return (
                      <li key={match.id}>
                        <Link
                          prefetch={false}
                          href={`/matches/${match.id}`}
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
              <p className="team-form-legend">
                V – výhra · R – remíza · P – prohra
              </p>
            </>
          ) : (
            <p>Zatím žádné dohrané zápasy se známým datem v této sezóně.</p>
          )}
        </section>
      )}
      <section className="team-roster" aria-labelledby="team-roster-title">
        <div className="team-roster-heading">
          <div>
            <span className="section-kicker">SOUPISKA</span>
            <h4 id="team-roster-title">Hráči týmu</h4>
          </div>
          {roster.data && (
            <span className="team-roster-count">
              {roster.data.data.total} hráčů
            </span>
          )}
        </div>
        {roster.isPending && <p role="status">Načítání soupisky…</p>}
        {roster.isError && (
          <ErrorNotice
            retry={() => void roster.refetch()}
            message="Soupisku týmu se nepodařilo načíst. Zápasy zůstávají dostupné níže."
          />
        )}
        {roster.data && !roster.data.data.items.length && (
          <p className="empty-copy">
            Pro tento tým není ve vybrané sezóně zveřejněná soupiska.
          </p>
        )}
        {!!roster.data?.data.items.length && (
          <ul className="team-roster-list">
            {roster.data.data.items.map((player) => (
              <li key={player.id}>
                <Link prefetch={false} href={`/players/${player.id}`}>
                  {playerName(player)}
                </Link>
                <FollowPlayerButton player={player} iconOnly />
              </li>
            ))}
          </ul>
        )}
      </section>
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
                          <Link
                            prefetch={false}
                            href={`/matches/${match.id}`}
                            className="season-match-link"
                            aria-label={`Detail zápasu ${match.homeTeam?.name ?? "Domácí"} – ${match.awayTeam?.name ?? "Hosté"}`}
                          >
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
                          </Link>
                        </td>
                      )}
                      <th scope="row">
                        {side ? (
                          <Link
                            prefetch={false}
                            href={teamSeasonHref(side.id, seasonId)}
                            onNavigate={(event) => {
                              event.preventDefault();
                              onChooseTeam(String(side.id));
                            }}
                            className={
                              String(side.id) === teamId
                                ? "followed-side season-team-link"
                                : "season-team-link"
                            }
                          >
                            <TeamLogo team={side} size={22} />
                            <span>{side.name}</span>
                          </Link>
                        ) : (
                          <span className="season-team-link">
                            <TeamLogo team={side} size={22} />
                            <span>
                              {isHome
                                ? "Domácí tým neuveden"
                                : "Hostující tým neuveden"}
                            </span>
                          </span>
                        )}
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
