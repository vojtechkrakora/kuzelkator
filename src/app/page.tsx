import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard";
export default function Home() {
  return (
    <Suspense
      fallback={
        <main id="main" className="page">
          <p>Načítání přehledu…</p>
        </main>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
