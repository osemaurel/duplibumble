"use client";

import { useActionState } from "react";

import ZoneMessage from "@/components/backoffice/zone-message";

import { repondre } from "../../actions";

export default function FormulaireReponse({
  conversationId,
  prenom,
}: {
  conversationId: string;
  prenom: string;
}) {
  const [resultat, action, enCours] = useActionState(repondre, null);

  return (
    <form action={action} className="bo-repondre">
      <input type="hidden" name="conversation_id" value={conversationId} />

      {resultat && !resultat.ok && (
        <p className="bo-message erreur" style={{ marginBottom: "0.85rem" }}>
          {resultat.message}
        </p>
      )}

      <ZoneMessage
        placeholder={`Répondre au nom de ${prenom}…`}
        reinitialiser={resultat?.ok ? resultat.message : null}
      />

      <div className="pied">
        <p>
          Envoyé au nom de {prenom}. Votre code d&apos;agent reste attaché au message.
          <span className="bo-astuce">Entrée pour envoyer, Maj+Entrée pour aller à la ligne</span>
        </p>
        <button type="submit" className="bo-btn" disabled={enCours}>
          {enCours ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </form>
  );
}
