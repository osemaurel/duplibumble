"use client";

import { useActionState } from "react";

import type { Lady } from "@/lib/supabase/types";

import { enregistrerFiche } from "../../actions";

const SITUATIONS = [
  { valeur: "", libelle: "—" },
  { valeur: "celibataire", libelle: "Célibataire" },
  { valeur: "divorcee", libelle: "Divorcée" },
  { valeur: "veuve", libelle: "Veuve" },
  { valeur: "separee", libelle: "Séparée" },
];

function Champ({
  nom,
  libelle,
  valeur,
  aide,
  type = "text",
  obligatoire = false,
}: {
  nom: string;
  libelle: string;
  valeur: string | number | null;
  aide?: string;
  type?: string;
  obligatoire?: boolean;
}) {
  return (
    <div>
      <label htmlFor={nom} className="mb-1.5 block text-sm font-medium text-[#2E2D29]">
        {libelle}
        {obligatoire && <span className="text-[#E0314B]"> *</span>}
      </label>
      <input
        id={nom}
        name={nom}
        type={type}
        required={obligatoire}
        defaultValue={valeur ?? ""}
        className="w-full rounded-xl border border-[#E9E7E1] px-4 py-2.5 text-[#2E2D29] outline-none focus:border-[#E0314B]"
      />
      {aide && <p className="mt-1 text-xs text-[#9A968D]">{aide}</p>}
    </div>
  );
}

function Zone({
  nom,
  libelle,
  valeur,
  aide,
  lignes = 4,
}: {
  nom: string;
  libelle: string;
  valeur: string | null;
  aide?: string;
  lignes?: number;
}) {
  return (
    <div className="sm:col-span-2">
      <label htmlFor={nom} className="mb-1.5 block text-sm font-medium text-[#2E2D29]">
        {libelle}
      </label>
      <textarea
        id={nom}
        name={nom}
        rows={lignes}
        defaultValue={valeur ?? ""}
        className="w-full resize-y rounded-xl border border-[#E9E7E1] px-4 py-2.5 text-[#2E2D29] outline-none focus:border-[#E0314B]"
      />
      {aide && <p className="mt-1 text-xs text-[#9A968D]">{aide}</p>}
    </div>
  );
}

export default function FormulaireFiche({ femme }: { femme: Lady }) {
  const [resultat, action, enCours] = useActionState(enregistrerFiche, null);

  return (
    <form action={action} className="rounded-2xl border border-[#E9E7E1] bg-white p-6">
      <input type="hidden" name="lady_id" value={femme.id} />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-semibold tracking-normal text-[#2E2D29]">Fiche publique</h2>
        <p className="text-xs text-[#9A968D]">
          L&apos;âge se calcule tout seul et n&apos;est pas modifiable ici.
        </p>
      </div>

      {resultat && (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            resultat.ok
              ? "bg-[#E8F6EF] font-medium text-[#1B7A54]"
              : "bg-[#FDECEF] text-[#B8324B]"
          }`}
        >
          {resultat.message}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Champ nom="display_name" libelle="Prénom affiché" valeur={femme.display_name} obligatoire />
        <div className="grid grid-cols-2 gap-4">
          <Champ nom="display_city" libelle="Ville" valeur={femme.display_city} />
          <Champ nom="display_country" libelle="Pays" valeur={femme.display_country} />
        </div>

        <div>
          <label
            htmlFor="marital_status"
            className="mb-1.5 block text-sm font-medium text-[#2E2D29]"
          >
            Situation
          </label>
          <select
            id="marital_status"
            name="marital_status"
            defaultValue={femme.marital_status ?? ""}
            className="w-full rounded-xl border border-[#E9E7E1] px-4 py-2.5 text-[#2E2D29] outline-none focus:border-[#E0314B]"
          >
            {SITUATIONS.map((s) => (
              <option key={s.valeur} value={s.valeur}>
                {s.libelle}
              </option>
            ))}
          </select>
        </div>
        <Champ nom="children" libelle="Enfants" valeur={femme.children} aide="Non, ou le nombre." />

        <Champ nom="profession" libelle="Profession" valeur={femme.profession} />
        <Champ nom="education" libelle="Niveau d'études" valeur={femme.education} />

        <div className="grid grid-cols-2 gap-4">
          <Champ nom="height_cm" libelle="Taille (cm)" valeur={femme.height_cm} type="number" />
          <Champ nom="weight_kg" libelle="Poids (kg)" valeur={femme.weight_kg} type="number" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Champ nom="eyes" libelle="Yeux" valeur={femme.eyes} />
          <Champ nom="hair" libelle="Cheveux" valeur={femme.hair} />
        </div>

        <Champ nom="religion" libelle="Religion" valeur={femme.religion} />
        <div className="grid grid-cols-2 gap-4">
          <Champ nom="smoking" libelle="Tabac" valeur={femme.smoking} />
          <Champ nom="drinking" libelle="Alcool" valeur={femme.drinking} />
        </div>

        <Champ
          nom="seeking"
          libelle="Type de relation recherchée"
          valeur={femme.seeking}
          aide="Relation sérieuse, mariage, amitié, correspondance."
        />
        <div className="grid grid-cols-3 gap-4">
          <Champ
            nom="seeking_age_min"
            libelle="Âge min."
            valeur={femme.seeking_age_min}
            type="number"
          />
          <Champ
            nom="seeking_age_max"
            libelle="Âge max."
            valeur={femme.seeking_age_max}
            type="number"
          />
          <Champ
            nom="willing_to_relocate"
            libelle="Déménager"
            valeur={femme.willing_to_relocate}
          />
        </div>

        <Zone
          nom="interests"
          libelle="Centres d'intérêt"
          valeur={(femme.interests ?? []).join(" ; ")}
          aide="Cinq au maximum, séparés par un point-virgule."
          lignes={2}
        />

        <Zone
          nom="headline"
          libelle="Accroche"
          valeur={femme.headline}
          aide="40 à 120 caractères. C'est la phrase visible sous le prénom dans la galerie."
          lignes={2}
        />
        <Zone
          nom="bio"
          libelle="Présentation"
          valeur={femme.bio}
          aide="600 à 1200 caractères, à la première personne."
          lignes={7}
        />
        <Zone
          nom="looking_for"
          libelle="Ce qu'elle recherche"
          valeur={femme.looking_for}
          aide="200 à 400 caractères."
          lignes={4}
        />
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-xl bg-[#2E2D29] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#4C4B45] disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        <p className="text-xs text-[#9A968D]">
          Enregistrer ne publie rien : la fiche part à la validation depuis le bouton en haut.
        </p>
      </div>
    </form>
  );
}
