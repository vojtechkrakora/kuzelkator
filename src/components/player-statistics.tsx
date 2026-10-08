"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  completePlayerPerformances,
  statMetrics,
  type PlayerStatistics,
} from "@/domain/player-statistics";
import type { PlayerHistory } from "@/domain/players";
import { getData } from "@/lib/client-api";
import { dayLabel } from "@/lib/dates";
import { ErrorNotice, Freshness } from "./common";

const number = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("cs", { maximumFractionDigits: 2 }).format(value);

export function PlayerStatisticsSection({
  playerId,
  seasonId,
  history,
}: {
  playerId: number;
  seasonId: string;
  history?: PlayerHistory[];
}) {
  const [selection, setSelection] = useState("");
  const stats = useQuery({
    queryKey: ["player-statistics", playerId, seasonId],
    enabled: !!seasonId,
    queryFn: ({ signal }) =>
      getData<{ items: PlayerStatistics[]; total: number }>(
        { kind: "player-statistics", id: playerId, seasonId },
        signal,
      ),
    staleTime: 600000,
  });
  const items = stats.data?.data.items ?? [];
  const key = (s: PlayerStatistics) => `${s.competition.id}-${s.team.id}`;
  const selected = items.find((s) => key(s) === selection) ?? items[0];
  return (
    <section
      className="player-statistics"
      aria-labelledby="player-statistics-title"
    >
      <div className="stats-heading">
        <div>
          <span className="section-kicker">ČÍSLA A FORMA</span>
          <h2 id="player-statistics-title">Statistiky sezóny</h2>
        </div>
        {stats.data && <Freshness {...stats.data} />}
      </div>
      {stats.isPending && <p role="status">Načítání statistik…</p>}
      {stats.isError && (
        <ErrorNotice
          retry={() => void stats.refetch()}
          message="Statistiky se nepodařilo načíst. Výsledky zápasů jsou dostupné níže."
        />
      )}
      {stats.data && !items.length && (
        <p className="empty-copy">
          Pro tuto sezónu zatím nejsou zveřejněné statistiky.
        </p>
      )}
      {selected && (
        <>
          {items.length > 1 ? (
            <label className="stats-select">
              Soutěž a tým
              <select
                value={key(selected)}
                onChange={(e) => setSelection(e.target.value)}
              >
                {items.map((s) => (
                  <option key={key(s)} value={key(s)}>
                    {s.competition.name} · {s.team.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="stats-context">
              {selected.competition.name} · {selected.team.name}
            </p>
          )}
          <StatisticsContent
            key={`${seasonId}-${key(selected)}`}
            stats={selected}
            history={history}
            playerId={playerId}
          />
        </>
      )}
    </section>
  );
}

function StatisticsContent({
  stats,
  history,
  playerId,
}: {
  stats: PlayerStatistics;
  history?: PlayerHistory[];
  playerId: number;
}) {
  const [metric, setMetric] =
    useState<(typeof statMetrics)[number]["type"]>("TOTAL");
  const [chosen, setChosen] = useState<number | null>(null);
  const total = stats.aggregates.find((s) => s.type === "TOTAL");
  const descriptor = statMetrics.find((m) => m.type === metric)!;
  const aggregate = stats.aggregates.find((s) => s.type === metric);
  const performances = completePlayerPerformances(
    history ?? [],
    playerId,
    stats,
  );
  const points = performances.filter(
    (r) => r.teamMatchResult?.teamMatch.date && r[descriptor.field] != null,
  );
  const recent = points.slice(-12);
  const active =
    recent.find((r) => r.teamMatchResult?.teamMatch.id === chosen) ??
    recent.at(-1);
  const values = recent.map((r) => r[descriptor.field]!);
  const lower =
    Math.floor(
      (Math.min(...values, aggregate?.averageResult ?? Infinity) - 10) / 10,
    ) * 10;
  const upper =
    Math.ceil((Math.max(...values, aggregate?.averageResult ?? 0) + 10) / 10) *
    10;
  const min = Math.max(0, lower);
  const y = (v: number) => 145 - ((v - min) / Math.max(upper - min, 1)) * 120;
  const x = (i: number) =>
    recent.length === 1 ? 177 : 40 + (i * 274) / (recent.length - 1);
  const venues = new Map<
    number,
    { name: string; sum: number; count: number }
  >();
  for (const r of performances) {
    const venue = r.teamMatchResult?.teamMatch.venue;
    const value = r[descriptor.field];
    if (venue?.id == null || value == null) continue;
    const entry = venues.get(venue.id) ?? {
      name: venue.name,
      sum: 0,
      count: 0,
    };
    entry.sum += value;
    entry.count++;
    venues.set(venue.id, entry);
  }
  const alleys = [...venues]
    .map(([id, v]) => ({ ...v, id, average: v.sum / v.count }))
    .sort((a, b) => b.average - a.average);
  const maxAlley = Math.max(1, ...alleys.map((v) => v.average));
  const positions = Object.entries(total?.positionStarts ?? {}).sort(
    ([a], [b]) => Number(a) - Number(b),
  );
  const maxPosition = Math.max(1, ...positions.map(([, count]) => count));
  return (
    <>
      <div className="stats-cards">
        <div className="stats-card stats-card-primary">
          <span>Průměr průměrů</span>
          <strong>{number(total?.averagePerformance)}</strong>
          <small>Každá kuželna má stejnou váhu</small>
        </div>
        <div className="stats-card">
          <span>Průměr výkonů</span>
          <strong>{number(total?.averageResult)}</strong>
          <small>Průměr jednotlivých výkonů</small>
        </div>
        <div className="stats-card">
          <span>Získané body</span>
          <strong>
            {number(stats.teamPointsWon)} <small>bodů</small>
          </strong>
          <small>{number(stats.setPointsWon)} dílčích bodů</small>
        </div>
        <div className="stats-card">
          <span>Odehrané zápasy</span>
          <strong>{number(stats.matches)}</strong>
          <small>
            {number(stats.venuesPlayed)} kuželen ·{" "}
            {number(total?.substituteStarts)} střídání
          </small>
        </div>
      </div>
      <table className="stats-averages">
        <caption>Oficiální průměry ČKA</caption>
        <thead>
          <tr>
            <th scope="col">Výkon</th>
            <th scope="col">Průměr</th>
            <th scope="col">
              Průměr
              <br />
              průměrů
            </th>
          </tr>
        </thead>
        <tbody>
          {statMetrics.map((m) => {
            const row = stats.aggregates.find((r) => r.type === m.type);
            return (
              <tr key={m.type}>
                <th scope="row">{m.label}</th>
                <td>{number(row?.averageResult)}</td>
                <td>{number(row?.averagePerformance)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="stats-note">
        Průměr průměrů vyrovnává počet startů na různých kuželnách. Souhrny
        přebíráme z ČKA; grafy výkonů nezahrnují střídání ani nedohrané zápasy.
      </p>
      <div className="stats-metrics" role="group" aria-label="Ukazatel grafů">
        {statMetrics.map((m) => (
          <button
            key={m.type}
            type="button"
            aria-pressed={metric === m.type}
            onClick={() => setMetric(m.type)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="stats-chart-grid">
        <section className="stats-chart" aria-label="Vývoj výkonů">
          <h3>Vývoj výkonů</h3>
          <p className="stats-note">
            {descriptor.label} · posledních až 12 úplných výkonů
          </p>
          {!!recent.length && (
            <>
              <svg
                className="performance-chart"
                viewBox="0 0 340 180"
                role="img"
                aria-label={`${descriptor.label}: ${recent.map((r) => `${dayLabel(r.teamMatchResult!.teamMatch.date)} ${number(r[descriptor.field])}`).join(", ")}`}
              >
                {[min, (min + upper) / 2, upper].map((v) => (
                  <g key={v}>
                    <line
                      x1="36"
                      x2="322"
                      y1={y(v)}
                      y2={y(v)}
                      stroke="#e1e6df"
                    />
                    <text x="30" y={y(v) + 4} textAnchor="end">
                      {number(v)}
                    </text>
                  </g>
                ))}
                {aggregate?.averageResult != null && (
                  <line
                    x1="36"
                    x2="322"
                    y1={y(aggregate.averageResult)}
                    y2={y(aggregate.averageResult)}
                    stroke="#947321"
                    strokeDasharray="5 4"
                  />
                )}
                <polyline
                  points={recent
                    .map((r, i) => `${x(i)},${y(r[descriptor.field]!)}`)
                    .join(" ")}
                  fill="none"
                  stroke="#176347"
                  strokeWidth="3"
                />
                {recent.map((r, i) => (
                  <circle
                    key={r.teamMatchResult!.teamMatch.id}
                    cx={x(i)}
                    cy={y(r[descriptor.field]!)}
                    r={active === r ? 6 : 4}
                    fill="#176347"
                  />
                ))}
                <text x="40" y="174">
                  {dayLabel(recent[0].teamMatchResult!.teamMatch.date)}
                </text>
                <text x="314" y="174" textAnchor="end">
                  {recent.length > 1
                    ? dayLabel(recent.at(-1)!.teamMatchResult!.teamMatch.date)
                    : ""}
                </text>
              </svg>
              <p className="stats-note">
                Přerušovaná čára: průměr výkonů. Vyberte zápas:
              </p>
              <div className="stats-match-picker">
                {recent.map((r) => {
                  const match = r.teamMatchResult!.teamMatch;
                  return (
                    <button
                      key={match.id}
                      type="button"
                      aria-pressed={active === r}
                      onClick={() => setChosen(match.id)}
                      aria-label={`${dayLabel(match.date, true)}: ${number(r[descriptor.field])}`}
                    >
                      <small>{dayLabel(match.date)}</small>
                      <strong>{number(r[descriptor.field])}</strong>
                    </button>
                  );
                })}
              </div>
              {active && (
                <Link
                  className="stats-active-match"
                  href={`/matches/${active.teamMatchResult!.teamMatch.id}`}
                >
                  <strong>
                    {number(active[descriptor.field])} ·{" "}
                    {active.teamMatchResult!.teamMatch.venue?.name ??
                      "Kuželna neuvedena"}
                  </strong>
                  <span>
                    {dayLabel(active.teamMatchResult!.teamMatch.date, true)} ·
                    Detail zápasu →
                  </span>
                </Link>
              )}
            </>
          )}
          {!recent.length && (
            <p className="empty-copy">
              {history
                ? "Zatím nejsou úplné výkony pro tento graf."
                : "Graf se zobrazí po načtení výsledků zápasů."}
            </p>
          )}
        </section>
        <section className="stats-chart" aria-label="Průměry na kuželnách">
          <h3>Na jednotlivých kuželnách</h3>
          <p className="stats-note">
            {descriptor.label} · průměr a počet úplných výkonů
          </p>
          <ul className="stats-bars">
            {alleys.map((v) => (
              <li key={v.id}>
                <div>
                  <span>{v.name}</span>
                  <strong>{number(v.average)}</strong>
                </div>
                <div className="stats-bar-track" aria-hidden="true">
                  <span style={{ width: `${(v.average / maxAlley) * 100}%` }} />
                </div>
                <small>Počet výkonů: {v.count}</small>
              </li>
            ))}
          </ul>
          {!alleys.length && (
            <p className="empty-copy">
              Údaje o kuželnách zatím nejsou dostupné.
            </p>
          )}
        </section>
        <section className="stats-chart" aria-label="Pozice v sestavě">
          <h3>Pozice v sestavě</h3>
          <p className="stats-note">Počet startů podle oficiálních statistik</p>
          <ul className="stats-bars">
            {positions.map(([position, count]) => (
              <li key={position}>
                <div>
                  <span>{position}. pozice</span>
                  <strong>{count}×</strong>
                </div>
                <div className="stats-bar-track" aria-hidden="true">
                  <span style={{ width: `${(count / maxPosition) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {!positions.length && (
            <p className="empty-copy">Pozice zatím nejsou zveřejněné.</p>
          )}
        </section>
        <section className="stats-chart" aria-label="Doma a venku">
          <h3>Doma a venku</h3>
          <p className="stats-note">{descriptor.label} · oficiální průměry</p>
          <div className="stats-home-away">
            <div>
              <span>Doma</span>
              <strong>{number(aggregate?.homeAverage)}</strong>
            </div>
            <div>
              <span>Venku</span>
              <strong>{number(aggregate?.awayAverage)}</strong>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
