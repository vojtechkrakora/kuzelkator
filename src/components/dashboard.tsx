"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  LayoutGrid,
  Star,
  Trophy,
  X,
} from "lucide-react";
import type { Competition, Match, Season, Standing } from "@/domain/models";
import { resultFor, statusLabel } from "@/domain/models";
import { groupMatchFeed, isFavouriteMatch } from "@/domain/match-feed";
import { feedDayLabel, dayLabel, shiftDay, todayPrague } from "@/lib/dates";
import { useFeedReturn } from "./feed-navigation";
import { TeamLogo } from "./team-logo";
import { FavoriteLeagues } from "./favorite-leagues";
import type { FavoriteLeague } from "./providers";
import { usePreferences } from "./providers";
import { ErrorNotice, FollowButton, Freshness } from "./common";
import { getData } from "@/lib/client-api";
import { TeamSeason } from "./team-season";
import { CompetitionPicker } from "./competition-picker";
import { MobileNavigation } from "./mobile-navigation";

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
  const { teams, leagues, ready, warning } = usePreferences();
  const [day, setDay] = useState(() =>
    validDay(params.get("date")) ? params.get("date")! : todayPrague(),
  );
  const [competitionId, setCompetitionId] = useState(
    params.get("competition") ?? "",
  );
  const [teamId, setTeamId] = useState(params.get("team") ?? "");
  const [offset, setOffset] = useState(() =>
    Math.max(0, Math.min(10000, Number(params.get("offset")) || 0)),
  );
  const [onlyFavourites, setOnlyFavourites] = useState(
    params.get("favourites") === "1",
  );
  const autoDay = useRef(
    !validDay(params.get("date")) &&
      !params.get("team") &&
      !params.get("competition"),
  );
  const [lastMatchDay, setLastMatchDay] = useState(false);
  const [seasonId, setSeasonId] = useState(params.get("season") ?? "");
  const range = competitionId
    ? { from: shiftDay(day, -7), to: shiftDay(day, 14) }
    : { from: day, to: day };
  useEffect(() => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("date", day);
    if (competitionId) url.searchParams.set("competition", competitionId);
    if (teamId) url.searchParams.set("team", teamId);
    if (seasonId) url.searchParams.set("season", seasonId);
    if (offset) url.searchParams.set("offset", String(offset));
    if (onlyFavourites) url.searchParams.set("favourites", "1");
    window.history.replaceState(null, "", url);
  }, [day, competitionId, teamId, seasonId, offset, onlyFavourites]);
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
  const favoriteCompetitionIds = [
    ...new Set(leagues.map((league) => league.id)),
  ]
    .sort((a, b) => a - b)
    .join(",");

  const previousFavourites = useRef<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (
      previousFavourites.current !== null &&
      previousFavourites.current !== favoriteCompetitionIds
    )
      setOffset(0);
    previousFavourites.current = favoriteCompetitionIds;
  }, [favoriteCompetitionIds, ready]);
  const matches = useQuery({
    queryKey: [
      "matches",
      range.from,
      range.to,
      competitionId,
      teamId,
      offset,
      favoriteCompetitionIds,
    ],
    enabled: !teamId && ready,
    queryFn: ({ signal }) =>
      getData<Page<Match>>(
        {
          kind: "matches",
          ...range,
          offset,
          ...(!competitionId ? { daily: "1" } : {}),
          ...(favoriteCompetitionIds ? { favoriteCompetitionIds } : {}),
          ...(competitionId ? { competitionId } : {}),
          ...(teamId ? { teamId } : {}),
        },
        signal,
      ),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
  const matchDays = useQuery({
    queryKey: ["match-days", day, competitionId],
    enabled: !teamId && ready,
    queryFn: ({ signal }) =>
      getData<{ previous: string | null; next: string | null }>(
        {
          kind: "match-days",
          day,
          ...(competitionId ? { competitionId } : {}),
        },
        signal,
      ),
  });
  useEffect(() => {
    if (!autoDay.current || !matches.data) return;
    if (matches.data.data.total > 0) {
      autoDay.current = false;
      return;
    }
    if (matchDays.data) {
      autoDay.current = false;
      if (matchDays.data.data.previous) {
        setDay(matchDays.data.data.previous);
        setLastMatchDay(true);
      }
    }
  }, [matches.data, matchDays.data]);
  useFeedReturn(!teamId && !!matches.data && !!competitions.data);
  const selectedCompetition = competitions.data?.data.items.find(
    (item) => String(item.id) === competitionId,
  );
  const selectedTeam = teams.find((item) => String(item.id) === teamId);
  const grouped = useMemo(
    () => groupMatchFeed(matches.data?.data.items ?? []),
    [matches.data],
  );
  const filtersActive = !!competitionId || !!teamId;
  function changeDay(value: string) {
    if (validDay(value)) {
      autoDay.current = false;
      setLastMatchDay(false);
      setDay(value);
      setOffset(0);
    }
  }
  function chooseCompetition(id: string) {
    autoDay.current = false;
    setLastMatchDay(false);
    setCompetitionId(id);
    setOffset(0);
  }
  function chooseTeam(id: string) {
    setTeamId(id);
    setOffset(0);
  }

  function chooseFavoriteLeague(league: FavoriteLeague) {
    chooseTeam("");
    setSeasonId(String(league.seasonId));
    chooseCompetition(String(league.id));
    if (String(league.seasonId) !== activeSeason) {
      const season = seasons.data?.data.items.find(
        (item) => item.id === league.seasonId,
      );
      changeDay(
        season?.active
          ? todayPrague()
          : `${league.seasonName.slice(0, 4)}-09-15`,
      );
    }
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
                  <TeamLogo team={team} size={24} />
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
        <FavoriteLeagues onChoose={chooseFavoriteLeague} />
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
            <h2>
              {teamId
                ? (selectedTeam?.name ?? "Sezóna týmu")
                : "Přehled zápasů"}
            </h2>
          </div>
          {!teamId && (
            <div className="week-controls">
              <button
                className="icon-button"
                aria-label="Předchozí den"
                onClick={() => changeDay(shiftDay(day, -1))}
              >
                <ChevronLeft size={18} />
              </button>
              <label className="date-control">
                <CalendarDays size={16} />
                <input
                  aria-label="Datum zápasů"
                  type="date"
                  value={day}
                  onChange={(event) => changeDay(event.target.value)}
                />
              </label>
              <button
                className="icon-button"
                aria-label="Následující den"
                onClick={() => changeDay(shiftDay(day, 1))}
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
          )}
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
        <CompetitionPicker
          seasonId={activeSeason}
          seasonName={
            seasons.data?.data.items.find(
              (item) => String(item.id) === activeSeason,
            )?.name ?? ""
          }
          items={competitions.data?.data.items ?? []}
          selected={competitionId}
          onChoose={(id) => {
            chooseTeam("");
            chooseCompetition(id);
          }}
          loading={seasons.isPending || competitions.isPending}
          failed={seasons.isError || competitions.isError}
        />
        {(seasons.isError || competitions.isError) && (
          <ErrorNotice
            message="Seznam soutěží se nepodařilo načíst. Zápasy můžete dál procházet podle data."
            retry={() => {
              void seasons.refetch();
              void competitions.refetch();
            }}
          />
        )}
        {teamId ? (
          <TeamSeason
            teamId={teamId}
            seasonId={activeSeason}
            teamName={selectedTeam?.name}
            seasonName={
              seasons.data?.data.items.find(
                (item) => String(item.id) === activeSeason,
              )?.name
            }
          />
        ) : (
          <>
            {selectedCompetition && (
              <Standings
                key={selectedCompetition.id}
                competition={selectedCompetition}
              />
            )}
            {competitionId && (
              <p className="league-window-note">
                Zápasy 7 dní před a 14 dní po vybraném datu, včetně dohrávek.
              </p>
            )}
            <div className="day-navigation">
              {matchDays.data?.data.previous && (
                <button
                  className="button"
                  onClick={() => changeDay(matchDays.data!.data.previous!)}
                >
                  Předchozí zápasy · {dayLabel(matchDays.data.data.previous)}
                </button>
              )}
              {matchDays.data?.data.next && (
                <button
                  className="button"
                  onClick={() => changeDay(matchDays.data!.data.next!)}
                >
                  Následující zápasy · {dayLabel(matchDays.data.data.next)}
                </button>
              )}
              {!competitionId && (teams.length > 0 || leagues.length > 0) && (
                <label>
                  <input
                    type="checkbox"
                    checked={onlyFavourites}
                    onChange={(event) =>
                      setOnlyFavourites(event.target.checked)
                    }
                  />{" "}
                  Jen oblíbené
                </label>
              )}
            </div>
            <div className="feed-meta">
              <span>
                {lastMatchDay ? "Poslední zápasy · " : ""}
                {competitionId
                  ? `${dayLabel(range.from)} – ${dayLabel(range.to)}`
                  : dayLabel(day, true)}{" "}
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
                <h3>
                  {competitionId
                    ? "V tomto období je na drahách klid."
                    : "V tento den je na drahách klid."}
                </h3>
                <p>
                  Pro zvolené filtry nejsou zveřejněné žádné zápasy. Zkuste jiný
                  den nebo soutěž.
                </p>
                <button
                  className="button"
                  onClick={() => changeDay(shiftDay(day, 1))}
                >
                  Následující den <ArrowRight size={16} />
                </button>
              </div>
            )}
            {[...grouped].map(([date, competitions]) => (
              <MatchDay
                key={`${date}:${competitionId}:${favoriteCompetitionIds}:${teams.map((team) => team.id).join(",")}`}
                date={date}
                items={[...competitions.values()].flatMap(
                  (league) => league.items,
                )}
                favouriteLeagues={new Set(leagues.map((league) => league.id))}
                favouriteTeams={new Set(teams.map((team) => team.id))}
                onlyFavourites={
                  !competitionId &&
                  onlyFavourites &&
                  (teams.length > 0 || leagues.length > 0)
                }
              />
            ))}
            {competitionId && matches.data && matches.data.data.total > 24 && (
              <div className="pagination">
                <button
                  className="button"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - 24))}
                >
                  <ChevronLeft size={16} /> Předchozí
                </button>
                <span>
                  {offset + 1}–{Math.min(offset + 24, matches.data.data.total)}{" "}
                  z {matches.data.data.total}
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
          </>
        )}
      </section>
      <MobileNavigation
        onChooseLeague={chooseFavoriteLeague}
        onChooseTeam={(id) => {
          chooseTeam(id);
          chooseCompetition("");
        }}
      />
    </main>
  );
}

