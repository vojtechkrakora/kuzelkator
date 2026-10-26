"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { StatisticsGlossary } from "./statistics-glossary";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { playerName, type Competition } from "@/domain/models";
import {
  orderCompetitionPlayers,
  type PlayerRankingOrder,
  type CompetitionPlayerTable,
} from "@/domain/competition-player-standings";
import { normaliseName } from "@/domain/players";
import { getData } from "@/lib/client-api";
import { teamSeasonHref } from "@/lib/team-navigation";
import { usePreferences } from "./providers";
import { FollowPlayerButton } from "./player-pages";
import { Freshness } from "./common";
import { CompetitionBestPerformances } from "./competition-best-performances";

export function CompetitionStandings({
  competition,
  seasonId,
  seasonName,
  children,
}: {
  competition: Competition;
  seasonId: string;
  seasonName?: string;
  children: ReactNode;
}) {
  const [view, setView] = useState<"teams" | "players" | "best">("teams");
  return (
    <>
      <div
        className="competition-standings-switch team-player-view"
        role="group"
        aria-label="Pořadí v soutěži"
      >
        <button
          type="button"
          aria-pressed={view === "teams"}
          onClick={() => setView("teams")}
        >
          Družstva
        </button>
        <button
          type="button"
          aria-pressed={view === "players"}
          onClick={() => setView("players")}
        >
          Hráči
        </button>
        <button
          type="button"
          aria-pressed={view === "best"}
          onClick={() => setView("best")}
        >
          Nejlepší výkony
        </button>
      </div>
      <Link
        className="competition-print-link"
        prefetch={false}
        href={`/competitions/${encodeURIComponent(competition.slug)}/print?${new URLSearchParams({ name: competition.name, competition: String(competition.id), season: seasonId, ...(seasonName ? { seasonName } : {}) })}`}
      >
        <Printer size={16} aria-hidden="true" /> Tisk soutěže
      </Link>
      {view === "teams" ? (
        children
      ) : view === "best" ? (
        <CompetitionBestPerformances
          competition={competition}
          seasonId={seasonId}
          seasonName={seasonName}
        />
      ) : (
        <CompetitionPlayerStandings
          competition={competition}
          seasonId={seasonId}
          seasonName={seasonName}
        />
      )}
    </>
  );
}
const num = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 2 }).format(
        value,
      );
