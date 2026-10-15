import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ObsOverlay } from "@/components/obs-overlay";
import { ObsSetup } from "@/components/obs-setup";
import { overlayPanels } from "@/domain/obs-overlay";
import { obsSettings } from "@/domain/obs-settings";
import "./overlay.css";
export const metadata: Metadata = {
  title: "OBS · Kuželkátor",
  robots: { index: false, follow: false },
};
export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    panel?: string | string[];
    density?: string | string[];
    width?: string;
    height?: string;
    scale?: string;
    gap?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { panel, density = "compact" } = query;
  if (density !== "compact" && density !== "full") notFound();
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)
    notFound();
  if (panel === undefined) return <ObsSetup id={Number(id)} />;
  const selected = overlayPanels.find((value) => value === panel);
  if (!selected) notFound();
  return (
    <ObsOverlay
      id={Number(id)}
      panel={selected}
      density={density}
      settings={obsSettings(selected, query)}
    />
  );
}
