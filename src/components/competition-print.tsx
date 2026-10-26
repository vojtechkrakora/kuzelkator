"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import { playerName, type Standing } from "@/domain/models";
import {
  orderCompetitionPlayers,
  type CompetitionPlayerTable,
} from "@/domain/competition-player-standings";
import { getData } from "@/lib/client-api";

type TeamTable = {
  items: Standing[];
  total: number;
  round: number | null;
  isCurrent?: boolean;
  incompleteMatches?: number;
};
const number = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 2 }).format(
        value,
      );
const checked = (value: string) =>
  new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Prague",
  }).format(new Date(value));
const snapshot = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: false,
} as const;

export function CompetitionPrint({
  slug,
  name,
  seasonId,
  seasonName,
  competitionId,
}: {
  slug: string;
  name: string;
  seasonId?: string;
  seasonName?: string;
  competitionId?: string;
}) {
  const [includePlayers, setIncludePlayers] = useState(false);
  const [allPlayers, setAllPlayers] = useState(false);
  const [highlightTeam, setHighlightTeam] = useState("");
  const teams = useQuery({
    queryKey: ["print-teams", slug],
    queryFn: ({ signal }) =>
      getData<TeamTable>({ kind: "standings", slug, type: "ALL" }, signal),
    ...snapshot,
  });
  const players = useQuery({
    queryKey: ["print-players", slug],
    queryFn: ({ signal }) =>
      getData<CompetitionPlayerTable>(
        { kind: "competition-player-standings", slug, type: "ALL" },
        signal,
      ),
    enabled: includePlayers,
    ...snapshot,
  });
  const rows = orderCompetitionPlayers(
    players.data?.data.items ?? [],
    "average",
  );
  const included = allPlayers
    ? rows
    : rows.filter((row) => row.qualification?.eligible === true);
  const ready =
    !!teams.data &&
    !teams.isError &&
    !teams.isFetching &&
    (!includePlayers ||
      (!!players.data && !players.isError && !players.isFetching));
  const back = `/?${new URLSearchParams({ ...(competitionId ? { competition: competitionId } : {}), ...(seasonId ? { season: seasonId } : {}) })}`;
  const context = seasonName || (seasonId ? `Sezóna ${seasonId}` : "");
  const highlighted = teams.data?.data.items.find(
    (row) => String(row.team.id) === highlightTeam,
  )?.team;

  return (
    <main id="main" className="competition-print-page" data-competition-print>
      <div className="competition-print-tools">
        <Link href={back} prefetch={false}>
          <ArrowLeft size={16} aria-hidden="true" /> Zpět na přehled
        </Link>
        <h1>Tisk soutěže</h1>
        <fieldset>
          <legend>Co vytisknout</legend>
          <label>
            <input
              type="radio"
              name="print-content"
              checked={!includePlayers}
              onChange={() => setIncludePlayers(false)}
            />{" "}
            Jen tabulku družstev
          </label>
          <label>
            <input
              type="radio"
              name="print-content"
              checked={includePlayers}
              onChange={() => setIncludePlayers(true)}
            />{" "}
            Tabulku a hráče s průměry
          </label>
        </fieldset>
        {includePlayers && (
          <label className="print-player-scope">
            Hráči
            <select
              value={allPlayers ? "all" : "qualified"}
              onChange={(event) => setAllPlayers(event.target.value === "all")}
            >
              <option value="qualified">
                Jen kvalifikovaní (pravidlo 3/5)
              </option>
              <option value="all">Všichni včetně hráčů pod čarou</option>
            </select>
          </label>
        )}
        <label className="print-player-scope print-highlight-select">
          Zvýraznit tým a jeho hráče
          <select
            value={highlightTeam}
            disabled={!teams.data}
            onChange={(event) => setHighlightTeam(event.target.value)}
          >
            <option value="">Bez zvýraznění</option>
            {teams.data?.data.items.map(({ team }) => (
              <option key={team.id} value={String(team.id)}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <p className="print-help">
          A4 na výšku. Náhled se sám neobnovuje. V tiskovém dialogu lze uložit
          PDF; pro čistý výtisk vypněte záhlaví a zápatí prohlížeče.
        </p>
        <div className="print-actions">
          <button
            className="button primary"
            type="button"
            disabled={!ready}
            onClick={() => window.print()}
          >
            <Printer size={16} aria-hidden="true" /> Vytisknout / uložit PDF
          </button>
          <button
            className="button"
            type="button"
            disabled={
              teams.isFetching || (includePlayers && players.isFetching)
            }
            onClick={() => {
              void teams.refetch();
              if (includePlayers) void players.refetch();
            }}
          >
            <RefreshCw size={16} aria-hidden="true" /> Obnovit data
          </button>
        </div>
        {(teams.isFetching || (includePlayers && players.isFetching)) && (
          <p role="status">Načítání podkladů pro tisk…</p>
        )}
        {teams.isError && (
          <p role="alert">
            Tabulku družstev se nepodařilo načíst. Zkuste obnovit data.
          </p>
        )}
        {includePlayers && players.isError && (
          <p role="alert">
            Pořadí hráčů se nepodařilo načíst. Obnovte data, nebo zvolte jen
            družstva.
          </p>
        )}
      </div>
      {!ready && (
        <p className="print-not-ready">
          Podklady pro tisk nejsou připravené. Vraťte se do náhledu a dokončete
          načtení dat.
        </p>
      )}
      <article
        className="competition-print-document"
        aria-label="Náhled tisku soutěže"
        data-ready={ready}
      >
        <header className="print-heading">
          <p>Kuželkátor · Oficiální data ČKA</p>
          <h2>{name}</h2>
          {context && <p>{context} · Celkem (doma i venku)</p>}
          {highlighted && <p>Zvýrazněno: {highlighted.name}</p>}
        </header>
        {teams.data && (
          <section aria-label="Tabulka družstev pro tisk">
            <h3>Družstva</h3>
            <p className="print-data-note">
              {teams.data.data.isCurrent
                ? "Aktuální tabulka · všechny zveřejněné výsledky"
                : teams.data.data.round != null
                  ? `Tabulka k ${teams.data.data.round}. kolu`
                  : "Tabulka není zveřejněna"}
              {` · data ${checked(teams.data.checkedAt)}`}
              {teams.data.stale
                ? " · Pozor: uložená data, zdroj je nyní nedostupný"
                : ""}
            </p>
            {!!teams.data.data.incompleteMatches && (
              <p className="print-data-note">
                Průběžné pořadí: zbývá dohrát{" "}
                {teams.data.data.incompleteMatches} zápasů v zahrnutých kolech.
              </p>
            )}
            {teams.data.data.items.length ? (
              <table className="print-team-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Družstvo</th>
                    <th scope="col">Z</th>
                    <th scope="col">V</th>
                    <th scope="col">R</th>
                    <th scope="col">P</th>
                    <th scope="col">Skóre</th>
                    <th scope="col">Body</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.data.data.items.map((row) => (
                    <tr
                      key={row.team.id}
                      data-highlighted={String(row.team.id) === highlightTeam}
                    >
                      <td>{row.position}</td>
                      <th scope="row">{row.team.name}</th>
                      <td>{row.matches}</td>
                      <td>{row.wins}</td>
                      <td>{row.draws}</td>
                      <td>{row.losses}</td>
                      <td className="print-score">
                        {row.teamPointsWon != null && row.teamPointsLost != null
                          ? `${number(row.teamPointsWon)}:${number(row.teamPointsLost)}`
                          : "—"}
                      </td>
                      <td>
                        <strong>{row.tablePoints}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Pro tuto soutěž zatím není tabulka zveřejněna.</p>
            )}
            <p className="print-data-note">
              Skóre = získané : ztracené body ze zápasů. Body = tabulkové body
              družstva.
            </p>
          </section>
        )}
        {includePlayers && players.data && (
          <section aria-label="Hráči pro tisk">
            <h3>Hráči · podle průměru</h3>
            <p className="print-data-note">
              {players.data.data.round != null
                ? `Stav k ${players.data.data.round}. kolu`
                : "Pořadí není zveřejněno"}
              {` · data ${checked(players.data.checkedAt)}`}
              {players.data.stale
                ? " · Pozor: uložená data, zdroj je nyní nedostupný"
                : ""}
            </p>
            <p className="print-data-note">
              {allPlayers
                ? "Všichni hráči"
                : "Jen kvalifikovaní (alespoň 3/5 odehraných kuželen týmu)"}{" "}
              · {included.length} z {rows.length} hráčů. Z = starty, Ø = průměr.{" "}
              {allPlayers &&
                "– bez pořadí (pod čarou nebo bez průměru) · ? kvalifikaci nelze ověřit."}
            </p>
            {included.length ? (
              <div className="print-player-columns">
                <table className="print-player-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Hráč / tým</th>
                      <th scope="col">Z</th>
                      <th scope="col">Ø</th>
                    </tr>
                  </thead>
                  <tbody>
                    {included.map((row) => (
                      <tr
                        key={`${row.player.id}:${row.team.id}`}
                        data-highlighted={String(row.team.id) === highlightTeam}
                      >
                        <td>
                          {row.displayPosition ??
                            (row.qualification?.eligible === false
                              ? "–"
                              : row.qualification?.eligible === true
                                ? "—"
                                : "?")}
                        </td>
                        <th scope="row">
                          <span>{playerName(row.player)}</span>
                          <small>{row.team.name}</small>
                        </th>
                        <td>{row.matches}</td>
                        <td>
                          <strong>
                            {row.matches > 0
                              ? number(row.averagePerformance)
                              : "—"}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                {rows.length
                  ? "Žádný hráč nemá ověřenou kvalifikaci. Pro úplný přehled zvolte všechny hráče."
                  : "Pro tuto soutěž zatím není pořadí hráčů zveřejněno."}
              </p>
            )}
          </section>
        )}
      </article>
    </main>
  );
}
