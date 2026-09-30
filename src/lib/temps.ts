/**
 * Petites mises en forme partagées par le serveur et le navigateur.
 *
 * Ce fichier n'est ni `"use client"` ni `server-only`, et c'est tout son
 * intérêt. Ces deux fonctions vivaient dans le composant de liste, qui est un
 * composant client : les pages, rendues sur le serveur, les importaient de
 * là. Le résultat compile, passe le typage et l'analyse statique, puis
 * échoue à l'exécution — « Attempted to call ilYA() from the server but ilYA
 * is on the client ». Tout ce qu'exporte un module marqué `"use client"`
 * devient une référence vers le navigateur, y compris une fonction sans le
 * moindre rapport avec React.
 */

/** « à l'instant », « il y a 12 min », puis une date quand c'est loin. */
export function ilYA(date: string | null, maintenant: number = Date.now()) {
  if (!date) return "—";

  const minutes = Math.floor((maintenant - new Date(date).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;

  const jours = Math.floor(heures / 24);
  if (jours < 7) return `il y a ${jours} j`;

  return new Date(date).toLocaleDateString("fr-FR");
}

/**
 * Ce qu'on lit d'un message dans une liste.
 *
 * Une photo sans légende n'est pas un message vide : sans ceci, une
 * conversation entière pouvait sembler ne rien contenir.
 */
export function apercuDe(message: { body: string | null; attachment_path: string | null }) {
  const texte = (message.body ?? "").trim();
  if (texte) return texte;
  return message.attachment_path ? "Photo" : "";
}
