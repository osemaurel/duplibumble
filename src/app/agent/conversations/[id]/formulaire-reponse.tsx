"use client";

import { useState } from "react";

import Composeur from "@/components/backoffice/composeur";
import { useEchange } from "@/components/backoffice/echange";

import { proposerBrouillon, repondre } from "../../actions";

/**
 * Barre de réponse côté agent. Même principe que côté membre : la bulle se
 * pose au clic, puis le vrai message la remplace.
 */
export default function FormulaireReponse({
  conversationId,
  prenom,
  modeles = [],
  assistant = false,
}: {
  conversationId: string;
  prenom: string;
  /** Réponses types de l'agent, proposées en raccourci au-dessus de la saisie. */
  modeles?: { id: string; libelle: string; corps: string }[];
  /** Vrai si l'agent a activé son assistant de rédaction. */
  assistant?: boolean;
}) {
  const echange = useEchange();
  const [resultat, setResultat] = useState<{ ok: boolean; message?: string } | null>(null);
  const [envois, setEnvois] = useState(0);
  const [brouillon, setBrouillon] = useState("");
  const [proposition, setProposition] = useState<string | null>(null);
  const [redaction, setRedaction] = useState(false);

  async function demanderBrouillon() {
    setRedaction(true);
    setResultat(null);

    const reponse = await proposerBrouillon(conversationId);
    setRedaction(false);

    if (!reponse.ok) {
      setResultat({ ok: false, message: reponse.message });
      return;
    }

    // Retenu pour la comparaison à l'envoi : si l'agent repart de ce texte sans
    // y toucher, le message portera la trace de la machine ; s'il le réécrit,
    // il redevient le sien.
    setProposition(reponse.texte);
    setBrouillon(reponse.texte);
    setEnvois((n) => n + 1);
  }

  async function soumettre(donnees: FormData) {
    const corps = String(donnees.get("corps") ?? "").trim();
    const piece = String(donnees.get("attachment_path") ?? "").trim();
    if (!corps && !piece) return;

    // Le texte part tel que l'assistant l'a proposé : la trace le consigne.
    // Retouché, ne serait-ce que d'un mot, il redevient celui de l'agent.
    if (proposition !== null && corps === proposition.trim()) {
      donnees.set("redige_par_ia", "on");
    }
    setProposition(null);

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

      {assistant && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
          <button
            type="button"
            className="bo-btn fantome petit"
            onClick={demanderBrouillon}
            disabled={redaction}
          >
            {redaction ? "Rédaction…" : "✨ Proposer une réponse"}
          </button>
          {proposition !== null && (
            <span className="bo-aide" style={{ fontSize: "0.76rem" }}>
              Brouillon proposé — relisez-le avant d&apos;envoyer.
            </span>
          )}
        </div>
      )}

      {modeles.length > 0 && (
        <select
          className="bo-modeles-reponse"
          defaultValue=""
          aria-label="Insérer une réponse type"
          onChange={(e) => {
            const modele = modeles.find((m) => m.id === e.target.value);
            if (!modele) return;
            setBrouillon(modele.corps);
            setEnvois((n) => n + 1);
            e.target.value = "";
          }}
        >
          <option value="" disabled>
            Insérer une réponse type…
          </option>
          {modeles.map((modele) => (
            <option key={modele.id} value={modele.id}>
              {modele.libelle}
            </option>
          ))}
        </select>
      )}

      <Composeur
        conversationId={conversationId}
        placeholder={`Répondre au nom de ${prenom}…`}
        brouillon={brouillon}
        key={envois}
      />
    </form>
  );
}
