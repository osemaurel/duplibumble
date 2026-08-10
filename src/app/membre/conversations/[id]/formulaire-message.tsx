"use client";

import { useActionState } from "react";

import Composeur from "@/components/backoffice/composeur";

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

      {resultat && !resultat.ok && <p className="bo-message erreur">{resultat.message}</p>}

      {soldeInsuffisant && (
        <p className="bo-message avertissement">
          Vos crédits sont épuisés. Le rechargement arrive très bientôt.
        </p>
      )}

      <Composeur
        conversationId={conversationId}
        placeholder={`Écrire à ${prenom}…`}
        desactive={soldeInsuffisant}
        enCours={enCours}
        key={resultat?.ok ? `envoye-${solde}` : "saisie"}
      />
    </form>
  );
}
