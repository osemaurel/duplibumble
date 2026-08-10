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
    <div className="bo-champ">
      <label htmlFor={nom}>
        {libelle}
        {obligatoire && <span className="oblig"> *</span>}
      </label>
      <input
        id={nom}
        name={nom}
        type={type}
        required={obligatoire}
        defaultValue={valeur ?? ""}
      />
      {aide && <p className="bo-aide">{aide}</p>}
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
    <div className="bo-champ" style={{ gridColumn: "1 / -1" }}>
      <label htmlFor={nom}>{libelle}</label>
      <textarea id={nom} name={nom} rows={lignes} defaultValue={valeur ?? ""} />
      {aide && <p className="bo-aide">{aide}</p>}
    </div>
  );
}

export default function FormulaireFiche({ femme }: { femme: Lady }) {
  const [resultat, action, enCours] = useActionState(enregistrerFiche, null);

  return (
    <form action={action} className="bo-carte bo-carte-p">
      <input type="hidden" name="lady_id" value={femme.id} />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <h2 className="bo-h2">Fiche publique</h2>
        <p className="bo-aide">L&apos;âge se calcule tout seul et n&apos;est pas modifiable ici.</p>
      </div>

      {resultat && (
        <p
          className={`bo-message ${resultat.ok ? "succes" : "erreur"}`}
          style={{ marginTop: "1rem" }}
        >
          {resultat.message}
        </p>
      )}

      <div className="bo-grille bo-grille-2" style={{ marginTop: "1.4rem" }}>
        <Champ
          nom="display_name"
          libelle="Prénom affiché"
          valeur={femme.display_name}
          obligatoire
        />
        <div className="bo-grille bo-grille-2">
          <Champ nom="display_city" libelle="Ville" valeur={femme.display_city} />
          <Champ nom="display_country" libelle="Pays" valeur={femme.display_country} />
        </div>

        <div className="bo-champ">
          <label htmlFor="marital_status">Situation</label>
          <select
            id="marital_status"
            name="marital_status"
            defaultValue={femme.marital_status ?? ""}
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

        <div className="bo-grille bo-grille-2">
          <Champ nom="height_cm" libelle="Taille (cm)" valeur={femme.height_cm} type="number" />
          <Champ nom="weight_kg" libelle="Poids (kg)" valeur={femme.weight_kg} type="number" />
        </div>
        <div className="bo-grille bo-grille-2">
          <Champ nom="eyes" libelle="Yeux" valeur={femme.eyes} />
          <Champ nom="hair" libelle="Cheveux" valeur={femme.hair} />
        </div>

        <Champ nom="religion" libelle="Religion" valeur={femme.religion} />
        <div className="bo-grille bo-grille-2">
          <Champ nom="smoking" libelle="Tabac" valeur={femme.smoking} />
          <Champ nom="drinking" libelle="Alcool" valeur={femme.drinking} />
        </div>

        <Champ
          nom="seeking"
          libelle="Type de relation recherchée"
          valeur={femme.seeking}
          aide="Relation sérieuse, mariage, amitié, correspondance."
        />
        <div className="bo-grille bo-grille-3">
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

      <div
        style={{ marginTop: "1.6rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
      >
        <button type="submit" className="bo-btn sombre" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        <p className="bo-aide">
          Enregistrer ne publie rien : la fiche part à la validation depuis le bouton en haut.
        </p>
      </div>
    </form>
  );
}
