"use client";

import { useActionState } from "react";

import Composeur from "@/components/backoffice/composeur";

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

      {resultat && !resultat.ok && <p className="bo-message erreur">{resultat.message}</p>}

      <Composeur
        conversationId={conversationId}
        placeholder={`Répondre au nom de ${prenom}…`}
        enCours={enCours}
        key={resultat?.ok ? "envoye" : "saisie"}
      />
    </form>
  );
}