function CompetitionPlayerStandings({
  competition,
  seasonId,
  seasonName,
}: {
  competition: Competition;
  seasonId: string;
  seasonName?: string;
}) {
  const [type, setType] = useState<"ALL" | "HOME" | "AWAY">("ALL");
  const [round, setRound] = useState<number | undefined>();
  const [order, setOrder] = useState<PlayerRankingOrder>("average");
  const [search, setSearch] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [limit, setLimit] = useState(25);
  const { players, ready } = usePreferences();
  const query = useQuery({
    queryKey: [
      "competition-player-standings",
      competition.slug,
      seasonId,
      round,
      type,
    ],
    queryFn: ({ signal }) =>
      getData<CompetitionPlayerTable>(
        {
          kind: "competition-player-standings",
          slug: competition.slug,
          type,
          ...(round == null ? {} : { round }),
        },
        signal,
      ),
  });
  const favoriteIds = new Set(players.map((p) => p.id));
  const words = normaliseName(search).split(/\s+/).filter(Boolean);
  const rows = orderCompetitionPlayers(
    query.data?.data.items ?? [],
    order,
  ).filter(
    (row) =>
      (!onlyFavorites || favoriteIds.has(row.player.id)) &&
      words.every((word) =>
        normaliseName(`${playerName(row.player)} ${row.team.name}`).includes(
          word,
        ),
      ),
  );
  const actualRound = query.data?.data.round;
  const expectedRound = round ?? query.data?.data.latestStartedRound;
  const label = type === "HOME" ? "Doma" : type === "AWAY" ? "Venku" : "Celkem";
  const qualificationGroup = (row: (typeof rows)[number]) =>
    order === "official"
      ? "official"
      : row.qualification === null
        ? "unknown"
        : row.qualification?.eligible === false
          ? "below"
          : "qualified";
  const discipline = competition.discipline?.replace(/^T(\d+)$/, "$1 HS");
  return (
    <section
      className="competition-player-table"
      aria-label="Pořadí hráčů v soutěži"
    >
      <div className="section-title">
        <div>
          <span className="section-kicker">POŘADÍ HRÁČŮ</span>
          <h2>{competition.name}</h2>
          <p className="muted">
            {seasonName ?? `Sezóna ${seasonId}`}
            {discipline ? ` · ${discipline}` : ""}
          </p>
        </div>
      </div>
      <div
        className="team-player-view"
        role="group"
        aria-label="Pohled pořadí hráčů"
      >
        {(
          [
            ["ALL", "Celkem"],
            ["HOME", "Doma"],
            ["AWAY", "Venku"],
          ] as const
        ).map(([value, title]) => (
          <button
            key={value}
            type="button"
            aria-pressed={type === value}
            onClick={() => {
              setType(value);
              setLimit(25);
            }}
          >
            {title}
          </button>
        ))}
      </div>
      <div className="player-table-round">
        <label>
          Kolo{" "}
          <input
            aria-label="Kolo pořadí hráčů"
            type="number"
            min={1}
            max={1000}
            value={round ?? ""}
            placeholder="Aktuální"
            onChange={(e) => {
              const value = e.target.value;
              const n = Number(value);
              if (
                value === "" ||
                (Number.isInteger(n) && n >= 1 && n <= 1000)
              ) {
                setRound(value === "" ? undefined : n);
                setLimit(25);
              }
            }}
          />
        </label>
        {round != null && (
          <button
            className="button"
            onClick={() => {
              setRound(undefined);
              setLimit(25);
            }}
          >
            Aktuální pořadí
          </button>
        )}
      </div>
      <StatisticsGlossary
        context="pořadí hráčů"
        items={[
          "rank",
          "officialAverage",
          "starts",
          "playerPoints",
          "homeAway",
          "missing",
        ]}
      />
      <label className="player-table-order">
        Řadit podle
        <select
          value={order}
          onChange={(e) => {
            setOrder(e.target.value as PlayerRankingOrder);
            setLimit(25);
          }}
        >
          <option value="average">Průměru od nejvyššího</option>
          <option value="official">Oficiálního pořadí ČKA</option>
        </select>
      </label>
      <p className="player-table-note">
        {order === "average" ? "Pořadí podle průměru" : "Oficiální pořadí ČKA"}{" "}
        · {label}
        {actualRound != null ? ` · tabulka ${actualRound}. kola` : ""}. Průměr a
        body přebíráme od ČKA.
        {order === "average"
          ? " Pro zařazení je potřeba alespoň 3/5 různých odehraných kuželen týmu, zaokrouhleno nahoru. Shodné průměry sdílejí pořadí. Nejde o oficiální pořadí ČKA."
          : " Pořadí ČKA zachováváme beze změny."}
      </p>
      {order === "average" && (
        <p className="player-table-note muted">
          Počítají se pouze dohrané zápasy do zobrazeného kola. Kuželna se
          počítá jednou; při pohledu Doma nebo Venku platí podmínka pro tento
          pohled. Při chybějících údajích kvalifikaci neodhadujeme.
        </p>
      )}
      {actualRound != null &&
        expectedRound != null &&
        actualRound < expectedRound && (
          <p className="notice" role="status">
            Tabulka {expectedRound}. kola není dostupná. Zobrazujeme poslední
            dostupné {actualRound}. kolo.
          </p>
        )}
      {actualRound != null && (
        <p className="muted player-table-note">
          Kolo může být rozehrané; tabulka obsahuje právě zveřejněné výsledky.
          Body jsou získané body hráče.
        </p>
      )}
      <div className="player-table-filters">
        <label>
          Najít hráče nebo tým
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(25);
            }}
          />
        </label>
        <label className="player-table-favorites">
          <input
            type="checkbox"
            checked={onlyFavorites}
            disabled={!ready}
            onChange={(e) => {
              setOnlyFavorites(e.target.checked);
              setLimit(25);
            }}
          />{" "}
          Jen moji hráči
        </label>
      </div>
      {query.isPending && <p role="status">Načítání pořadí hráčů…</p>}
      {query.isError && (
        <div className="notice error" role="alert">
          <p>Pořadí hráčů se nepodařilo načíst.</p>
          <button className="button" onClick={() => void query.refetch()}>
            Zkusit znovu
          </button>
        </div>
      )}
      {query.data && (
        <>
          <Freshness
            checkedAt={query.data.checkedAt}
            stale={query.data.stale}
          />
          {!query.data.data.items.length ? (
            <p>Pořadí hráčů pro tento pohled zatím není zveřejněné.</p>
          ) : !rows.length ? (
            <p>
              {onlyFavorites
                ? "V tomto pořadí nejsou hráči odpovídající vašim oblíbeným a hledání."
                : "Žádný hráč neodpovídá hledání."}
            </p>
          ) : (
            <>
              <p className="muted player-table-count">
                Zobrazeno {Math.min(limit, rows.length)} z {rows.length} hráčů
                {rows.length !== query.data.data.total
                  ? ` (celkem ${query.data.data.total})`
                  : ""}
              </p>
              <ol className="competition-player-list">
                {rows.slice(0, limit).map((row, index) => (
                  <li
                    key={`${row.player.id}:${row.team.id}`}
                    className={
                      favoriteIds.has(row.player.id) ? "is-favorite" : ""
                    }
                  >
                    {qualificationGroup(row) !== "qualified" &&
                      qualificationGroup(row) !== "official" &&
                      (index === 0 ||
                        qualificationGroup(rows[index - 1]) !==
                          qualificationGroup(row)) && (
                        <p className="player-qualification-divider">
                          {qualificationGroup(row) === "below"
                            ? "Pod čarou · nedostatečný počet kuželen"
                            : "Kvalifikaci nelze ověřit"}
                        </p>
                      )}
                    <div className="player-standing-identity">
                      <span
                        className="player-standing-position"
                        aria-label={`Pořadí ${order === "average" ? "podle průměru" : "ČKA"} ${row.displayPosition ?? "neuvedeno"}`}
                      >
                        {row.displayPosition != null
                          ? `${row.displayPosition}.`
                          : "—"}
                      </span>
                      <div>
                        <Link
                          className="player-standing-name"
                          href={`/players/${row.player.id}?season=${encodeURIComponent(seasonId)}`}
                        >
                          {playerName(row.player)}
                        </Link>
                        <Link
                          className="player-standing-team"
                          href={teamSeasonHref(row.team.id, seasonId)}
                        >
                          {row.team.name}
                        </Link>
                        {favoriteIds.has(row.player.id) && (
                          <span className="sr-only">Oblíbený hráč</span>
                        )}
                      </div>
                      <FollowPlayerButton player={row.player} iconOnly />
                    </div>
                    <dl>
                      <div>
                        <dt>Starty</dt>
                        <dd>{num(row.matches)}</dd>
                      </div>
                      <div>
                        <dt>Průměr</dt>
                        <dd>
                          {num(row.matches > 0 ? row.averagePerformance : null)}
                        </dd>
                      </div>
                      <div>
                        <dt>Body</dt>
                        <dd>{num(row.teamPointsWon)}</dd>
                      </div>
                    </dl>
                    {order === "average" && row.qualification !== undefined && (
                      <p className="player-qualification-note">
                        {row.qualification
                          ? `Kuželny ${num(row.venuesPlayed)}/${row.qualification.teamVenuesPlayed} · potřeba ${row.qualification.requiredVenues}`
                          : "Chybí údaje o odehraných kuželnách."}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              {limit < rows.length && (
                <button
                  className="button player-table-more"
                  onClick={() => setLimit((n) => n + 25)}
                >
                  Zobrazit dalších {Math.min(25, rows.length - limit)} hráčů
                </button>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
