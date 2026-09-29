import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="page">
      <div className="empty-state">
        <h1>Zápas se nenašel.</h1>
        <p>Odkaz už nemusí být platný.</p>
        <Link className="button" href="/">
          Zpět na přehled
        </Link>
      </div>
    </main>
  );
}
