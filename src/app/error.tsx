"use client";
import { ErrorNotice } from "@/components/common";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="page">
      <h1>Něco se nepovedlo.</h1>
      <ErrorNotice retry={reset} />
      <a href="/">Zpět na přehled</a>
    </main>
  );
}
