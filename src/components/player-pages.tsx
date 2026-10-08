"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Search, ArrowLeft } from "lucide-react";
import { getData } from "../lib/client-api";
import { playerName, statusLabel, type Season } from "../domain/models";
import type {
  DirectoryPlayer,
  PlayerProfile,
  PlayerHistory,
} from "../domain/players";
import { usePreferences } from "./providers";
import { ErrorNotice, Freshness } from "./common";
import { dayLabel } from "../lib/dates";
import { teamSeasonHref } from "../lib/team-navigation";
import { LaneScore } from "./player-detail";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileNavigation } from "./mobile-navigation";
import { PlayerStatisticsSection } from "./player-statistics";

type Page<T> = { items: T[]; total: number };
function PlayerPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="page dashboard player-dashboard">
      <DesktopSidebar playerFavorites={<FavouritePlayers sidebar />} />
      <section className="dashboard-main players-page">{children}</section>
      <MobileNavigation playerFavorites={<FavouritePlayers />} />
    </main>
  );
}
export function FollowPlayerButton({
  player,
  iconOnly = false,
}: {
  player: PlayerProfile;
  iconOnly?: boolean;
}) {
  const { players, togglePlayer, ready } = usePreferences();
  const followed = players.some((p) => p.id === player.id);
  return (
    <button
      type="button"
      className={
        iconOnly ? `star-button ${followed ? "saved" : ""}` : "follow-player"
      }
      aria-pressed={followed}
      disabled={!ready}
      aria-label={`${followed ? "Přestat sledovat" : "Sledovat hráče"} ${playerName(player)}`}
      onClick={() => togglePlayer(player)}
    >
      <Star size={18} fill={followed ? "currentColor" : "none"} />
      {!iconOnly && (followed ? "Sleduji" : "Sledovat")}
    </button>
  );
}
export function FavouritePlayers({ sidebar = false }: { sidebar?: boolean }) {
  const { players } = usePreferences();
  if (sidebar)
    return (
      <section className="favorite-leagues" aria-label="Moji hráči">
        <div className="side-heading">
          <span>MOJI HRÁČI</span>
          <span className="counter">{players.length}</span>
        </div>
        {players.length ? (
          <div className="favorite-league-list">
            {players.map((player) => (
              <div className="favorite-league-row" key={player.id}>
                <Link
                  className="favorite-league-choice"
                  href={`/players/${player.id}`}
                >
                  <strong>{playerName(player)}</strong>
                </Link>
                <FollowPlayerButton player={player} iconOnly />
              </div>
            ))}
          </div>
        ) : (
          <p className="favorite-league-empty">
            Hráče přidáte hvězdičkou na jeho profilu.
          </p>
        )}
        <Link className="favorite-player-search" href="/players">
          Najít hráče →
        </Link>
      </section>
    );
  return (
    <section className="favourite-players" aria-label="Oblíbení hráči">
      <h3>Moji hráči</h3>
      {players.length ? (
        <ul>
          {players.map((p) => (
            <li key={p.id}>
              <Link href={`/players/${p.id}`}>{playerName(p)}</Link>
              <FollowPlayerButton player={p} />
            </li>
          ))}
        </ul>
      ) : (
        <p>Hráče přidáte hvězdičkou na jeho profilu.</p>
      )}
      <Link href="/players">Najít hráče →</Link>
    </section>
  );
}
function useSeason(initialSeason = "") {
  const [selected, setSelected] = useState(initialSeason);
  const seasons = useQuery({
    queryKey: ["seasons"],
    queryFn: ({ signal }) => getData<Page<Season>>({ kind: "seasons" }, signal),
  });
  const id =
    selected ||
    String(
      seasons.data?.data.items.find((s) => s.active)?.id ??
        seasons.data?.data.items[0]?.id ??
        "",
    );
  return { seasons, id, setSelected };
}
export function PlayerSearchPage() {
  const { seasons, id, setSelected } = useSeason();
  const [text, setText] = useState(""),
    [query, setQuery] = useState(""),
    [offset, setOffset] = useState(0);
  const { warning } = usePreferences();
  const search = useQuery({
    queryKey: ["player-search", id, query, offset],
    enabled: !!id && query.length >= 2,
    queryFn: ({ signal }) =>
      getData<Page<DirectoryPlayer>>(
        { kind: "player-search", seasonId: id, q: query, offset },
        signal,
      ),
    staleTime: 3600000,
  });
  return (
    <PlayerPageLayout>
      <Link className="back-link" href="/">
        <ArrowLeft size={17} /> Přehled zápasů
      </Link>
      <h1>Hráči</h1>
      <p>Najděte sebe nebo své přátele a sledujte jejich výsledky.</p>
      <FavouritePlayers />
      {warning && <p role="status">{warning}</p>}
      <form
        className="player-search-form"
        onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setQuery(text.trim());
        }}
      >
        <label>
          Sezóna
          <select
            value={id}
            onChange={(e) => {
              setSelected(e.target.value);
              setOffset(0);
            }}
          >
            {seasons.data?.data.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Jméno nebo tým
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            minLength={2}
            maxLength={100}
            required
            placeholder="Např. Tesařík nebo Tábor"
          />
        </label>
        <button className="button" type="submit" disabled={!id}>
          <Search size={17} /> Hledat hráče
        </button>
      </form>
      <p className="lane-detail-note">
        Vyhledáváme hráče v oficiálních hráčských tabulkách vybrané sezóny.
        První načtení může chvíli trvat. Hráče bez záznamu v tabulkách můžete
        otevřít z detailu zápasu.
      </p>
      {seasons.isError && <ErrorNotice retry={() => void seasons.refetch()} />}
      {search.isFetching && <p role="status">Hledání hráčů…</p>}
      {search.isError && <ErrorNotice retry={() => void search.refetch()} />}
      {search.data && (
        <>
          <p role="status">Nalezeno {search.data.data.total} hráčů</p>
          <ul className="player-search-results">
            {search.data.data.items.map((p) => (
              <li key={p.id}>
                <Link href={`/players/${p.id}?season=${id}`}>
                  <strong>{playerName(p)}</strong>
                  <small>{p.teams.join(" · ")}</small>
                </Link>
                <FollowPlayerButton player={p} />
              </li>
            ))}
          </ul>
          {search.data.data.total === 0 && (
            <p>Zkuste jiné jméno, tým nebo sezónu.</p>
          )}
          <div className="pagination">
            <button
              className="button"
              disabled={!offset}
              onClick={() => setOffset(Math.max(0, offset - 20))}
            >
              Předchozí
            </button>
            <span>
              {search.data.data.total
                ? `${offset + 1}–${Math.min(offset + 20, search.data.data.total)}`
                : "0"}
            </span>
            <button
              className="button"
              disabled={offset + 20 >= search.data.data.total}
              onClick={() => setOffset(offset + 20)}
            >
              Další
            </button>
          </div>
        </>
      )}
    </PlayerPageLayout>
  );
}
export function PlayerSeasonPage({
  player,
  initialSeason = "",
}: {
  player: PlayerProfile;
  initialSeason?: string;
}) {
  const { seasons, id, setSelected } = useSeason(initialSeason);
  const { warning } = usePreferences();
  const results = useQuery({
    queryKey: ["player-history", player.id, id],
    enabled: !!id,
    queryFn: ({ signal }) =>
      getData<Page<PlayerHistory>>(
        { kind: "player-history", id: player.id, seasonId: id },
        signal,
      ),
  });
  return (
    <PlayerPageLayout>
      <Link href="/players" className="back-link">
        <ArrowLeft size={17} /> Hráči
      </Link>
      <div className="player-profile-heading">
        <div>
          <h1>{playerName(player)}</h1>
          <p>{player.club?.name ?? "Klub není uveden"}</p>
        </div>
        <FollowPlayerButton player={player} />
      </div>
      {warning && <p role="status">{warning}</p>}
      <label className="player-season-select">
        Sezóna
        <select value={id} onChange={(e) => setSelected(e.target.value)}>
          {seasons.data?.data.items.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <PlayerStatisticsSection
        key={id}
        playerId={player.id}
        seasonId={id}
        history={results.data?.data.items}
      />
      <h2>Výsledky v sezóně</h2>
      <p className="lane-detail-note">
        Zveřejněné individuální výsledky. Budoucí účast hráče nelze určit před
        zveřejněním sestavy.
      </p>
      {seasons.isError && <ErrorNotice retry={() => void seasons.refetch()} />}
      {results.isPending && <p role="status">Načítání výsledků…</p>}
      {results.isError && <ErrorNotice retry={() => void results.refetch()} />}
      {results.data && (
        <>
          <Freshness {...results.data} />
          {results.data.data.total === 0 && (
            <p className="empty-copy">
              V této sezóně zatím nejsou zveřejněné výsledky hráče.
            </p>
          )}
          <ol className="player-history">
            {results.data.data.items.map((r, index) => {
              const match = r.teamMatchResult?.teamMatch;
              const resultTeam = r.teamMatchResult?.team;
              const changes =
                r.teamMatchResult?.substitutions?.filter(
                  (c) =>
                    c.playerOut?.id === r.player?.id ||
                    c.playerIn?.id === player.id,
                ) ?? [];
              const substituted = !!r.substitute || changes.length > 0;
              return (
                <li key={`${match?.id ?? "unknown"}-${r.position}-${index}`}>
                  <div className="player-history-heading">
                    <div>
                      {match && (
                        <>
                          <time dateTime={match.date ?? undefined}>
                            {dayLabel(match.date, true)}
                          </time>
                          <small>
                            {statusLabel(match.status)} ·{" "}
                            {match.competition?.name ?? "Soutěž neuvedena"} ·{" "}
                            {match.discipline?.replace("T", "") ?? "—"} hodů
                          </small>
                          <Link href={`/matches/${match.id}`}>
                            {match.homeTeam?.name ?? "Domácí"} –{" "}
                            {match.awayTeam?.name ?? "Hosté"}
                          </Link>
                        </>
                      )}
                    </div>
                    <strong>
                      {r.totalPerformance ?? "—"}
                      <small>kuželek</small>
                    </strong>
                  </div>
                  <p>
                    {resultTeam ? (
                      <Link
                        className="player-history-team"
                        href={teamSeasonHref(resultTeam.id, id)}
                      >
                        {resultTeam.name}
                      </Link>
                    ) : (
                      "Tým neuveden"
                    )}{" "}
                    · Plné {r.totalFull ?? "—"} · Dorážka {r.totalSpare ?? "—"}{" "}
                    · Chyby {r.totalErrors ?? "—"} · Body {r.teamPoints ?? "—"}
                  </p>
                  {substituted && (
                    <p className="player-history-sub">
                      Střídání · společný výkon dvojice.{" "}
                      {changes
                        .map(
                          (c) =>
                            `${playerName(c.playerOut)} → ${playerName(c.playerIn)}${c.throwNumber != null ? ` (od ${c.throwNumber}. hodu)` : ""}`,
                        )
                        .join("; ") ||
                        `${playerName(r.player)} → ${playerName(r.substitute)}`}
                    </p>
                  )}
                  {!!r.laneResults?.length && (
                    <details>
                      <summary>Výsledky po drahách</summary>
                      <div className="player-history-lanes">
                        {r.laneResults.map((lane) => (
                          <div key={lane.laneNumber}>
                            <span>Dráha {lane.laneNumber}</span>
                            <LaneScore lane={lane} />
                            <small>
                              Plné {lane.full ?? "—"} · Dorážka{" "}
                              {lane.spare ?? "—"} · Chyby {lane.errors ?? "—"}
                            </small>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </PlayerPageLayout>
  );
}
