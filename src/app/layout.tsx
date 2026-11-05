import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Providers } from "@/components/providers";
import { getBuildInfo } from "@/lib/build-info";
import "./globals.css";

const buildInfo = getBuildInfo({
  KUZELKATOR_VERSION: process.env.KUZELKATOR_VERSION,
  KUZELKATOR_COMMIT: process.env.KUZELKATOR_COMMIT,
  KUZELKATOR_BUILT_AT: process.env.KUZELKATOR_BUILT_AT,
});

export const metadata: Metadata = {
  applicationName: "mojekuzelky.cz",
  title: "mojekuzelky.cz · Moje kuželky. Moje výsledky.",
  description:
    "Vaše týmy, oblíbení hráči a výsledky českých kuželek na jednom místě. Přehledně a bez registrace na mojekuzelky.cz.",
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
              <Link
                href="/"
                className="brand"
                aria-label="mojekuzelky.cz – přehled zápasů"
              >
                <BrandLogo />
              </Link>
              <span className="header-caption">
                Moje kuželky. Moje výsledky.
              </span>
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
              mojekuzelky.cz{" "}
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
            <span className="build-info">
              <Link
                href="/novinky"
                className="release-notes-link"
                prefetch={false}
              >
                Verze {buildInfo.version} · Co je nového
              </Link>
              {" · sestaveno "}
              {buildInfo.builtAt ? (
                <time dateTime={buildInfo.builtAt}>{buildInfo.builtLabel}</time>
              ) : (
                buildInfo.builtLabel
              )}
            </span>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
