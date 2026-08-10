"use client";

import { useActionState } from "react";

import ZoneMessage from "@/components/backoffice/zone-message";

import { envoyerMessage } from "../../actions";

export default function FormulaireMessage({
  conversationId,
  prenom,
  cout,
  solde,
}: {
  conversationId: string;
  prenom: string;
  cout: number;
  solde: number;
}) {
  const [resultat, action, enCours] = useActionState(envoyerMessage, null);
  const soldeInsuffisant = solde < cout;

  return (
    <form action={action} className="bo-repondre">
      <input type="hidden" name="conversation_id" value={conversationId} />

      {resultat && !resultat.ok && (
        <p className="bo-message erreur" style={{ marginBottom: "0.85rem" }}>
          {resultat.message}
        </p>
      )}

      {soldeInsuffisant && (
        <p className="bo-message avertissement" style={{ marginBottom: "0.85rem" }}>
          Vos crédits sont épuisés. Le rechargement arrive très bientôt.
        </p>
      )}

      <ZoneMessage
        placeholder={`Écrire à ${prenom}…`}
        desactive={soldeInsuffisant}
        reinitialiser={resultat?.ok ? resultat.message + solde : null}
      />

      <div className="pied">
        <p>
          {cout} crédit{cout > 1 ? "s" : ""} par message · il vous en reste {solde}
        </p>
        <button type="submit" className="bo-btn" disabled={enCours || soldeInsuffisant}>
          {enCours ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </form>
  );
}
