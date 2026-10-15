import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { FavouritePlayers } from "@/components/player-pages";
import { releases } from "@/content/releases";

export const metadata: Metadata = {
  title: "Co je nového · Kuželkátor",
  description: "Novinky a opravy ve vydaných verzích Kuželkátoru.",
};
const dateFormat = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Prague",
});
export default function ReleaseNotesPage() {
  return (
    <main id="main" className="page dashboard">
      <DesktopSidebar playerFavorites={<FavouritePlayers sidebar />} />
      <section className="dashboard-main release-notes">
        <Link href="/" className="release-back">
          <ArrowLeft size={18} aria-hidden="true" /> Přehled zápasů
        </Link>
        <h1>Co je nového</h1>
        <p className="muted">
          Novinky a opravy ve vydaných verzích Kuželkátoru.
        </p>
        {releases.map((release, index) => (
          <article
            className="release-card"
            key={release.version}
            aria-labelledby={`release-${release.version}`}
          >
            <header>
              <h2 id={`release-${release.version}`}>Verze {release.version}</h2>
              {index === 0 && (
                <span className="release-latest">Nejnovější vydání</span>
              )}
              <time dateTime={release.date}>
                {dateFormat.format(new Date(`${release.date}T12:00:00Z`))}
              </time>
            </header>
            <ul>
              {release.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <MobileNavigation playerFavorites={<FavouritePlayers />} />
    </main>
  );
}
