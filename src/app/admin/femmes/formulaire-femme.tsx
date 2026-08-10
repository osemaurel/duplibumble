"use client";

import { useActionState } from "react";

import { creerFemme } from "../actions";

type Option = { id: string; code: string; agency_name: string };

export default function FormulaireFemme({ agents }: { agents: Option[] }) {
  const [resultat, action, enCours] = useActionState(creerFemme, null);

  return (
    <details className="bo-carte bo-carte-p">
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <span className="bo-h2">Créer une fiche</span>
        <span className="bo-btn petit">Ouvrir le formulaire</span>
      </summary>

      <p className="bo-aide" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
        Créez le minimum, puis laissez l&apos;agent compléter. La fiche part en brouillon :
        personne ne la voit tant que vous ne l&apos;avez pas publiée.
      </p>

      {resultat && (
        <p
          className={`bo-message ${resultat.ok ? "succes" : "erreur"}`}
          style={{ marginTop: "1rem" }}
        >
          {resultat.message}
        </p>
      )}

      <form action={action} className="bo-grille bo-grille-2" style={{ marginTop: "1.3rem" }}>
        <div className="bo-champ">
          <label htmlFor="code">
            Code femme <span className="oblig">*</span>
          </label>
          <input id="code" name="code" required placeholder="PAL-0001" />
        </div>

        <div className="bo-champ">
          <label htmlFor="agent_id">Agent mandaté</label>
          <select id="agent_id" name="agent_id" defaultValue="">
            <option value="">À attribuer plus tard</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.code} — {agent.agency_name}
              </option>
            ))}
          </select>
        </div>

        <div className="bo-champ">
          <label htmlFor="display_name">
            Prénom affiché <span className="oblig">*</span>
          </label>
          <input id="display_name" name="display_name" required placeholder="Amina" />
        </div>

        <div className="bo-champ">
          <label htmlFor="legal_name">
            Nom légal complet <span className="oblig">*</span>
          </label>
          <input id="legal_name" name="legal_name" required placeholder="Amina Diallo Traoré" />
          <p className="bo-aide">Interne. Jamais affiché publiquement.</p>
        </div>

        <div className="bo-champ">
          <label htmlFor="birth_date">
            Date de naissance <span className="oblig">*</span>
          </label>
          <input id="birth_date" name="birth_date" type="date" required />
          <p className="bo-aide">Interne. Seul l&apos;âge, recalculé, sera public.</p>
        </div>

        <div className="bo-grille bo-grille-2">
          <div className="bo-champ">
            <label htmlFor="display_city">Ville affichée</label>
            <input id="display_city" name="display_city" placeholder="Abidjan" />
          </div>
          <div className="bo-champ">
            <label htmlFor="display_country">Pays affiché</label>
            <input id="display_country" name="display_country" placeholder="Côte d'Ivoire" />
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <button type="submit" className="bo-btn" disabled={enCours}>
            {enCours ? "Création…" : "Créer la fiche"}
          </button>
        </div>
      </form>
    </details>
  );
}
