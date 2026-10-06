"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Heart, LayoutGrid, Star } from "lucide-react";
import { FollowButton } from "./common";
import { FavoriteLeagues } from "./favorite-leagues";
import { TeamLogo } from "./team-logo";
import { usePreferences, type FavoriteLeague } from "./providers";

export function DesktopSidebar({
  selectedTeamId = "",
  overviewActive = false,
  onOverview,
  onChooseTeam,
  onChooseLeague,
  playerFavorites,
}: {
  selectedTeamId?: string;
  overviewActive?: boolean;
  onOverview?: () => void;
  onChooseTeam?: (id: string) => void;
  onChooseLeague?: (league: FavoriteLeague) => void;
  playerFavorites: ReactNode;
}) {
  const router = useRouter();
  const { teams } = usePreferences();
  const chooseTeam =
    onChooseTeam ??
    ((id: string) => {
      router.push(`/?team=${id}`);
    });
  const chooseLeague =
    onChooseLeague ??
    ((league: FavoriteLeague) => {
      router.push(`/?competition=${league.id}&season=${league.seasonId}`);
    });

  return (
    <aside className="sidebar">
      <div className="nav-label">VAŠE KUŽELKY</div>
      <button
        className={`side-link ${overviewActive ? "active" : ""}`}
        onClick={() => (onOverview ? onOverview() : router.push("/"))}
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
                className={
                  selectedTeamId === String(team.id) ? "selected-team" : ""
                }
                onClick={() => chooseTeam(String(team.id))}
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
      <FavoriteLeagues onChoose={chooseLeague} />
      {playerFavorites}
      <div className="sidebar-note">
        <Heart size={17} />
        <span>Vaše oblíbené zůstávají v tomto prohlížeči. Bez registrace.</span>
      </div>
      <div className="sidebar-bottom">
        <span className="green-dot" /> Napojeno na veřejné API ČKA
      </div>
    </aside>
  );
}
