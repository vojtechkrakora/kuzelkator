import { notFound } from "next/navigation";
import { getPlayer } from "@/server/players";
import { UpstreamError } from "@/server/cache";
import { PlayerSeasonPage } from "@/components/player-pages";
export const dynamic = "force-dynamic";
export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const { season } = await searchParams;
  const initialSeason =
    season &&
    /^\d+$/.test(season) &&
    Number.isSafeInteger(Number(season)) &&
    Number(season) > 0
      ? season
      : "";
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)
    notFound();
  try {
    const result = await getPlayer(Number(id));
    return (
      <PlayerSeasonPage player={result.data} initialSeason={initialSeason} />
    );
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) notFound();
    throw error;
  }
}
