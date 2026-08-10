"use client";

import { useActionState } from "react";

import type { Lady, LadyPrivate } from "@/lib/supabase/types";

import { enregistrerFicheAdmin } from "../../actions";

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
      <input id={nom} name={nom} type={type} required={obligatoire} defaultValue={valeur ?? ""} />
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

function Case({
  nom,
  libelle,
  coche,
}: {
  nom: string;
  libelle: string;
  coche: boolean;
}) {
  return (
    <label
      htmlFor={nom}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        fontSize: "0.9rem",
        fontWeight: 500,
        color: "var(--ink)",
        cursor: "pointer",
      }}
    >
      <input
        id={nom}
        name={nom}
        type="checkbox"
        defaultChecked={coche}
        style={{ width: 18, height: 18, accentColor: "var(--brand)" }}
      />
      {libelle}
    </label>
  );
}

export default function FormulaireEdition({
  femme,
  prive,
}: {
  femme: Lady;
  prive: LadyPrivate | null;
}) {
  const [resultat, action, enCours] = useActionState(enregistrerFicheAdmin, null);

  return (
    <form action={action} style={{ display: "grid", gap: "1.5rem" }}>
      <input type="hidden" name="lady_id" value={femme.id} />

      {resultat && (
        <p className={`bo-message ${resultat.ok ? "succes" : "erreur"}`}>{resultat.message}</p>
      )}

      <section className="bo-carte bo-carte-p">
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
          <p className="bo-aide">
            L&apos;âge se calcule depuis la date de naissance et n&apos;est pas saisi ici.
          </p>
        </div>

        <div className="bo-grille bo-grille-2" style={{ marginTop: "1.3rem" }}>
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
            aide="40 à 120 caractères. Visible sous le prénom dans la galerie."
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
      </section>

      <section className="bo-prive">
        <h2 className="bo-h2">
          Dossier interne
          <span className="etiquette">jamais publié</span>
        </h2>
        <p className="bo-aide" style={{ fontSize: "0.9rem" }}>
          Identité, pièces et mandat. Ces champs ne sortent jamais de cet écran et de celui de
          l&apos;agent mandaté.
        </p>

        <div className="bo-grille bo-grille-2" style={{ marginTop: "1.3rem" }}>
          <Champ
            nom="legal_name"
            libelle="Nom légal complet"
            valeur={prive?.legal_name ?? null}
            aide="Obligatoire pour enregistrer le dossier interne."
          />
          <Champ
            nom="birth_date"
            libelle="Date de naissance"
            valeur={prive?.birth_date ?? null}
            type="date"
            aide="C'est elle qui détermine l'âge affiché."
          />

          <Champ nom="nationality" libelle="Nationalité" valeur={prive?.nationality ?? null} />
          <div className="bo-grille bo-grille-2">
            <Champ
              nom="residence_city"
              libelle="Ville de résidence"
              valeur={prive?.residence_city ?? null}
            />
            <Champ
              nom="residence_country"
              libelle="Pays de résidence"
              valeur={prive?.residence_country ?? null}
            />
          </div>

          <Champ nom="email" libelle="E-mail" valeur={prive?.email ?? null} type="email" />
          <Champ nom="phone" libelle="Téléphone" valeur={prive?.phone ?? null} />

          <Champ
            nom="id_document_type"
            libelle="Type de pièce d'identité"
            valeur={prive?.id_document_type ?? null}
            aide="Passeport, carte nationale d'identité, permis."
          />
          <Champ
            nom="id_document_number"
            libelle="Numéro de pièce"
            valeur={prive?.id_document_number ?? null}
          />

          <Champ
            nom="mandate_date"
            libelle="Date du mandat"
            valeur={prive?.mandate_date ?? null}
            type="date"
          />
          <div style={{ display: "grid", gap: "0.8rem", alignContent: "center" }}>
            <Case
              nom="mandate_signed"
              libelle="Mandat de représentation signé"
              coche={Boolean(prive?.mandate_signed)}
            />
            <Case
              nom="photo_consent"
              libelle="Consentement à la publication des photos"
              coche={Boolean(prive?.photo_consent)}
            />
          </div>

          <Zone
            nom="internal_notes"
            libelle="Notes internes"
            valeur={prive?.internal_notes ?? null}
            lignes={3}
          />
        </div>
      </section>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button type="submit" className="bo-btn sombre" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer la fiche"}
        </button>
        <p className="bo-aide">
          Enregistrer ne publie pas : la publication se fait avec les boutons en haut de page.
        </p>
      </div>
    </form>
  );
}
