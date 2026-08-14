"use client";

import { useState } from "react";

import Composeur from "@/components/backoffice/composeur";
import { useEchange } from "@/components/backoffice/echange";

import { repondre } from "../../actions";

/**
 * Barre de réponse côté agent. Même principe que côté membre : la bulle se
 * pose au clic, puis le vrai message la remplace.
 */
export default function FormulaireReponse({
  conversationId,
  prenom,
}: {
  conversationId: string;
  prenom: string;
}) {
  const echange = useEchange();
  const [resultat, setResultat] = useState<{ ok: boolean; message?: string } | null>(null);
  const [envois, setEnvois] = useState(0);
  const [brouillon, setBrouillon] = useState("");

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
      signature: "vous",
      enVol: true,
    });

    setBrouillon("");
    setEnvois((n) => n + 1);

    const reponse = await repondre(null, donnees);
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

      <Composeur
        conversationId={conversationId}
        placeholder={`Répondre au nom de ${prenom}…`}
        brouillon={brouillon}
        key={envois}
      />
    </form>
  );
}
