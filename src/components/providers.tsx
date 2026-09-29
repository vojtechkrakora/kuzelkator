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

const preferencesSchema = z.object({
  version: z.literal(1),
  teams: z.array(teamSchema).max(20),
});
const key = "kuzelkator:preferences:v1";
const Preferences = createContext<{
  teams: Team[];
  ready: boolean;
  warning: string;
  toggle: (team: Team) => void;
}>({ teams: [], ready: false, warning: "", toggle: () => {} });
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
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(key);
        if (raw) setTeams(preferencesSchema.parse(JSON.parse(raw)).teams);
        else setTeams([]);
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
      localStorage.setItem(key, JSON.stringify({ version: 1, teams: next }));
      setWarning("");
    } catch {
      setWarning(
        "Prohlížeč nepovoluje ukládání. Výběr zůstane jen do zavření stránky.",
      );
    }
  }
  return (
    <QueryClientProvider client={client}>
      <Preferences.Provider value={{ teams, ready, warning, toggle }}>
        {children}
      </Preferences.Provider>
    </QueryClientProvider>
  );
}
