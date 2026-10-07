"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { CalendarDays, Star, Trophy, Users, X } from "lucide-react";
import { usePreferences } from "./providers";
import { TeamLogo } from "./team-logo";
import { FavoriteLeagues } from "./favorite-leagues";
import type { FavoriteLeague } from "./providers";
import { FollowButton } from "./common";

export function MobileNavigation({
  onChooseTeam,
  onOverview,
  onChooseLeague,
  playerFavorites,
}: {
  onOverview?: () => void;
  onChooseTeam?: (id: string) => void;
  onChooseLeague?: (league: FavoriteLeague) => void;
  playerFavorites: ReactNode;
}) {
  const router = useRouter();
  const { teams, leagues, players, warning } = usePreferences();
  const dialog = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef("");
  function close() {
    dialog.current?.close();
  }
  function releaseScroll() {
    document.body.style.overflow = previousOverflow.current;
  }
  function open() {
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
  }
  function showOverview() {
    close();
    if (onOverview) {
      onOverview();
      document.getElementById("match-feed")?.scrollIntoView();
    } else {
      router.push("/");
    }
  }
  function chooseTeam(id: string) {
    close();
    if (onChooseTeam) {
      onChooseTeam(id);
      document.getElementById("match-feed")?.scrollIntoView();
    } else {
      router.push(`/?team=${id}`);
    }
  }
  function chooseLeague(league: FavoriteLeague) {
    close();
    if (onChooseLeague) {
      onChooseLeague(league);
      document.getElementById("match-feed")?.scrollIntoView();
    } else {
      router.push(`/?competition=${league.id}&season=${league.seasonId}`);
    }
  }
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 741px)");
    const onResize = () => {
      if (desktop.matches && dialog.current?.open) close();
    };
    desktop.addEventListener("change", onResize);
    return () => {
      desktop.removeEventListener("change", onResize);
      document.body.style.overflow = previousOverflow.current;
    };
  }, []);
  return (
    <>
      <nav className="mobile-navigation" aria-label="Rychlá navigace">
        {onOverview ? (
          <a href="#match-feed" onClick={onOverview}>
            <CalendarDays size={21} />
            <span>Zápasy</span>
          </a>
        ) : (
          <Link href="/">
            <CalendarDays size={21} />
            <span>Zápasy</span>
          </Link>
        )}
        <Link href="/players">
          <Users size={21} />
          <span>Hráči</span>
        </Link>
        <button onClick={open} aria-haspopup="dialog">
          <Star size={21} />
          <span>
            Oblíbené
            {teams.length + leagues.length + players.length > 0 && (
              <b className="nav-count">
                {teams.length + leagues.length + players.length}
              </b>
            )}
          </span>
        </button>
        {onOverview ? (
          <a
            href="#competitions"
            onClick={() => {
              const picker = document.querySelector<HTMLDetailsElement>(
                "#competitions details",
              );
              if (picker) picker.open = true;
            }}
          >
            <Trophy size={21} />
            <span>Soutěže</span>
          </a>
        ) : (
          <Link href="/#competitions">
            <Trophy size={21} />
            <span>Soutěže</span>
          </Link>
        )}
      </nav>
      <dialog
        ref={dialog}
        className="favorites-sheet"
        aria-labelledby="favorites-title"
        onClose={releaseScroll}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="sheet-content">
          <div className="sheet-handle" aria-hidden="true" />
          <div className="sheet-heading">
            <div>
              <span className="section-kicker">VAŠE KUŽELKY</span>
              <h2 id="favorites-title">Oblíbené</h2>
            </div>
            <button
              autoFocus
              className="icon-button"
              aria-label="Zavřít oblíbené"
              onClick={close}
            >
              <X size={22} />
            </button>
          </div>
          <p className="sheet-description">
            Vaše týmy a soutěže na jednom místě.
          </p>
          {warning && (
            <p role="status" className="notice">
              {warning}
            </p>
          )}
          {playerFavorites}
          <FavoriteLeagues onChoose={chooseLeague} />
          <div className="side-heading">
            <span>MOJE TÝMY</span>
            <span className="counter">{teams.length}</span>
          </div>
          {teams.length ? (
            <div className="sheet-teams">
              {teams.map((team) => (
                <div className="sheet-team" key={team.id}>
                  <button onClick={() => chooseTeam(String(team.id))}>
                    <TeamLogo team={team} size={28} />
                    {team.name}
                  </button>
                  <FollowButton team={team} />
                </div>
              ))}
            </div>
          ) : (
            <div className="sheet-empty">
              <Star size={34} />
              <h3>Komu držíte palce?</h3>
              <p>
                Uložte si tým hvězdičkou u zápasu. Tady ho pak najdete jediným
                klepnutím.
              </p>
              <button className="button" onClick={showOverview}>
                Prohlédnout zápasy
              </button>
            </div>
          )}
          <p className="sheet-footnote">
            Uloženo v tomto prohlížeči. Bez registrace.
          </p>
        </div>
      </dialog>
    </>
  );
}
