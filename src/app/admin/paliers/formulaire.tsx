"use client";

import { useActionState } from "react";

import { prixLisible } from "@/lib/credits";
import type { PalierCredits } from "@/lib/supabase/types";

import { enregistrerPrixPaddle } from "../actions";

/**
 * Rattachement des paliers aux prix Paddle.
 *
 * Un identifiant de produit (« pro_ ») est accepté sans broncher par la base
 * mais n'ouvre aucun paiement : la confusion est facile et ne se voit qu'à
 * l'essai. L'action la refuse explicitement, et l'aide ci-dessous dit où
 * trouver le bon.
 */
export default function FormulairePrix({ paliers }: { paliers: PalierCredits[] }) {
  const [resultat, action, enCours] = useActionState(enregistrerPrixPaddle, null);

  return (
    <form action={action} className="bo-carte bo-carte-p">
      <h2 className="bo-h2">Prix Paddle</h2>
      <p className="bo-aide" style={{ marginTop: "0.4rem" }}>
        Dans Paddle, ouvrez <b>Catalog → Products</b>, puis le produit. La ligne de prix affichée
        en dessous porte un identifiant qui commence par <code>pri_</code> — c&apos;est celui-là.
        Celui du produit, qui commence par <code>pro_</code>, n&apos;ouvre aucun paiement.
      </p>
      <p className="bo-aide" style={{ marginTop: "0.5rem" }}>
        Un palier laissé vide n&apos;est plus proposé à la vente.
      </p>

      {resultat && (
        <p
          className={`bo-message ${resultat.ok ? "succes" : "erreur"}`}
          style={{ marginTop: "1rem" }}
        >
          {resultat.message}
        </p>
      )}

      <div style={{ marginTop: "1.3rem", display: "grid", gap: "0.9rem" }}>
        {paliers.map((palier) => (
          <div className="bo-champ" key={palier.code}>
            <label htmlFor={`prix_${palier.code}`}>
              {palier.libelle} — {palier.credits} crédits pour{" "}
              {prixLisible(palier.prix_cents, palier.devise)}
            </label>
            <input
              id={`prix_${palier.code}`}
              name={`prix_${palier.code}`}
              type="text"
              defaultValue={palier.paddle_price_id ?? ""}
              placeholder="pri_…"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        ))}
      </div>

      <button type="submit" className="bo-btn" disabled={enCours} style={{ marginTop: "1.2rem" }}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
