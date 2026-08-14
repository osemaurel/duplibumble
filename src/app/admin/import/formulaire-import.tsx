"use client";

import { useActionState } from "react";

import { importerDossier } from "../actions";

export default function FormulaireImport() {
  const [resultat, action, enCours] = useActionState(importerDossier, null);

  return (
    <form action={action} className="bo-carte bo-carte-p">
      <h2 className="bo-h2">Classeur de collecte</h2>
      <p className="bo-aide" style={{ fontSize: "0.9rem" }}>
        Déposez le fichier rempli par l&apos;agent. Les fiches arrivent en brouillon : rien
        n&apos;est publié par un import.
      </p>

      {resultat && (
        <p
          className={`bo-message ${resultat.ok ? "succes" : "erreur"}`}
          style={{ marginTop: "1.1rem" }}
        >
          {resultat.message}
        </p>
      )}

      <div className="bo-depot" style={{ marginTop: "1.3rem" }}>
        <label htmlFor="classeur" className="bo-label" style={{ cursor: "pointer" }}>
          Fichier Excel
        </label>
        <input
          id="classeur"
          name="classeur"
          type="file"
          required
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={enCours}
        />
      </div>

      <button type="submit" className="bo-btn" disabled={enCours} style={{ marginTop: "1.3rem" }}>
        {enCours ? "Import en cours…" : "Importer les fiches"}
      </button>
    </form>
  );
}
