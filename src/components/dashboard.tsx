"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Heart,
  LayoutGrid,
  Search,
  Star,
  Trophy,
  X,
} from "lucide-react";
import type {
  Competition,
  Match,
  Resource,
  Season,
  Standing,
} from "@/domain/models";
import { resultFor, statusLabel } from "@/domain/models";
import { dayLabel, shiftDay, todayPrague, weekRange } from "@/lib/dates";
import { usePreferences } from "./providers";
import { ErrorNotice, FollowButton, Freshness } from "./common";
import { MobileNavigation } from "./mobile-navigation";

async function getData<T>(
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<Resource<T>> {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  );
  const response = await fetch(`/api/data?${query}`, { signal });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Data nejsou dostupná.");
  return json;
}
type Page<T> = { items: T[]; total: number };
function validDay(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function Dashboard() {
  const params = useSearchParams();
  const { teams, warning } = usePreferences();
  const [day, setDay] = useState(() =>
    validDay(params.get("date")) ? params.get("date")! : todayPrague(),
  );
  const [competitionId, setCompetitionId] = useState(
    params.get("competition") ?? "",
  );
  const [teamId, setTeamId] = useState(params.get("team") ?? "");
  const [offset, setOffset] = useState(0);
  const [seasonId, setSeasonId] = useState(params.get("season") ?? "");
  const [competitionSearch, setCompetitionSearch] = useState("");
  const range = weekRange(day);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("date", day);
    if (competitionId) url.searchParams.set("competition", competitionId);
    if (teamId) url.searchParams.set("team", teamId);
    if (seasonId) url.searchParams.set("season", seasonId);
    window.history.replaceState(null, "", url);
  }, [day, competitionId, teamId, seasonId]);
  const seasons = useQuery({
    queryKey: ["seasons"],
    queryFn: ({ signal }) => getData<Page<Season>>({ kind: "seasons" }, signal),
  });
  const activeSeason =
    seasonId ||
    String(seasons.data?.data.items.find((item) => item.active)?.id ?? "");
  const competitions = useQuery({
    queryKey: ["competitions", activeSeason],
    enabled: !!activeSeason,
    queryFn: async ({ signal }) => {
      const first = await getData<Page<Competition>>(
        { kind: "competitions", seasonId: activeSeason },
        signal,
      );
      const items = [...first.data.items];
      for (
        let position = items.length;
        position < Math.min(first.data.total, 500);
        position += 100
      ) {
        const next = await getData<Page<Competition>>(
          { kind: "competitions", seasonId: activeSeason, offset: position },
          signal,
        );
        if (!next.data.items.length) break;
        items.push(...next.data.items);
      }
      return { ...first, data: { items, total: first.data.total } };
    },
  });
  const matches = useQuery({
    queryKey: ["matches", range.from, range.to, competitionId, teamId, offset],
    queryFn: ({ signal }) =>
      getData<Page<Match>>(
        {
          kind: "matches",
          ...range,
          offset,
          ...(competitionId ? { competitionId } : {}),
          ...(teamId ? { teamId } : {}),
        },
        signal,
      ),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
  const selectedCompetition = competitions.data?.data.items.find(
    (item) => String(item.id) === competitionId,
  );
  const selectedTeam = teams.find((item) => String(item.id) === teamId);
  const grouped = useMemo(() => {
    const result = new Map<string, Match[]>();
    for (const match of matches.data?.data.items ?? []) {
      const key = match.competition?.name ?? "Ostatní soutěže";
      result.set(key, [...(result.get(key) ?? []), match]);
    }
    return result;
  }, [matches.data]);
  const filtersActive = !!competitionId || !!teamId;
  function changeDay(value: string) {
    if (validDay(value)) {
      setDay(value);
      setOffset(0);
    }
  }
  function chooseCompetition(id: string) {
    setCompetitionId(id);
    setOffset(0);
  }
  function chooseTeam(id: string) {
    setTeamId(id);
    setOffset(0);
  }

  return (
    <main id="main" className="page dashboard">
      <aside className="sidebar">
        <div className="nav-label">VAŠE KUŽELKY</div>
        <button
          className={`side-link ${!teamId ? "active" : ""}`}
          onClick={() => {
            chooseTeam("");
            chooseCompetition("");
          }}
        >
          <LayoutGrid size={18} /> Přehled zápasů <ArrowUpRight size={16} />
        </button>
        <div className="side-heading">
          <span>MOJE TÝMY</span>
          <span className="counter">{teams.length}</span>
        </div>
        {teams.length ? (
          <div className="favourite-list">
            {teams.map((team) => (
              <div className="favourite-item" key={team.id}>
                <button
                  className={teamId === String(team.id) ? "selected-team" : ""}
                  onClick={() => {
                    chooseTeam(String(team.id));
                    chooseCompetition("");
                  }}
                >
                  <span className="team-dot" />
                  {team.name}
                </button>
                <FollowButton team={team} />
              </div>
            ))}
          </div>
        ) : (
          <div className="follow-empty">
            <Star size={23} />
            <strong>Váš tým, na prvním místě.</strong>
            <p>Klikněte na hvězdičku u týmu. Příště ho najdete rovnou tady.</p>
          </div>
        )}
        <div className="sidebar-note">
          <Heart size={17} />
          <span>
            Vaše oblíbené zůstávají v tomto prohlížeči. Bez registrace.
          </span>
        </div>
        <div className="sidebar-bottom">
          <span className="green-dot" /> Napojeno na veřejné API ČKA
        </div>
      </aside>
      <section className="dashboard-main">
        <div className="eyebrow">VÁŠ OSOBNÍ VÝSLEDKOVÝ SERVIS</div>
        <div className="intro">
          <div>
            <h1>
              Vaše hra.
              <br />
              <span>Vaše výsledky.</span>
            </h1>
            <p>
              Všechno podstatné ze světa kuželek.
              <br className="desktop-break" /> A vaše týmy vždy o něco blíž.
            </p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <div className="pins">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((pin) => (
                <i key={pin} />
              ))}
            </div>
            <span className="ball" />
            <span className="art-label">9 KUŽELEK. JEDNA VÁŠEŇ.</span>
          </div>
        </div>
        {warning && (
          <div role="status" className="notice">
            {warning}
          </div>
        )}
        <div className="section-title" id="match-feed">
          <div>
            <span className="section-kicker">NA KUŽELNÁCH</span>
            <h2>{selectedTeam ? selectedTeam.name : "Týden v kuželkách"}</h2>
          </div>
          <div className="week-controls">
            <button
              className="icon-button"
              aria-label="Předchozí týden"
              onClick={() => changeDay(shiftDay(day, -7))}
            >
              <ChevronLeft size={18} />
            </button>
            <label className="date-control">
              <CalendarDays size={16} />
              <input
                aria-label="Datum v požadovaném týdnu"
                type="date"
                value={day}
                onChange={(event) => changeDay(event.target.value)}
              />
            </label>
            <button
              className="icon-button"
              aria-label="Následující týden"
              onClick={() => changeDay(shiftDay(day, 7))}
            >
              <ChevronRight size={18} />
            </button>
            <button
              className="today-button"
              onClick={() => changeDay(todayPrague())}
            >
              Dnes
            </button>
          </div>
        </div>
        <div className="filters">
          <label className="select-wrap">
            <span>Sezóna soutěží</span>
            <select
              aria-label="Sezóna soutěží"
              value={activeSeason}
              onChange={(event) => {
                setSeasonId(event.target.value);
                chooseCompetition("");
                const season = seasons.data?.data.items.find(
                  (item) => String(item.id) === event.target.value,
                );
                if (season && !season.active)
                  changeDay(`${season.name.slice(0, 4)}-09-15`);
                else changeDay(todayPrague());
              }}
            >
              {seasons.data?.data.items.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </label>
          <label className="select-wrap competition-select">
            <span>Soutěž</span>
            <select
              aria-label="Soutěž"
              value={competitionId}
              onChange={(event) => chooseCompetition(event.target.value)}
            >
              <option value="">Všechny soutěže</option>
              {competitions.data?.data.items.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                </option>
              ))}
            </select>
          </label>
          {filtersActive && (
            <button
              className="clear-filters"
              onClick={() => {
                chooseTeam("");
                chooseCompetition("");
              }}
            >
              <X size={15} /> Zrušit filtry
            </button>
          )}
        </div>
        {(seasons.isError || competitions.isError) && (
          <ErrorNotice
            message="Seznam soutěží se nepodařilo načíst. Zápasy můžete dál procházet podle data."
            retry={() => {
              void seasons.refetch();
              void competitions.refetch();
            }}
          />
        )}
        <div className="feed-meta">
          <span>
            {dayLabel(range.from)} — {dayLabel(range.to)}{" "}
            <span className="meta-divider">/</span>{" "}
            {matches.data
              ? `${matches.data.data.total} zápasů`
              : "Načítání zápasů"}
          </span>
          {matches.data && <Freshness {...matches.data} />}
        </div>
        {matches.isError && (
          <ErrorNotice
            retry={() => void matches.refetch()}
            message={matches.error.message}
          />
        )}
        {matches.isPending && (
          <div
            className="skeleton-list"
            role="status"
            aria-label="Načítání zápasů"
          >
            {[1, 2, 3].map((item) => (
              <div className="skeleton" key={item} />
            ))}
          </div>
        )}
        {matches.data?.data.items.length === 0 && (
          <div className="empty-state">
            <CalendarDays size={34} />
            <h3>V tomto týdnu je na drahách klid.</h3>
            <p>
              Pro zvolené filtry nejsou zveřejněné žádné zápasy. Zkuste jiný
              týden nebo soutěž.
            </p>
            <button
              className="button"
              onClick={() => changeDay(shiftDay(day, 7))}
            >
              Následující týden <ArrowRight size={16} />
            </button>
          </div>
        )}
        {[...grouped].map(([name, items]) => (
          <section key={name} className="competition-group">
            <div className="competition-heading">
              <span>
                <Trophy size={16} />
                {name}
              </span>
              <span>
                {items.length} {items.length === 1 ? "zápas" : "zápasů"} na této
                stránce
              </span>
            </div>
            <div className="match-grid">
              {items.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        ))}
        {matches.data && matches.data.data.total > 24 && (
          <div className="pagination">
            <button
              className="button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 24))}
            >
              <ChevronLeft size={16} /> Předchozí
            </button>
            <span>
              {offset + 1}–{Math.min(offset + 24, matches.data.data.total)} z{" "}
              {matches.data.data.total}
            </span>
            <button
              className="button"
              disabled={offset + 24 >= matches.data.data.total}
              onClick={() => setOffset(offset + 24)}
            >
              Další <ChevronRight size={16} />
            </button>
          </div>
        )}
        {selectedCompetition && (
          <Standings
            competition={selectedCompetition}
            round={Math.max(
              1,
              ...(matches.data?.data.items ?? []).map(
                (match) => match.round ?? 1,
              ),
            )}
          />
        )}
        <section className="discovery" id="competitions">
          <div>
            <span className="section-kicker">NAJDĚTE SVOU SOUTĚŽ</span>
            <h2>Od první ligy po domácí dráhy.</h2>
          </div>
          <label className="search-box">
            <Search size={17} />
            <input
              aria-label="Hledat v načtených soutěžích"
              placeholder="Název soutěže…"
              value={competitionSearch}
              onChange={(event) => setCompetitionSearch(event.target.value)}
            />
          </label>
          <div className="competition-chips">
            {competitions.data?.data.items
              .filter((item) =>
                item.name
                  .toLocaleLowerCase("cs")
                  .includes(competitionSearch.toLocaleLowerCase("cs")),
              )
              .slice(0, 12)
              .map((item) => (
                <button
                  key={item.id}
                  className={String(item.id) === competitionId ? "chosen" : ""}
                  onClick={() => {
                    chooseCompetition(String(item.id));
                    document
                      .querySelector(".section-title")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {item.name}
                  <ArrowUpRight size={15} />
                </button>
              ))}
          </div>
        </section>
      </section>
      <MobileNavigation
        onChooseTeam={(id) => {
          chooseTeam(id);
          chooseCompetition("");
        }}
      />
    </main>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const home = resultFor(match, true),
    away = resultFor(match, false);
  return (
    <article className="match-card">
      <div className="match-top">
        <span>
          {dayLabel(match.date)}
          {match.time ? ` · ${match.time.slice(0, 5)}` : ""}
        </span>
        <span
          className={`match-status ${match.status === "IN_PROGRESS" ? "live" : ""}`}
        >
          {match.status === "IN_PROGRESS" && <span className="green-dot" />}
          {statusLabel(match.status)}
        </span>
      </div>
      {[
        [match.homeTeam, home],
        [match.awayTeam, away],
      ].map(([team, result], index) => {
        const entry = team as Match["homeTeam"];
        const score = result as typeof home;
        return (
          <div className="team-row" key={index}>
            <span className={`team-avatar ${index ? "away" : ""}`}>
              <CircleDot size={19} />
            </span>
            <Link
              prefetch={false}
              href={`/matches/${match.id}`}
              className="team-name"
            >
              {entry?.name ?? "Tým bude upřesněn"}
            </Link>
            {entry && <FollowButton team={entry} />}
            <span className="pins-score">{score?.totalPerformance ?? "—"}</span>
            <strong className="team-score">{score?.teamPoints ?? "—"}</strong>
          </div>
        );
      })}
      <div className="match-bottom">
        <span>
          {match.round ? `${match.round}. kolo` : "Kolo neuvedeno"}{" "}
          <span>·</span> {match.discipline?.replace("T", "") ?? "—"} hodů
        </span>
        <Link
          prefetch={false}
          href={`/matches/${match.id}`}
          aria-label={`Detail zápasu ${match.homeTeam?.name ?? ""} – ${match.awayTeam?.name ?? ""}`}
        >
          Detail zápasu <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}

function Standings({
  competition,
  round,
}: {
  competition: Competition;
  round: number;
}) {
  const [selectedRound, setSelectedRound] = useState(round);
  useEffect(() => setSelectedRound(round), [round, competition.id]);
  const table = useQuery({
    queryKey: ["standings", competition.slug, selectedRound],
    queryFn: ({ signal }) =>
      getData<Page<Standing>>(
        { kind: "standings", slug: competition.slug, round: selectedRound },
        signal,
      ),
  });
  return (
    <section className="standings">
      <div className="section-title">
        <div>
          <span className="section-kicker">POŘADÍ DRUŽSTEV</span>
          <h2>{competition.name}</h2>
        </div>
        <label className="round-label">
          Kolo{" "}
          <input
            aria-label="Kolo tabulky"
            type="number"
            min={1}
            max={1000}
            value={selectedRound}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value >= 1 && value <= 1000) setSelectedRound(value);
            }}
          />
        </label>
      </div>
      {table.isPending && <p role="status">Načítání tabulky…</p>}
      {table.isError && <ErrorNotice retry={() => void table.refetch()} />}
      {table.data && (
        <>
          <Freshness {...table.data} />
          {table.data.data.items.length ? (
            <div className="table-scroll">
              <table>
                <caption className="sr-only">
                  Tabulka {competition.name}, {selectedRound}. kolo
                </caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Tým</th>
                    <th scope="col">Zápasy</th>
                    <th scope="col">V</th>
                    <th scope="col">R</th>
                    <th scope="col">P</th>
                    <th scope="col">Body</th>
                  </tr>
                </thead>
                <tbody>
                  {table.data.data.items.map((row) => (
                    <tr key={row.team.id}>
                      <td>{row.position}</td>
                      <th scope="row">
                        <span className="table-team">
                          {row.team.name}
                          <FollowButton team={row.team} />
                        </span>
                      </th>
                      <td>{row.matches}</td>
                      <td>{row.wins}</td>
                      <td>{row.draws}</td>
                      <td>{row.losses}</td>
                      <td>
                        <strong>{row.tablePoints}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-copy">
              Pro toto kolo zatím není tabulka zveřejněna. Zkuste předchozí
              kolo.
            </p>
          )}
        </>
      )}
    </section>
  );
}
