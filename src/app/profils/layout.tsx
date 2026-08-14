import Link from "next/link";

import { getSessionProfile } from "@/lib/auth";

import "../backoffice.css";

/**
 * Cadre commun à la liste et aux fiches.
 *
 * L'en-tête était recopié dans les deux pages : chaque navigation le
 * reconstruisait, et il disparaissait le temps du chargement. Placé ici, il
 * reste en place — seul le contenu change. C'est ce qui fait qu'un passage
 * d'une fiche à l'autre paraît instantané plutôt que rechargé.
 */
export default async function ProfilsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();

  return (
    <div className="bo">
      <header className="mb-barre">
        <Link href="/" className="mb-mark">
          Palab
        </Link>
        <nav className="mb-nav">
          <Link href="/profils">Profils</Link>
          {session ? (
            <Link href="/membre" className="bo-btn petit">
              Mon espace
            </Link>
          ) : (
            <>
              <Link href="/connexion">Se connecter</Link>
              <Link href="/inscription" className="bo-btn petit">
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </header>

      {children}
    </div>
  );
}
