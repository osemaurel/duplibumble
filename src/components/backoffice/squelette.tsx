/**
 * Silhouettes affichées pendant qu'une page se prépare.
 *
 * Sans elles, cliquer sur un lien ne produit rien tant que le serveur n'a pas
 * fini toutes ses requêtes : l'écran reste sur la page précédente, et on croit
 * que le clic n'a pas été pris. Next les affiche à l'instant du clic, puis les
 * remplace par le contenu réel dès qu'il arrive.
 *
 * Elles imitent la forme de ce qui va venir — même hauteur, même grille — pour
 * que le remplacement ne fasse pas sauter la page.
 */

export function Barre({ largeur = "100%", hauteur = "1rem" }: { largeur?: string; hauteur?: string }) {
  return <span className="bo-sq" style={{ width: largeur, height: hauteur }} />;
}

/** Bloc de titre : un intitulé, une ligne d'explication. */
export function TitreFantome() {
  return (
    <div className="bo-sq-titre">
      <Barre largeur="14rem" hauteur="1.9rem" />
      <Barre largeur="26rem" hauteur="0.95rem" />
    </div>
  );
}

/** Liste de conversations ou de fiches. */
export function ListeFantome({ lignes = 6 }: { lignes?: number }) {
  return (
    <div className="bo-carte" aria-hidden="true">
      {Array.from({ length: lignes }, (_, i) => (
        <div className="bo-sq-ligne" key={i}>
          <span className="bo-sq rond" />
          <div className="bo-sq-corps">
            <Barre largeur={`${7 + ((i * 3) % 5)}rem`} hauteur="0.95rem" />
            <Barre largeur={`${13 + ((i * 5) % 9)}rem`} hauteur="0.8rem" />
          </div>
          <Barre largeur="3.5rem" hauteur="0.75rem" />
        </div>
      ))}
    </div>
  );
}

/** Grille de profils avec photo. */
export function GalerieFantome({ cartes = 8 }: { cartes?: number }) {
  return (
    <div className="mb-galerie" aria-hidden="true">
      {Array.from({ length: cartes }, (_, i) => (
        <div className="bo-sq-carte" key={i}>
          <span className="bo-sq photo" />
          <div className="bo-sq-corps">
            <Barre largeur="8rem" hauteur="1rem" />
            <Barre largeur="5.5rem" hauteur="0.8rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Fil de discussion : l'en-tête est déjà là, les bulles arrivent. */
export function ConversationFantome() {
  const bulles = [
    { mienne: false, largeur: "62%" },
    { mienne: true, largeur: "48%" },
    { mienne: false, largeur: "70%" },
    { mienne: true, largeur: "40%" },
    { mienne: false, largeur: "55%" },
  ];

  return (
    <div className="bo-carte bo-conv plein" aria-hidden="true">
      <div className="bo-conv-entete">
        <span className="bo-sq rond" />
        <div className="bo-sq-corps">
          <Barre largeur="9rem" hauteur="1.05rem" />
          <Barre largeur="6rem" hauteur="0.78rem" />
        </div>
      </div>

      <div className="bo-sq-fil">
        {bulles.map((b, i) => (
          <span
            key={i}
            className={`bo-sq bulle${b.mienne ? " mienne" : ""}`}
            style={{ width: b.largeur }}
          />
        ))}
      </div>
    </div>
  );
}

/** Tableau d'administration. */
export function TableauFantome({ lignes = 8 }: { lignes?: number }) {
  return (
    <div className="bo-carte" aria-hidden="true">
      {Array.from({ length: lignes }, (_, i) => (
        <div className="bo-sq-ligne" key={i}>
          <span className="bo-sq rond" />
          <Barre largeur={`${8 + ((i * 4) % 7)}rem`} hauteur="0.95rem" />
          <span style={{ flex: 1 }} />
          <Barre largeur="4.5rem" hauteur="1.4rem" />
        </div>
      ))}
    </div>
  );
}
