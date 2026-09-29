"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import { teamSchema, type Team } from "@/domain/models";

export const favoriteLeagueSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  slug: z.string(),
  seasonId: z.number().int().positive(),
  seasonName: z.string(),
});
export type FavoriteLeague = z.infer<typeof favoriteLeagueSchema>;
const preferencesSchema = z.object({
  version: z.literal(1),
  teams: z.array(teamSchema).max(20),
  leagues: z.array(favoriteLeagueSchema).max(20).default([]),
});
const key = "kuzelkator:preferences:v1";
const Preferences = createContext<{
  teams: Team[];
  leagues: FavoriteLeague[];
  toggleLeague: (league: FavoriteLeague) => void;
  ready: boolean;
  warning: string;
  toggle: (team: Team) => void;
}>({
  teams: [],
  leagues: [],
  ready: false,
  warning: "",
  toggle: () => {},
  toggleLeague: () => {},
});
export function usePreferences() {
  return useContext(Preferences);
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60000,
            retry: false,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagues, setLeagues] = useState<FavoriteLeague[]>([]);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(key);
        const saved = raw
          ? preferencesSchema.parse(JSON.parse(raw))
          : { teams: [], leagues: [] };
        setTeams(saved.teams);
        setLeagues(saved.leagues);
      } catch {
        setWarning(
          "Uložené týmy nelze načíst. Oblíbené můžete nastavit znovu.",
        );
      }
      setReady(true);
    }
    read();
    const listener = (event: StorageEvent) => {
      if (event.key === key) read();
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  function toggle(team: Team) {
    if (!ready) return;
    if (!teams.some((item) => item.id === team.id) && teams.length >= 20) {
      setWarning("Můžete sledovat nejvýše 20 týmů.");
      return;
    }
    const next = teams.some((item) => item.id === team.id)
      ? teams.filter((item) => item.id !== team.id)
      : [...teams, team];
    setTeams(next);
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, teams: next, leagues }),
      );
      setWarning("");
    } catch {
      setWarning(
        "Prohlížeč nepovoluje ukládání. Výběr zůstane jen do zavření stránky.",
      );
    }
  }
  function toggleLeague(league: FavoriteLeague) {
    if (!ready) return;
    const exists = leagues.some(
      (item) => item.id === league.id && item.seasonId === league.seasonId,
    );
    if (!exists && leagues.length >= 20) {
      setWarning("Můžete sledovat nejvýše 20 soutěží.");
      return;
    }
    const next = exists
      ? leagues.filter(
          (item) => item.id !== league.id || item.seasonId !== league.seasonId,
        )
      : [...leagues, league];
    setLeagues(next);
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, teams, leagues: next }),
      );
      setWarning("");
    } catch {
      setWarning(
        "Prohlížeč nepovoluje ukládání. Výběr zůstane jen do zavření stránky.",
      );
    }
  }
  return (
    <QueryClientProvider client={client}>
      <Preferences.Provider
        value={{ teams, leagues, ready, warning, toggle, toggleLeague }}
      >
        {children}
      </Preferences.Provider>
    </QueryClientProvider>
  );
}
