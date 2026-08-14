"use client";

import { useState } from "react";

import Composeur from "@/components/backoffice/composeur";
import { useEchange } from "@/components/backoffice/echange";

import { envoyerMessage } from "../../actions";

/**
 * Barre d'envoi côté membre.
 *
 * Le message est déposé dans le fil avant l'appel au serveur : il apparaît au
 * clic, marqué « Envoi… », puis cède la place au vrai message. Attendre la
 * réponse du serveur pour l'afficher donnait deux secondes d'écran figé, où
 * l'on ne savait pas si le clic avait été pris.
 */
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
  const echange = useEchange();
  const [resultat, setResultat] = useState<{ ok: boolean; message?: string } | null>(null);
  const [envois, setEnvois] = useState(0);
  const [brouillon, setBrouillon] = useState("");

  const soldeInsuffisant = solde < cout;

  async function soumettre(donnees: FormData) {
    const corps = String(donnees.get("corps") ?? "").trim();
    const piece = String(donnees.get("attachment_path") ?? "").trim();
    if (!corps && !piece) return;

    echange?.deposer({
      id: `en-vol-${Date.now()}`,
      body: corps,
      created_at: new Date().toISOString(),
      mienne: true,
      attachment_path: piece || null,
      apercuLocal: String(donnees.get("apercu_local") ?? "") || null,
      enVol: true,
    });

    // Vider la saisie tout de suite : la barre doit être prête pour le message
    // suivant, pas bloquée le temps de l'aller-retour.
    setBrouillon("");
    setEnvois((n) => n + 1);

    const reponse = await envoyerMessage(null, donnees);
    setResultat(reponse);

    // Refusé : on rend son texte à l'expéditeur plutôt que de le perdre.
    if (!reponse.ok) {
      setBrouillon(corps);
      setEnvois((n) => n + 1);
    }
  }

  return (
    <form action={soumettre} className="bo-repondre">
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
        brouillon={brouillon}
        key={envois}
      />
    </form>
  );
}
