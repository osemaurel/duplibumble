import Link from "next/link";

import BarreOnglets from "@/components/membre/barre-onglets";
import EnteteMembre, { resumeMembre } from "@/components/membre/entete-membre";
import { getSessionProfile } from "@/lib/auth";

import "../backoffice.css";

/**
 * Cadre commun à la liste et aux fiches.
 *
 * L'en-tête était recopié dans les deux pages : chaque navigation le
 * reconstruisait, et il disparaissait le temps du chargement. Placé ici, il
 * reste en place — seul le contenu change. C'est ce qui fait qu'un passage
 * d'une fiche à l'autre paraît instantané plutôt que rechargé.
 *
 * Un membre connecté y retrouve le cadre de son espace : même en-tête avec son
 * solde, et surtout la barre du bas. Ces pages vivent hors de `/membre`, mais
 * consulter les profils ne fait pas sortir de son espace — toucher « Profils »
 * faisait pourtant disparaître la barre et le solde d'un coup, et il ne restait
 * plus aucun chemin de retour vers les messages sinon celui du navigateur.
 *
 * Un visiteur sans compte, lui, garde l'en-tête public : c'est là qu'on lui
 * propose de s'inscrire, et il n'a pas d'espace où retourner.
 */
export default async function ProfilsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  const estMembre = session?.profile.role === "member";

  if (estMembre) {
    const { nonLus } = await resumeMembre(session.userId);

    return (
      // `mb-avec-onglets` réserve la place de la barre du bas : sans elle, la
      // fin de la liste se cache derrière.
      <div className="bo mb-avec-onglets">
        <EnteteMembre membreId={session.userId} />
        {children}
        <BarreOnglets nonLus={nonLus} />
      </div>
    );
  }

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
