"use client";

import { useActionState } from "react";

import { creerReponseType } from "../actions";

/** Ajoute une réponse type. Se vide toute seule après un enregistrement réussi. */
export default function FormulaireReponseType() {
  const [resultat, action, enCours] = useActionState(creerReponseType, null);

  return (
    <form action={action} className="bo-carte bo-carte-p">
      <h2 className="bo-h2">Nouvelle réponse type</h2>
      <p className="bo-aide" style={{ marginTop: "0.4rem" }}>
        Un titre pour la retrouver, le texte qui part tel quel dans la conversation.
      </p>

      {resultat && (
        <p
          className={`bo-message ${resultat.ok ? "succes" : "erreur"}`}
          style={{ marginTop: "1rem" }}
        >
          {resultat.message}
        </p>
      )}

      <div className="bo-champ" style={{ marginTop: "1.1rem" }}>
        <label htmlFor="libelle">Titre</label>
        <input
          id="libelle"
          name="libelle"
          type="text"
          required
          maxLength={80}
          placeholder="Accueil, Relance, Indisponible cette semaine…"
        />
      </div>

      <div className="bo-champ" style={{ marginTop: "0.9rem" }}>
        <label htmlFor="corps">Texte</label>
        <textarea id="corps" name="corps" rows={4} required maxLength={2000} />
      </div>

      <button type="submit" className="bo-btn" disabled={enCours} style={{ marginTop: "1.1rem" }}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
