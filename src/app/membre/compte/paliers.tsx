"use client";

import { CheckoutEventNames, initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useEffect, useState } from "react";

import { prixDuCredit, prixLisible, remise } from "@/lib/credits";
import type { PalierCredits } from "@/lib/supabase/types";

/**
 * Paliers de recharge et ouverture du paiement.
 *
 * Les prix viennent de la base et sont affichés TTC, comme l'exige la vente à
 * un consommateur européen. Le prix au crédit et la remise sont calculés, pas
 * saisis : deux chiffres à maintenir en moins, et aucun risque qu'une remise
 * affichée cesse de correspondre au prix réel.
 *
 * Le paiement ne crédite rien depuis ici. Le tunnel se ferme, et c'est la
 * notification signée reçue par le serveur qui accorde les crédits — un retour
 * de navigateur se fabrique, une signature Paddle non.
 */
export default function Paliers({
  paliers,
  membreId,
  email,
}: {
  paliers: PalierCredits[];
  membreId: string;
  email: string;
}) {
  const [paddle, setPaddle] = useState<Paddle>();
  const [enAttente, setEnAttente] = useState<string | null>(null);
  const [paye, setPaye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const jeton = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  useEffect(() => {
    if (!jeton) return;

    void initializePaddle({
      token: jeton,
      environment:
        process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
      // La confirmation n'est affichée qu'au paiement effectif. L'annoncer au
      // clic prétendrait un règlement là où le tunnel vient seulement de
      // s'ouvrir — et resterait affichée si l'acheteur renonce.
      eventCallback: (evenement) => {
        if (evenement.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
          setPaye(true);
          setErreur(null);
          setEnAttente(null);
          return;
        }

        if (
          evenement.name === CheckoutEventNames.CHECKOUT_ERROR ||
          evenement.name === CheckoutEventNames.CHECKOUT_PAYMENT_ERROR
        ) {
          // Le tunnel de Paddle n'affiche qu'un « Something went wrong »
          // générique, alors qu'il nous transmet ici le code et le détail.
          // Sans les montrer, il ne reste rien pour savoir quoi corriger.
          setErreur(
            [evenement.code, evenement.detail].filter(Boolean).join(" — ") ||
              "Paddle a refusé l'ouverture du paiement sans en donner la raison.",
          );
          setEnAttente(null);
          return;
        }

        if (evenement.name === CheckoutEventNames.CHECKOUT_CLOSED) setEnAttente(null);
      },
    }).then((instance) => {
      if (instance) setPaddle(instance);
    });
  }, [jeton]);

  if (!paliers.length) return null;

  function acheter(palier: PalierCredits) {
    if (!paddle || !palier.paddle_price_id) return;
    setEnAttente(palier.code);
    setErreur(null);

    paddle.Checkout.open({
      items: [{ priceId: palier.paddle_price_id, quantity: 1 }],
      customer: { email },
      // Le serveur y lira à qui créditer. Le montant, lui, n'est pas transmis :
      // il se déduit du prix côté base, hors de portée du navigateur.
      customData: { member_id: membreId, palier: palier.code },
      settings: { displayMode: "overlay", locale: "fr" },
    });
  }

  return (
    <section className="bo-carte bo-carte-p" id="recharger" style={{ marginTop: "1.6rem" }}>
      <h2 className="bo-h2">Recharger mon compte</h2>
      <p className="bo-aide" style={{ marginTop: "0.4rem" }}>
        Les crédits n&apos;expirent pas. Plus le palier est grand, moins le crédit coûte cher.
      </p>

      {erreur && (
        <p className="bo-message erreur" style={{ marginTop: "1rem" }}>
          <b>Paiement indisponible.</b> {erreur}
        </p>
      )}

      {paye && (
        <p className="bo-message succes" style={{ marginTop: "1rem" }}>
          Paiement enregistré. Vos crédits apparaissent dès que Paddle nous l&apos;a confirmé,
          généralement en quelques secondes — actualisez la page si le solde n&apos;a pas encore
          bougé.
        </p>
      )}

      <div className="mb-paliers">
        {paliers.map((palier) => {
          const economie = remise(palier, paliers);
          const achetable = Boolean(paddle && palier.paddle_price_id);

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

              <button
                type="button"
                className="bo-btn"
                disabled={!achetable}
                onClick={() => acheter(palier)}
              >
                {!achetable
                  ? "Bientôt disponible"
                  : enAttente === palier.code
                    ? "Ouverture…"
                    : "Choisir"}
              </button>
            </article>
          );
        })}
      </div>

      <p className="bo-aide" style={{ marginTop: "1.1rem" }}>
        Prix toutes taxes comprises. Paiement sécurisé par Paddle.
      </p>
    </section>
  );
}
