export function teamSeasonHref(teamId: number | string, seasonId?: string) {
  return {
    pathname: "/",
    query: {
      team: String(teamId),
      ...(seasonId ? { season: seasonId } : {}),
    },
  };
}
