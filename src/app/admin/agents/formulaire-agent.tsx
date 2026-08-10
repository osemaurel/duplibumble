"use client";

import { useActionState } from "react";

import { creerAgent } from "../actions";

const CHAMPS = [
  { name: "code", label: "Code agent", placeholder: "AG-01", required: true },
  { name: "agency_name", label: "Nom de l'agence", placeholder: "Agence Horizon", required: true },
  {
    name: "email",
    label: "E-mail de connexion",
    placeholder: "horizon@exemple.com",
    required: true,
    type: "email",
  },
  { name: "contact_name", label: "Personne responsable", placeholder: "M. Kouassi Brou" },
  { name: "phone", label: "Téléphone", placeholder: "+225 07 00 00 00 00" },
  { name: "country", label: "Pays", placeholder: "Côte d'Ivoire" },
  { name: "city", label: "Ville", placeholder: "Abidjan" },
];

export default function FormulaireAgent() {
  const [resultat, action, enCours] = useActionState(creerAgent, null);

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
        <span className="bo-h2">Créer un agent</span>
        <span className="bo-btn petit">Ouvrir le formulaire</span>
      </summary>

      <p className="bo-aide" style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
        Le compte est ouvert immédiatement. Le mot de passe provisoire s&apos;affiche une seule
        fois — à vous de le transmettre à l&apos;agent.
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
        {CHAMPS.map((champ) => (
          <div className="bo-champ" key={champ.name}>
            <label htmlFor={champ.name}>
              {champ.label}
              {champ.required && <span className="oblig"> *</span>}
            </label>
            <input
              id={champ.name}
              name={champ.name}
              type={champ.type ?? "text"}
              required={champ.required}
              placeholder={champ.placeholder}
            />
          </div>
        ))}

        <div style={{ gridColumn: "1 / -1" }}>
          <button type="submit" className="bo-btn" disabled={enCours}>
            {enCours ? "Création en cours…" : "Créer l'agent"}
          </button>
        </div>
      </form>
    </details>
  );
}
