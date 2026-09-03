import Link from "next/link";

import { baremeAffichable, paliersAffichables } from "@/lib/credits-serveur";
import { prixDuCredit, prixLisible, remise } from "@/lib/credits";

export const metadata = {
  title: "Tarifs | Palab",
  description: "Barème des crédits Palab et paliers de recharge, prix toutes taxes comprises.",
};

/**
 * Page tarifaire publique, accessible sans compte.
 *
 * Elle ne fait que reprendre les mêmes données que l'écran de recharge du
 * membre — même barème, mêmes paliers — mais sans exiger de connexion :
 * c'est justement le point. Un visiteur, comme un vérificateur de paiement,
 * doit pouvoir voir ce qui se vend et à quel prix avant de créer un compte.
 */
export default async function Tarifs() {
  const [bareme, paliers] = await Promise.all([baremeAffichable(), paliersAffichables()]);

  return (
    <article className="lg-texte">
      <h1>Tarifs</h1>
      <p className="lg-date">Prix toutes taxes comprises, en euros.</p>

      <h2>Comment ça fonctionne</h2>
      <p>
        Palab fonctionne par crédits. On les achète d&apos;avance, par palier, et on les dépense
        en écrivant. Ils n&apos;expirent pas.
      </p>

      <ul>
        <li>
          Envoyer un message : {bareme.message} crédit{bareme.message > 1 ? "s" : ""}
        </li>
        <li>Envoyer une photo : {bareme.photo} crédits</li>
        <li>Minute d&apos;appel vidéo : {bareme.video_minute} crédits</li>
        <li>
          <b>Lire les messages reçus : gratuit, toujours.</b>
        </li>
      </ul>
      <p>
        {bareme.bonus_bienvenue} crédits sont offerts à l&apos;inscription, de quoi engager la
        conversation sans rien dépenser. Un message resté sans réponse pendant{" "}
        {bareme.jours_remboursement} jours est remboursé automatiquement.
      </p>

      {paliers.length > 0 && (
        <>
          <h2>Paliers de recharge</h2>
          <div className="lg-tarifs-grille">
            {paliers.map((palier) => {
              const economie = remise(palier, paliers);
              return (
                <div className="lg-tarif-carte" key={palier.code}>
                  {palier.mis_en_avant && <span className="lg-tarif-ruban">Le plus choisi</span>}
                  <p className="lg-tarif-nom">{palier.libelle}</p>
                  <p className="lg-tarif-credits">
                    {palier.credits} <span>crédits</span>
                  </p>
                  <p className="lg-tarif-prix">{prixLisible(palier.prix_cents, palier.devise)}</p>
                  <p className="lg-tarif-unitaire">
                    {prixDuCredit(palier)} le crédit
                    {economie > 0 && <b> · −{economie} %</b>}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p style={{ marginTop: "1.6rem" }}>
        Le détail contractuel de la vente figure dans les{" "}
        <Link href="/conditions">conditions générales</Link>, et les modalités de remboursement
        dans la <Link href="/remboursement">politique de remboursement</Link>. Les paiements sont
        traités par Paddle.
      </p>
    </article>
  );
}
