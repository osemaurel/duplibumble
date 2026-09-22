import "server-only";

import type { Lady } from "./supabase/types";

/**
 * Appel au modèle de langage de l'agent.
 *
 * L'appel part avec la clé de l'agent, jamais avec une clé de Palab : c'est
 * son abonnement, sa consommation, sa responsabilité. La plateforme ne fait
 * que composer le contexte et transmettre.
 *
 * Pas de SDK : deux requêtes HTTP suffisent, et une dépendance de plus se
 * paierait en surface d'attaque et en mises à jour pour un gain nul.
 */

const RACINE = "https://api.openai.com/v1";
/** Au-delà, mieux vaut rendre la main à l'agent que faire attendre un membre. */
const DELAI_MS = 20000;

export type ResultatAssistant =
  | { ok: true; texte: string }
  | { ok: false; message: string };

/** Vérifie qu'une clé répond, sans rien consommer de significatif. */
export async function verifierCle(cle: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const reponse = await fetch(`${RACINE}/models`, {
      headers: { Authorization: `Bearer ${cle}` },
      signal: AbortSignal.timeout(DELAI_MS),
      cache: "no-store",
    });

    if (reponse.status === 401) {
      return { ok: false, message: "Clé refusée par OpenAI. Vérifiez qu'elle est active." };
    }
    if (!reponse.ok) {
      return { ok: false, message: `OpenAI a répondu ${reponse.status}.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "OpenAI est injoignable pour le moment." };
  }
}

type MessageFil = { sender: "member" | "lady"; body: string };

/**
 * Présente la fiche au modèle.
 *
 * Seules les colonnes publiques y entrent. Le dossier interne — identité
 * légale, pièce, coordonnées — vit dans `lady_private` et n'a rien à faire
 * chez un tiers : ce qui part chez OpenAI ne doit pas dépasser ce qu'un
 * visiteur du site pourrait lire.
 */
function fiche(femme: Lady): string {
  const lignes: [string, unknown][] = [
    ["Prénom", femme.display_name],
    ["Âge", femme.age],
    ["Situation", femme.marital_status],
    ["Enfants", femme.children],
    ["Profession", femme.profession],
    ["Études", femme.education],
    ["Centres d'intérêt", (femme.interests ?? []).join(", ")],
    ["Langues", Array.isArray(femme.languages) ? femme.languages.join(", ") : null],
    ["Accroche", femme.headline],
    ["Présentation", femme.bio],
    ["Ce qu'elle recherche", femme.looking_for],
  ];

  return lignes
    .filter(([, valeur]) => valeur !== null && valeur !== undefined && valeur !== "")
    .map(([libelle, valeur]) => `${libelle} : ${valeur}`)
    .join("\n");
}

/**
 * Consignes de la plateforme, ajoutées à celles de l'agent.
 *
 * Elles ne sont pas des préférences de style : ce sont les règles dont la
 * violation coûte cher. Un modèle laissé libre promet des rencontres, donne un
 * numéro de téléphone pour « gagner du temps », ou compatit à une demande
 * d'argent — trois façons de sortir la conversation de la plateforme et de
 * fabriquer exactement le litige que la vérification des fiches cherche à
 * éviter.
 */
const REGLES = `Tu rédiges un brouillon de réponse en te mettant à la place de la femme décrite ci-dessous, sur une plateforme de rencontre internationale.

Règles impératives :
- Ne donne jamais de coordonnées : ni téléphone, ni adresse électronique, ni réseau social, ni application de messagerie. Si on t'en demande, réponds que tu préfères continuer ici pour l'instant.
- Ne demande jamais d'argent, n'évoque aucune difficulté financière, n'accepte aucune proposition d'aide matérielle.
- Ne fixe aucun rendez-vous et ne promets aucune visite ni aucun voyage.
- N'invente rien qui ne figure pas dans la fiche : ni métier, ni famille, ni passé.
- Écris dans la langue du dernier message reçu.
- Deux à quatre phrases, un ton chaleureux et simple, et une question à la fin pour relancer.

Tu produis uniquement le texte du message, sans guillemets ni commentaire.`;

export async function proposerReponse(options: {
  cle: string;
  modele: string;
  consignes: string | null;
  femme: Lady;
  fil: MessageFil[];
  prenomMembre: string;
}): Promise<ResultatAssistant> {
  const { cle, modele, consignes, femme, fil, prenomMembre } = options;

  const contexte = [
    REGLES,
    consignes?.trim() ? `Consignes de l'agence :\n${consignes.trim()}` : null,
    `Fiche de la femme :\n${fiche(femme)}`,
    `Le membre s'appelle ${prenomMembre}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Les vingt derniers échanges suffisent à tenir le fil, et bornent ce qui
  // part chez un tiers comme ce que l'agent paiera.
  const echanges = fil.slice(-20).map((m) => ({
    role: m.sender === "lady" ? ("assistant" as const) : ("user" as const),
    content: m.body,
  }));

  try {
    const reponse = await fetch(`${RACINE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cle}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modele,
        messages: [{ role: "system", content: contexte }, ...echanges],
        temperature: 0.8,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(DELAI_MS),
      cache: "no-store",
    });

    if (reponse.status === 401) {
      return { ok: false, message: "Clé refusée par OpenAI. Vérifiez-la dans votre assistant." };
    }
    if (reponse.status === 429) {
      return { ok: false, message: "OpenAI limite vos appels ou votre crédit est épuisé." };
    }
    if (!reponse.ok) {
      return { ok: false, message: `OpenAI a répondu ${reponse.status}.` };
    }

    const charge = (await reponse.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const texte = charge.choices?.[0]?.message?.content?.trim();

    if (!texte) return { ok: false, message: "Le modèle n'a rien renvoyé." };

    return { ok: true, texte };
  } catch {
    return { ok: false, message: "OpenAI est injoignable ou a mis trop de temps à répondre." };
  }
}
