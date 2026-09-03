import Link from "next/link";

import "../backoffice.css";

/**
 * Cadre commun aux pages légales.
 *
 * Elles sont volontairement sobres et lisibles sans compte : un vérificateur
 * de Paddle comme un membre doivent y arriver directement, sans passer par
 * l'application.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bo">
      <header className="mb-barre">
        <Link href="/" className="mb-mark">
          Palab
        </Link>
        <nav className="mb-nav">
          <Link href="/profils">Profils</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </header>

      <main className="bo-main lg-page">{children}</main>

      <footer className="lg-pied">
        <div className="lg-liens">
          <Link href="/conditions">Conditions générales</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/remboursement">Remboursement</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <p>© 2026 Palab — Réservé aux personnes majeures (18+).</p>
      </footer>
    </div>
  );
}