function MatchDay({
  date,
  items,
  favouriteLeagues,
  favouriteTeams,
  onlyFavourites,
}: {
  date: string;
  items: Match[];
  favouriteLeagues: ReadonlySet<number>;
  favouriteTeams: ReadonlySet<number>;
  onlyFavourites: boolean;
}) {
  const favourite = (match: Match) =>
    isFavouriteMatch(match, favouriteLeagues, favouriteTeams);
  const favourites = items.filter(favourite);
  const shown = onlyFavourites ? favourites : items;
  const groups = [...(groupMatchFeed(shown).get(date) ?? [])].sort(
    (a, b) =>
      Number(b[1].items.some(favourite)) - Number(a[1].items.some(favourite)) ||
      a[1].name.localeCompare(b[1].name, "cs", { numeric: true }),
  );
  return (
    <section
      className="match-day"
      aria-label={feedDayLabel(date, todayPrague())}
    >
      <h3 className="match-day-heading">
        <CalendarDays size={20} />
        <time dateTime={date || undefined}>
          {feedDayLabel(date, todayPrague())}
        </time>
      </h3>
      {!favourites.length &&
        (favouriteTeams.size > 0 || favouriteLeagues.size > 0) && (
          <p className="empty-copy">
            Tento den nehrají žádné oblíbené týmy ani soutěže.
            {onlyFavourites
              ? " Vypněte filtr Jen oblíbené pro ostatní zápasy."
              : " Zde jsou ostatní zápasy."}
          </p>
        )}
      {groups.map(([id, { name, items: leagueMatches }]) => (
        <details
          key={id}
          id={`league-${date}-${id}`}
          className="competition-group"
          open
        >
          <summary className="competition-heading">
            <h4>
              <Trophy size={16} />
              {name}
            </h4>
            <span>
              {leagueMatches.length} zápasů <ChevronRight size={16} />
            </span>
          </summary>
          <div className="match-grid">
            {[...leagueMatches]
              .sort((a, b) => Number(favourite(b)) - Number(favourite(a)))
              .map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
          </div>
        </details>
      ))}
    </section>
  );
}

function MatchCard({ match }: { match: Match }) {
  const { teams, leagues } = usePreferences();
  const favouriteTeam = teams.some(
    (team) => team.id === match.homeTeam?.id || team.id === match.awayTeam?.id,
  );
  const favouriteLeague = leagues.some(
    (league) => league.id === match.competition?.id,
  );
  const favourite = favouriteTeam || favouriteLeague;
  const home = resultFor(match, true),
    away = resultFor(match, false);
  return (
    <article className={`match-card${favourite ? " favourite-match" : ""}`}>
      {favourite && (
        <div className="favourite-match-label">
          <Star size={14} fill="currentColor" aria-hidden="true" />
          <span>
            {favouriteTeam && favouriteLeague
              ? "Váš tým · Vaše soutěž"
              : favouriteTeam
                ? "Váš tým"
                : "Vaše soutěž"}
          </span>
        </div>
      )}
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
            <Link
              prefetch={false}
              href={`/matches/${match.id}`}
              className="team-name"
            >
              <TeamLogo team={entry} size={24} />
              <span>{entry?.name ?? "Tým bude upřesněn"}</span>
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

function Standings({ competition }: { competition: Competition }) {
  const [selectedRound, setSelectedRound] = useState<number | undefined>();
  const table = useQuery({
    queryKey: ["standings", competition.slug, selectedRound],
    queryFn: ({ signal }) =>
      getData<Page<Standing> & { round: number | null }>(
        {
          kind: "standings",
          slug: competition.slug,
          ...(selectedRound != null ? { round: selectedRound } : {}),
        },
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
            value={selectedRound ?? table.data?.data.round ?? ""}
            placeholder="Aktuální"
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value >= 1 && value <= 1000) setSelectedRound(value);
            }}
          />
          {selectedRound != null && (
            <button
              type="button"
              className="button"
              onClick={() => setSelectedRound(undefined)}
            >
              Aktuální tabulka
            </button>
          )}
        </label>
      </div>
      {table.isPending && <p role="status">Načítání tabulky…</p>}
      {table.isError && <ErrorNotice retry={() => void table.refetch()} />}
      {table.data && (
        <>
          <Freshness {...table.data} />
          {table.data.data.round != null && (
            <p className="empty-copy" role="status">
              {selectedRound != null && table.data.data.round < selectedRound
                ? `Pro ${selectedRound}. kolo tabulka zatím není zveřejněna. Zobrazujeme poslední dostupnou tabulku po ${table.data.data.round}. kole.`
                : `Tabulka po ${table.data.data.round}. kole.`}
            </p>
          )}
          {table.data.data.items.length ? (
            <div className="table-scroll">
              <table>
                <caption className="sr-only">
                  Tabulka {competition.name},{" "}
                  {table.data.data.round ?? selectedRound}. kolo
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
                          <TeamLogo team={row.team} size={24} />
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
              Pro toto kolo ani předchozí kola zatím není tabulka zveřejněna.
            </p>
          )}
        </>
      )}
    </section>
  );
}
