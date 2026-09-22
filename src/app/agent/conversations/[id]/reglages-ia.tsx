"use client";

import { useActionState, useState } from "react";

import { reglerIAConversation } from "../../actions";

/**
 * Interrupteur de l'IA pour cette conversation, et consignes propres à elle.
 *
 * Replié par défaut : l'agent vient répondre, pas régler. Le seul état qui doit
 * se voir sans rien ouvrir, c'est si l'IA parle ici ou non — c'est la question
 * qu'il se pose en arrivant sur un fil qu'il n'a pas suivi.
 */
export default function ReglagesIA({
  conversationId,
  actif,
  consignes,
}: {
  conversationId: string;
  actif: boolean;
  consignes: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [resultat, enregistrer, enCours] = useActionState(reglerIAConversation, null);

  return (
    <div className="bo-ia-fil">
      <button
        type="button"
        className="bo-ia-etat"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
      >
        <span className={`pastille ${actif ? "on" : "off"}`} aria-hidden="true" />
        {actif ? "IA active sur cette conversation" : "IA désactivée ici"}
        <span className="chevron" aria-hidden="true">
          {ouvert ? "▴" : "▾"}
        </span>
      </button>

      {ouvert && (
        <form action={enregistrer} className="bo-ia-reglages">
          <input type="hidden" name="conversation_id" value={conversationId} />

          {resultat && (
            <p className={`bo-message ${resultat.ok ? "succes" : "erreur"}`}>{resultat.message}</p>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" name="actif" defaultChecked={actif} />
            Laisser l&apos;IA répondre sur cette conversation
          </label>

          <div className="bo-champ" style={{ marginTop: "0.8rem" }}>
            <label htmlFor="consignes-fil">Consignes pour ce fil</label>
            <textarea
              id="consignes-fil"
              name="consignes"
              rows={3}
              defaultValue={consignes}
              placeholder="Il est déjà venu deux fois, ne pas reparler de son divorce, rester prudente sur les projets de voyage…"
            />
            <p className="bo-aide" style={{ marginTop: "0.4rem" }}>
              Elles s&apos;ajoutent à vos consignes générales et l&apos;emportent sur elles.
              L&apos;IA reprend par ailleurs le ton de vos propres messages dans ce fil.
            </p>
          </div>

          <button type="submit" className="bo-btn fantome petit" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      )}
    </div>
  );
}
