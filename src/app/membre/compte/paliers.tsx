import type { PalierCredits } from "@/lib/supabase/types";
import { prixDuCredit, prixLisible, remise } from "@/lib/credits";

/**
 * Paliers de recharge.
 *
 * Les prix viennent de la base et sont affichés TTC, comme l'exige la vente à
 * un consommateur européen. Le prix au crédit et la remise sont calculés, pas
 * saisis : deux chiffres à maintenir en moins, et aucun risque qu'une remise
 * affichée cesse de correspondre au prix réel.
 *
 * Le paiement n'est pas encore branché. Plutôt qu'un bouton mort, l'écran
 * annonce la grille et le dit franchement — un membre qui connaît le prix
 * avant de s'engager est un membre qui revient.
 */
export default function Paliers({ paliers }: { paliers: PalierCredits[] }) {
  if (!paliers.length) return null;

  return (
    <section className="bo-carte bo-carte-p" id="recharger" style={{ marginTop: "1.6rem" }}>
      <h2 className="bo-h2">Recharger mon compte</h2>
      <p className="bo-aide" style={{ marginTop: "0.4rem" }}>
        Les crédits n&apos;expirent pas. Plus le palier est grand, moins le crédit coûte cher.
      </p>

      <div className="mb-paliers">
        {paliers.map((palier) => {
          const economie = remise(palier, paliers);

          return (
            <article
              key={palier.code}
              className={`mb-palier${palier.mis_en_avant ? " en-avant" : ""}`}
            >
              {palier.mis_en_avant && <span className="ruban">Le plus choisi</span>}

              <p className="nom">{palier.libelle}</p>
              <p className="credits">
                {palier.credits}
                <span> crédits</span>
              </p>
              <p className="prix">{prixLisible(palier.prix_cents, palier.devise)}</p>
              <p className="unitaire">
                {prixDuCredit(palier)} le crédit
                {economie > 0 && <b> · −{economie} %</b>}
              </p>

              <button type="button" className="bo-btn" disabled>
                Bientôt disponible
              </button>
            </article>
          );
        })}
      </div>

      <p className="bo-aide" style={{ marginTop: "1.1rem" }}>
        Prix toutes taxes comprises. Le paiement en ligne ouvrira très bientôt.
      </p>
    </section>
  );
}
