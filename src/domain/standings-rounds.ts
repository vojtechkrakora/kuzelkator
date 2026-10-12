export type RoundMatch = {
  round: number | null;
  status: string;
  date?: string | null;
};
const started = (match: RoundMatch) =>
  ["FINISHED", "FORFEIT", "IN_PROGRESS"].includes(match.status);

/** Infer the regular round from the majority of its draw, never one early fixture. */
export function standingsRounds(matches: RoundMatch[], today: string) {
  const groups = new Map<number, RoundMatch[]>();
  for (const match of matches) {
    if (match.round == null) continue;
    const group = groups.get(match.round) ?? [];
    group.push(match);
    groups.set(match.round, group);
  }
  const playedRounds = [...groups]
    .filter(([, group]) => group.some(started))
    .map(([round]) => round)
    .sort((a, b) => b - a);
  const regularRound =
    [...groups]
      .filter(
        ([, group]) =>
          group.some(started) &&
          group.filter(
            (match) =>
              started(match) ||
              (match.date != null &&
                /^\d{4}-\d{2}-\d{2}/.test(match.date) &&
                match.date.slice(0, 10) <= today),
          ).length >
            group.length / 2,
      )
      .map(([round]) => round)
      .sort((a, b) => b - a)[0] ?? null;
  return { playedRounds, regularRound };
}
