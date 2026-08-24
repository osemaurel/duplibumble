"use client";

import { useActionState, useState } from "react";

import { publierToutesLesFiches } from "../actions";

export type Attente = {
  brouillon: number;
  aValider: number;
  refusees: number;
  suspendues: number;
};

/**
 * Publication en lot des fiches non publiées.
 *
 * Le bouton demande confirmation avant d'agir, et détaille ce qu'il va
 * emporter. La raison est dans le détail : « non publiée » recouvre des
 * brouillons, mais aussi des fiches refusées ou suspendues — des décisions
 * prises exprès. Les republier peut être exactement ce qu'on veut après un
 * import, ou une bévue ; seul l'administrateur peut trancher, encore faut-il
 * qu'il voie ce qu'il signe.
 */
export default function PublierTout({ attente }: { attente: Attente }) {
  const [resultat, action, enCours] = useActionState(publierToutesLesFiches, null);
  const [confirme, setConfirme] = useState(false);

  const total = attente.brouillon + attente.aValider + attente.refusees + attente.suspendues;
  const sensibles = attente.refusees + attente.suspendues;

  if (resultat) {
    return (
      <p className={`bo-message ${resultat.ok ? "succes" : "erreur"}`}>{resultat.message}</p>
    );
  }

  if (!total) return null;

  const detail = [
    attente.brouillon && `${attente.brouillon} en brouillon`,
    attente.aValider && `${attente.aValider} à valider`,
    attente.refusees && `${attente.refusees} refusée${attente.refusees > 1 ? "s" : ""}`,
    attente.suspendues && `${attente.suspendues} suspendue${attente.suspendues > 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(", ");

  if (!confirme) {
    return (
      <button type="button" className="bo-btn" onClick={() => setConfirme(true)}>
        Publier les {total} fiches non publiées
      </button>
    );
  }

  return (
    <form action={action} className="bo-carte bo-carte-p" style={{ maxWidth: "32rem" }}>
      <p className="bo-h2">Publier {total} fiches ?</p>
      <p className="bo-aide" style={{ marginTop: "0.5rem" }}>
        {detail}. Elles deviennent visibles du public immédiatement.
      </p>

      {sensibles > 0 && (
        <p className="bo-message avertissement" style={{ marginTop: "0.9rem" }}>
          Dont {sensibles} fiche{sensibles > 1 ? "s" : ""} refusée{sensibles > 1 ? "s" : ""} ou
          suspendue{sensibles > 1 ? "s" : ""} : ce sont des décisions de modération que cette
          action annulera.
        </p>
      )}

      <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.1rem" }}>
        <button type="submit" className="bo-btn" disabled={enCours}>
          {enCours ? "Publication…" : "Confirmer la publication"}
        </button>
        <button
          type="button"
          className="bo-btn fantome"
          onClick={() => setConfirme(false)}
          disabled={enCours}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
