"use client";

import { useActionState, useEffect, useRef } from "react";

import { repondre } from "../../actions";

export default function FormulaireReponse({
  conversationId,
  prenom,
}: {
  conversationId: string;
  prenom: string;
}) {
  const [resultat, action, enCours] = useActionState(repondre, null);
  const champ = useRef<HTMLTextAreaElement>(null);

  // Vider le champ une fois le message parti, pour ne pas risquer de le
  // renvoyer deux fois.
  useEffect(() => {
    if (resultat?.ok && champ.current) champ.current.value = "";
  }, [resultat]);

  return (
    <form action={action} className="bo-repondre">
      <input type="hidden" name="conversation_id" value={conversationId} />

      {resultat && !resultat.ok && (
        <p className="bo-message erreur" style={{ marginBottom: "0.85rem" }}>
          {resultat.message}
        </p>
      )}

      <textarea
        ref={champ}
        name="corps"
        rows={3}
        required
        placeholder={`Répondre au nom de ${prenom}…`}
      />

      <div className="pied">
        <p>
          Envoyé au nom de {prenom}. Votre code d&apos;agent reste attaché au message.
        </p>
        <button type="submit" className="bo-btn" disabled={enCours}>
          {enCours ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </form>
  );
}
