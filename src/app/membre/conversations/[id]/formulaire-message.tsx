"use client";

import { useActionState, useEffect, useRef } from "react";

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
  const champ = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (resultat?.ok && champ.current) champ.current.value = "";
  }, [resultat]);

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

      <textarea
        ref={champ}
        name="corps"
        rows={3}
        required
        disabled={soldeInsuffisant}
        placeholder={`Écrire à ${prenom}…`}
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
