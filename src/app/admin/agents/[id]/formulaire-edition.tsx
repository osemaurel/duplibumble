"use client";

import { useActionState } from "react";

import type { Agent } from "@/lib/supabase/types";

import { enregistrerAgent } from "../../actions";

export default function FormulaireEditionAgent({ agent }: { agent: Agent }) {
  const [resultat, action, enCours] = useActionState(enregistrerAgent, null);

  const champs = [
    { nom: "agency_name", libelle: "Nom de l'agence", valeur: agent.agency_name, obligatoire: true },
    { nom: "contact_name", libelle: "Personne responsable", valeur: agent.contact_name },
    { nom: "phone", libelle: "Téléphone", valeur: agent.phone },
    { nom: "country", libelle: "Pays", valeur: agent.country },
    { nom: "city", libelle: "Ville", valeur: agent.city },
    { nom: "contract_date", libelle: "Date du contrat cadre", valeur: agent.contract_date, type: "date" },
  ];

  return (
    <form action={action} className="bo-carte bo-carte-p">
      <input type="hidden" name="agent_id" value={agent.id} />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <h2 className="bo-h2">Coordonnées</h2>
        <p className="bo-aide">
          Le code {agent.code} et l&apos;e-mail de connexion ne se modifient pas ici : ils
          identifient l&apos;agent partout ailleurs.
        </p>
      </div>

      {resultat && (
        <p
          className={`bo-message ${resultat.ok ? "succes" : "erreur"}`}
          style={{ marginTop: "1rem" }}
        >
          {resultat.message}
        </p>
      )}

      <div className="bo-grille bo-grille-2" style={{ marginTop: "1.3rem" }}>
        {champs.map((champ) => (
          <div className="bo-champ" key={champ.nom}>
            <label htmlFor={champ.nom}>
              {champ.libelle}
              {champ.obligatoire && <span className="oblig"> *</span>}
            </label>
            <input
              id={champ.nom}
              name={champ.nom}
              type={champ.type ?? "text"}
              required={champ.obligatoire}
              defaultValue={champ.valeur ?? ""}
            />
          </div>
        ))}

        <label
          htmlFor="contract_signed"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontSize: "0.9rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <input
            id="contract_signed"
            name="contract_signed"
            type="checkbox"
            defaultChecked={agent.contract_signed}
            style={{ width: 18, height: 18, accentColor: "var(--brand)" }}
          />
          Contrat cadre signé
        </label>

        <div className="bo-champ" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="notes">Notes internes</label>
          <textarea id="notes" name="notes" rows={3} defaultValue={agent.notes ?? ""} />
        </div>
      </div>

      <button type="submit" className="bo-btn sombre" disabled={enCours} style={{ marginTop: "1.4rem" }}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
