"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { playerName, type Competition } from "@/domain/models";
import type { BestPerformances } from "@/domain/best-performances";
import { getData } from "@/lib/client-api";
import { dayLabel } from "@/lib/dates";
import { teamSeasonHref } from "@/lib/team-navigation";
import { ErrorNotice, Freshness } from "./common";
import { FollowPlayerButton } from "./player-pages";
import { usePreferences } from "./providers";

export function CompetitionBestPerformances({
  competition,
  seasonId,
  seasonName,
}: {
  competition: Competition;
  seasonId: string;
  seasonName?: string;
}) {
  const discipline = competition.discipline;
  const supported = ["T200", "T120", "T100", "T60", "T40"].includes(
    discipline ?? "",
  );
  const query = useQuery({
    queryKey: [
      "competition-best-performances",
      competition.id,
      seasonId,
      discipline,
    ],
    enabled: supported,
    queryFn: ({ signal }) =>
      getData<BestPerformances>(
        {
          kind: "competition-best-performances",
          competitionId: competition.id,
          seasonId,
          discipline: discipline!,
        },
        signal,
      ),
    staleTime: 300000,
  });
  const { players } = usePreferences();
  const favorites = new Set(players.map((p) => p.id));
  return (
    <section
      className="competition-best-performances"
      aria-label="Nejlepší výkony soutěže"
    >
      <div className="section-title">
        <div>
          <span className="section-kicker">NEJLEPŠÍ VÝKONY SEZÓNY</span>
          <h2>{competition.name}</h2>
          <p className="muted">
            {seasonName ?? `Sezóna ${seasonId}`}
            {supported ? ` · ${discipline!.slice(1)} HS` : ""}
          </p>
        </div>
      </div>
      <p className="muted">
        20 nejlepších samostatných výkonů z dohraných zápasů, včetně všech shod
        na posledním místě. Střídané a neobsazené pozice nezapočítáváme. Jeden
        hráč zde může být vícekrát.
      </p>
      {!supported ? (
        <p className="empty-copy">
          Pro tuto soutěž není dostupná podporovaná disciplína.
        </p>
      ) : (
        <>
          {query.isPending && <p role="status">Načítání nejlepších výkonů…</p>}
          {query.isError && (
            <ErrorNotice
              message="Nejlepší výkony se nepodařilo načíst."
              retry={() => void query.refetch()}
            />
          )}
          {query.data && (
            <>
              <Freshness {...query.data} />
              {!query.data.data.items.length ? (
                <p className="empty-copy">
                  Zatím nejsou dostupné samostatné výkony z dohraných zápasů
                  této sezóny.
                </p>
              ) : (
                <ol className="best-performance-list">
                  {query.data.data.items.map((row) => (
                    <li
                      key={`${row.matchId}:${row.team.id}:${row.player.id}`}
                      className={
                        favorites.has(row.player.id)
                          ? "best-performance-favorite"
                          : undefined
                      }
                    >
                      <div className="best-performance-heading">
                        <span
                          className="best-performance-rank"
                          aria-label={`Pořadí ${row.rank}`}
                        >
                          {row.rank}.
                        </span>
                        <div className="best-performance-player">
                          <Link
                            prefetch={false}
                            href={`/players/${row.player.id}?season=${seasonId}`}
                          >
                            {playerName(row.player)}
                          </Link>
                          <Link
                            prefetch={false}
                            href={teamSeasonHref(row.team.id, seasonId)}
                          >
                            {row.team.name}
                          </Link>
                        </div>
                        <FollowPlayerButton player={row.player} iconOnly />
                      </div>
                      <div className="best-performance-result">
                        <strong>
                          {row.performance}
                          <small> kuželek</small>
                        </strong>
                        <span>
                          Plné {row.full ?? "—"} · Dorážka {row.spare ?? "—"} ·
                          Chyby {row.errors ?? "—"}
                        </span>
                      </div>
                      <div className="best-performance-match">
                        <span>{row.venue ?? "Kuželna neuvedena"}</span>
                        <Link
                          prefetch={false}
                          href={`/matches/${row.matchId}`}
                          aria-label={`Detail zápasu · ${playerName(row.player)} · ${dayLabel(row.date)}`}
                        >
                          {dayLabel(row.date)} · Detail zápasu →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
