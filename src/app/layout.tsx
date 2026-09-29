import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ArrowUpRight, CircleDot } from "lucide-react";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kuželkátor · Vaše hra. Vaše výsledky.",
  description:
    "Osobní přehled českých kuželek. Sledujte své týmy, zápasy a výsledky.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#176347",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>
        <Providers>
          <a className="skip-link" href="#main">
            Přejít na obsah
          </a>
          <header className="site-header">
            <div className="header-inner">
              <Link href="/" className="brand">
                <span className="brand-icon">
                  <CircleDot size={27} strokeWidth={2.5} />
                </span>
                Kuželkátor<span className="beta">POC</span>
              </Link>
              <span className="header-caption">Kuželky. Blíž k vám.</span>
              <a
                className="source-link"
                href="https://vysledky.kuzelky.cz/"
                target="_blank"
                rel="noreferrer"
              >
                Výsledkový servis ČKA <ArrowUpRight size={16} />
              </a>
            </div>
          </header>
          {children}
          <footer className="footer">
            <span>
              Kuželkátor{" "}
              <span className="muted">/ Nezávislý přehled českých kuželek</span>
            </span>
            <a
              href="https://kuzelky.cz/api/docs/swagger"
              target="_blank"
              rel="noreferrer"
            >
              Oficiální data ČKA ↗
            </a>
            <span className="muted">Časy v zóně Europe/Prague</span>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
