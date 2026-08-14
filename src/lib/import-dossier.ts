import "server-only";

import ExcelJS from "exceljs";

import type { MaritalStatus } from "./supabase/types";

/**
 * Lecture d'un classeur de collecte.
 *
 * Les en-têtes sont reconnus après normalisation — accents retirés, casse
 * ignorée, parenthèses écartées. Un agent qui aura légèrement retouché les
 * intitulés, ou renvoyé le fichier depuis un autre tableur, reste donc
 * importable sans qu'on ait à lui faire tout ressaisir.
 */

function normaliser(texte: string) {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Intitulé normalisé → champ interne. */
const COLONNES: Record<string, string> = {
  "code femme": "code",
  "code agent": "code_agent",
  "nom legal complet": "legal_name",
  "date de naissance": "birth_date",
  nationalite: "nationality",
  "pays de residence": "residence_country",
  "ville de residence": "residence_city",
  "e mail": "email",
  telephone: "phone",
  "type de piece d identite": "id_document_type",
  "numero de piece": "id_document_number",
  "contrat de mandat signe": "mandate_signed",
  "date de signature": "mandate_date",
  "consentement publication photos": "photo_consent",
  "prenom affiche": "display_name",
  "ville affichee": "display_city",
  "pays affiche": "display_country",
  langues: "languages",
  situation: "marital_status",
  enfants: "children",
  profession: "profession",
  "niveau d etudes": "education",
  taille: "height_cm",
  poids: "weight_kg",
  yeux: "eyes",
  cheveux: "hair",
  religion: "religion",
  tabac: "smoking",
  alcool: "drinking",
  "centres d interet": "interests",
  "type de relation recherchee": "seeking",
  "age recherche min": "seeking_age_min",
  "age recherche max": "seeking_age_max",
  "prete a demenager": "willing_to_relocate",
  accroche: "headline",
  presentation: "bio",
  "ce que je recherche": "looking_for",
  "notes internes": "internal_notes",
};

const SITUATIONS: Record<string, MaritalStatus> = {
  celibataire: "celibataire",
  divorcee: "divorcee",
  veuve: "veuve",
  separee: "separee",
};

/**
 * Les cellules de remplissage — « N/A », « à compléter », tirets — valent
 * absence de valeur. Les importer telles quelles ferait apparaître « N/A »
 * sur une fiche publique.
 */
const VIDES = new Set(["", "-", "—", "n a", "na", "n a demonstration", "a completer", "aucun"]);

function texte(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined) return null;

  // ExcelJS renvoie un objet pour les cellules riches, les formules et les liens.
  let brut: string;
  if (typeof valeur === "object") {
    const o = valeur as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (Array.isArray(o.richText)) brut = o.richText.map((f) => f.text).join("");
    else if (typeof o.text === "string") brut = o.text;
    else if (o.result !== undefined) brut = String(o.result);
    else return null;
  } else {
    brut = String(valeur);
  }

  const propre = brut.trim();
  if (!propre) return null;
  if (VIDES.has(normaliser(propre))) return null;
  return propre;
}

