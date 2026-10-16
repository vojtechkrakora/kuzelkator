import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SocialMatch } from "@/components/social-match";
import "./social.css";

export const metadata: Metadata = {
  title: "Výsledek pro sdílení · Kuželkátor",
  robots: { index: false, follow: false },
};
export default async function SocialMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)
    notFound();
  return <SocialMatch id={Number(id)} />;
}
