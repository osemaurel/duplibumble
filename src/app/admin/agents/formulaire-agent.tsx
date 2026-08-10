"use client";

import { useActionState } from "react";

import { creerAgent } from "../actions";

const CHAMPS = [
  { name: "code", label: "Code agent", placeholder: "AG-01", required: true },
  { name: "agency_name", label: "Nom de l'agence", placeholder: "Agence Horizon", required: true },
  { name: "email", label: "E-mail de connexion", placeholder: "horizon@exemple.com", required: true, type: "email" },
  { name: "contact_name", label: "Personne responsable", placeholder: "M. Kouassi Brou" },
  { name: "phone", label: "Téléphone", placeholder: "+225 07 00 00 00 00" },
  { name: "country", label: "Pays", placeholder: "Côte d'Ivoire" },
  { name: "city", label: "Ville", placeholder: "Abidjan" },
];

export default function FormulaireAgent() {
  const [resultat, action, enCours] = useActionState(creerAgent, null);

  return (
    <div className="rounded-2xl bg-white border border-[#E9E7E1] p-6">
      <h2 className="text-lg font-semibold tracking-normal text-[#2E2D29]">Créer un agent</h2>
      <p className="mt-1 text-sm text-[#6B6A64]">
        Le compte est ouvert immédiatement. Le mot de passe provisoire s&apos;affiche une seule
        fois, à vous de le transmettre à l&apos;agent.
      </p>

      {resultat && (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            resultat.ok
              ? "bg-[#E8F6EF] text-[#1B7A54] font-medium"
              : "bg-[#FDECEF] text-[#B8324B]"
          }`}
        >
          {resultat.message}
        </p>
      )}

      <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
        {CHAMPS.map((champ) => (
          <div key={champ.name}>
            <label
              htmlFor={champ.name}
              className="block text-sm font-medium text-[#2E2D29] mb-1.5"
            >
              {champ.label}
              {champ.required && <span className="text-[#E0314B]"> *</span>}
            </label>
            <input
              id={champ.name}
              name={champ.name}
              type={champ.type ?? "text"}
              required={champ.required}
              placeholder={champ.placeholder}
              className="w-full rounded-xl border border-[#E9E7E1] px-4 py-2.5 text-[#2E2D29] outline-none focus:border-[#E0314B]"
            />
          </div>
        ))}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={enCours}
            className="rounded-xl bg-[#E0314B] text-white font-semibold px-6 py-3 hover:bg-[#C42741] transition-colors disabled:opacity-60"
          >
            {enCours ? "Création en cours…" : "Créer l'agent"}
          </button>
        </div>
      </form>
    </div>
  );
}