function nombre(valeur: unknown): number | null {
  const t = texte(valeur);
  if (!t) return null;
  const n = Number(t.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function booleen(valeur: unknown): boolean {
  const t = texte(valeur);
  return t ? normaliser(t) === "oui" : false;
}

function date(valeur: unknown): string | null {
  if (valeur instanceof Date) return valeur.toISOString().slice(0, 10);
  const t = texte(valeur);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function liste(valeur: unknown): string[] {
  const t = texte(valeur);
  if (!t) return [];
  return t
    .split(/[;,]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export type FicheImportee = {
  code: string;
  codeAgent: string | null;
  publique: Record<string, unknown>;
  privee: Record<string, unknown>;
  manques: string[];
};

export type LectureDossier = {
  fiches: FicheImportee[];
  /** Codes d'agents cités dans le classeur. */
  agents: string[];
  /** Anomalies rencontrées, qui n'empêchent pas l'import. */
  avertissements: string[];
};

export async function lireDossier(donnees: ArrayBuffer): Promise<LectureDossier> {
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.load(donnees);

  const feuille =
    classeur.worksheets.find((f) => normaliser(f.name) === "femmes") ?? classeur.worksheets[0];

  if (!feuille) {
    throw new Error("Classeur vide : aucun onglet exploitable.");
  }

  // La ligne d'en-tête est celle qui contient « code femme ». Elle n'est pas
  // toujours la première : le modèle porte une ligne de regroupement au-dessus.
  let ligneEntetes = 0;
  const colonnes = new Map<number, string>();

  for (let r = 1; r <= Math.min(feuille.rowCount, 10); r += 1) {
    const trouvees = new Map<number, string>();
    feuille.getRow(r).eachCell({ includeEmpty: false }, (cellule, index) => {
      const intitule = texte(cellule.value);
      if (!intitule) return;
      const champ = COLONNES[normaliser(intitule)];
      if (champ) trouvees.set(index, champ);
    });
    if ([...trouvees.values()].includes("code")) {
      ligneEntetes = r;
      trouvees.forEach((champ, index) => colonnes.set(index, champ));
      break;
    }
  }

  if (!ligneEntetes) {
    throw new Error(
      "Colonne « Code femme » introuvable. Le classeur ne suit pas le modèle de collecte.",
    );
  }

  const fiches: FicheImportee[] = [];
  const agents = new Set<string>();
  const avertissements: string[] = [];
  const codesVus = new Set<string>();

  for (let r = ligneEntetes + 1; r <= feuille.rowCount; r += 1) {
    const ligne = feuille.getRow(r);
    const brut: Record<string, unknown> = {};
    colonnes.forEach((champ, index) => {
      brut[champ] = ligne.getCell(index).value;
    });

    const code = texte(brut.code);
    if (!code) continue;

    if (codesVus.has(code)) {
      avertissements.push(`${code} : code en double, la ligne ${r} est ignorée.`);
      continue;
    }
    codesVus.add(code);

    const codeAgent = texte(brut.code_agent);
    if (codeAgent) agents.add(codeAgent);

    const prenom = texte(brut.display_name);
    const nomLegal = texte(brut.legal_name);
    const naissance = date(brut.birth_date);

    const situationBrute = texte(brut.marital_status);
    const situation = situationBrute ? SITUATIONS[normaliser(situationBrute)] ?? null : null;
    if (situationBrute && !situation) {
      avertissements.push(`${code} : situation « ${situationBrute} » non reconnue, laissée vide.`);
    }

    const langues = liste(brut.languages);

    const manques = [
      !prenom && "prénom affiché",
      !nomLegal && "nom légal",
      !naissance && "date de naissance",
      !texte(brut.headline) && "accroche",
      !texte(brut.bio) && "présentation",
    ].filter(Boolean) as string[];

    fiches.push({
      code,
      codeAgent,
      publique: {
        code,
        display_name: prenom ?? code,
        display_city: texte(brut.display_city),
        display_country: texte(brut.display_country),
        languages: langues,
        marital_status: situation,
        children: texte(brut.children),
        profession: texte(brut.profession),
        education: texte(brut.education),
        height_cm: nombre(brut.height_cm),
        weight_kg: nombre(brut.weight_kg),
        eyes: texte(brut.eyes),
        hair: texte(brut.hair),
        religion: texte(brut.religion),
        smoking: texte(brut.smoking),
        drinking: texte(brut.drinking),
        interests: liste(brut.interests),
        seeking: texte(brut.seeking),
        seeking_age_min: nombre(brut.seeking_age_min),
        seeking_age_max: nombre(brut.seeking_age_max),
        willing_to_relocate: texte(brut.willing_to_relocate),
        headline: texte(brut.headline),
        bio: texte(brut.bio),
        looking_for: texte(brut.looking_for),
        status: "draft",
      },
      privee: {
        legal_name: nomLegal,
        birth_date: naissance,
        nationality: texte(brut.nationality),
        residence_country: texte(brut.residence_country),
        residence_city: texte(brut.residence_city),
        email: texte(brut.email),
        phone: texte(brut.phone),
        id_document_type: texte(brut.id_document_type),
        id_document_number: texte(brut.id_document_number),
        mandate_signed: booleen(brut.mandate_signed),
        mandate_date: date(brut.mandate_date),
        photo_consent: booleen(brut.photo_consent),
        internal_notes: texte(brut.internal_notes),
      },
      manques,
    });
  }

  return { fiches, agents: [...agents], avertissements };
}
