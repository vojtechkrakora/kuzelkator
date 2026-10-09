"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { playerName, type Competition } from "@/domain/models";
import type { PlayerProfile } from "@/domain/players";
import {
  statMetrics,
  teamPlayerAverage,
  type PlayerAverageView,
  type PlayerAggregate,
} from "@/domain/player-statistics";
import { getData } from "@/lib/client-api";
import { ErrorNotice, Freshness } from "./common";
import { FollowPlayerButton } from "./player-pages";

type Roster = {
  items: PlayerProfile[];
  total: number;
  competitions?: Competition[];
};
const number = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("cs", { maximumFractionDigits: 2 }).format(value);

export function TeamPlayers({
  teamId,
  seasonId,
  seasonName,
}: {
  teamId: string;
  seasonId: string;
  seasonName?: string;
}) {
  const [view, setView] = useState<PlayerAverageView>("all");
  const viewLabel =
    view === "home" ? "Doma" : view === "away" ? "Venku" : "Celkem";
  const averageLabel =
    view === "all" ? "Průměr" : `Průměr ${viewLabel.toLowerCase()}`;
  const [chosen, setChosen] = useState("");
  const roster = useQuery({
    queryKey: ["team-roster", teamId, seasonId],
    enabled: !!seasonId,
    queryFn: ({ signal }) =>
      getData<Roster>({ kind: "team-roster", teamId, seasonId }, signal),
    staleTime: 3600000,
  });
  const competitions = roster.data?.data.competitions ?? [];
  const selected =
    competitions.find((c) => String(c.id) === chosen) ?? competitions[0];
  const stats = useQuery({
    queryKey: ["team-player-statistics", teamId, seasonId, selected?.id],
    enabled: !!seasonId && !!selected,
    queryFn: ({ signal }) =>
      getData<{ items: PlayerAggregate[]; total: number }>(
        {
          kind: "team-player-statistics",
          teamId,
          seasonId,
          competitionId: selected!.id,
        },
        signal,
      ),
    staleTime: 600000,
  });
  const players = new Map<
    number,
    { player: PlayerProfile; rows: PlayerAggregate[] }
  >();
  if (stats.data) {
    for (const row of stats.data.data.items) {
      const entry = players.get(row.player.id) ?? {
        player: row.player,
        rows: [] as PlayerAggregate[],
      };
      entry.rows.push(row);
      players.set(row.player.id, entry);
    }
  } else if (!selected || stats.isError) {
    for (const player of roster.data?.data.items ?? [])
      players.set(player.id, { player, rows: [] });
  }
  const list = [...players.values()].sort((a, b) =>
    `${a.player.lastName ?? ""} ${a.player.firstName ?? ""}`.localeCompare(
      `${b.player.lastName ?? ""} ${b.player.firstName ?? ""}`,
      "cs",
    ),
  );
  return (
    <section className="team-roster" aria-labelledby="team-roster-title">
      <div className="team-roster-heading">
        <div>
          <span className="section-kicker">
            HRÁČI A STATISTIKY {seasonName}
          </span>
          <h4 id="team-roster-title">Hráči týmu</h4>
        </div>
        <span className="team-roster-count">{list.length} hráčů</span>
      </div>
      <p className="stats-note">
        Hráči evidovaní ve výsledcích ČKA, nikoli úplná oficiální soupiska.
        Průměr průměrů dává každé kuželně stejnou váhu.
      </p>
      {competitions.length > 1 ? (
        <label className="stats-select">
          Soutěž statistik
          <select
            value={selected?.id ?? ""}
            onChange={(e) => setChosen(e.target.value)}
          >
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        selected && <p className="team-player-competition">{selected.name}</p>
      )}
      {selected && (
        <>
          <div
            className="team-player-view"
            role="group"
            aria-label="Pohled na průměry hráčů"
          >
            {(
              [
                ["all", "Celkem"],
                ["home", "Doma"],
                ["away", "Venku"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setView(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {view !== "all" && (
            <p className="stats-note">
              Průměry {viewLabel.toLowerCase()} podle role týmu v zápase, nikoli
              podle konkrétní kuželny. Počty zápasů, pozice a střídání jsou za
              celou sezónu ve vybrané soutěži. Průměr průměrů pro tento pohled
              není dostupný. Pomlčka znamená nedostupný průměr.
            </p>
          )}
        </>
      )}
      {roster.isPending && <p role="status">Načítání hráčů…</p>}
      {roster.isError && (
        <ErrorNotice
          retry={() => void roster.refetch()}
          message="Hráče týmu se nepodařilo načíst. Zápasy zůstávají dostupné níže."
        />
      )}
      {selected && stats.isPending && (
        <p role="status">Načítání statistik hráčů…</p>
      )}
      {selected && stats.isError && (
        <>
          <ErrorNotice
            retry={() => void stats.refetch()}
            message="Statistiky soutěže se nepodařilo načíst."
          />
          <p className="stats-note">
            Níže je seznam hráčů za celou vybranou sezónu bez statistik.
          </p>
        </>
      )}
      {stats.data && <Freshness {...stats.data} />}
      {roster.data && !selected && !list.length && (
        <p className="empty-copy">
          V této sezóně zatím nejsou evidovaní hráči týmu.
        </p>
      )}
      {stats.data && !list.length && (
        <p className="empty-copy">
          V této soutěži zatím nejsou zveřejněné statistiky hráčů.
        </p>
      )}
      <ul
        className="team-player-cards"
        key={`${teamId}-${seasonId}-${selected?.id}`}
      >
        {list.map(({ player, rows }) => {
          const total = rows.find((r) => r.type === "TOTAL");
          const average = (
            row: PlayerAggregate | undefined,
            field: "averageResult" | "averagePerformance",
          ) => (row && row.matches > 0 ? row[field] : null);
          const positions = Object.entries(total?.positionStarts ?? {})
            .filter(([, count]) => count > 0)
            .sort(([a], [b]) => Number(a) - Number(b));
          return (
            <li key={player.id} className="team-player-card">
              <div className="team-player-identity">
                <Link
                  prefetch={false}
                  href={`/players/${player.id}?season=${seasonId}`}
                >
                  {playerName(player)}
                </Link>
                <FollowPlayerButton player={player} iconOnly />
              </div>
              {!!rows.length && (
                <>
                  <dl
                    className={`team-player-summary${view !== "all" ? " team-player-summary-filtered" : ""}`}
                  >
                    <div>
                      <dt>{view === "all" ? "Zápasy" : "Zápasy za sezónu"}</dt>
                      <dd>{number(total?.matches)}</dd>
                    </div>
                    <div>
                      <dt>{averageLabel}</dt>
                      <dd>{number(teamPlayerAverage(total, total, view))}</dd>
                    </div>
                    {view === "all" && (
                      <div>
                        <dt>Průměr průměrů</dt>
                        <dd>{number(average(total, "averagePerformance"))}</dd>
                      </div>
                    )}
                  </dl>
                  <details>
                    <summary>
                      Podrobné statistiky
                      {view !== "all" ? ` — ${viewLabel.toLowerCase()}` : ""}
                      <span className="sr-only"> — {playerName(player)}</span>
                    </summary>
                    <table className="team-player-breakdown">
                      <caption className="sr-only">
                        Průměry hráče {playerName(player)} — {viewLabel}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Výkon</th>
                          <th scope="col">{averageLabel}</th>
                          {view === "all" && (
                            <th scope="col">Průměr průměrů</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {statMetrics
                          .filter((m) => m.type !== "TOTAL")
                          .map((m) => {
                            const row = rows.find((r) => r.type === m.type);
                            return (
                              <tr key={m.type}>
                                <th scope="row">{m.label}</th>
                                <td>
                                  {number(teamPlayerAverage(row, total, view))}
                                </td>
                                {view === "all" && (
                                  <td>
                                    {number(average(row, "averagePerformance"))}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    <p className="team-player-positions">
                      <strong>
                        Pozice v sestavě{view !== "all" ? " za sezónu" : ""}
                      </strong>
                      <span>
                        {positions.length
                          ? positions
                              .map(
                                ([position, count]) =>
                                  `${position}. pozice: ${count}×`,
                              )
                              .join(" · ")
                          : "Pozice nejsou zveřejněné."}
                      </span>
                    </p>
                    <p className="stats-note">
                      Střídání{view !== "all" ? " za sezónu" : ""}:{" "}
                      {number(total?.substituteStarts)} · Průměry dle statistik
                      ČKA.
                    </p>
                  </details>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
