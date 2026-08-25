/**
 * Ordre d'affichage des fiches publiées, sur toute la partie publique.
 *
 * La règle : les dernières arrivées passent devant, les anciennes descendent.
 * Une fiche fraîchement publiée doit être vue — c'est elle qui n'a encore reçu
 * aucun message, et c'est le lot que l'agent vient de livrer.
 *
 * Deux colonnes, dans cet ordre.
 *
 * `published_at` d'abord : c'est la date d'entrée en vitrine, pas celle de
 * création. Une fiche saisie il y a trois semaines et publiée ce matin est une
 * nouveauté pour le visiteur, qui ne l'avait jamais vue.
 *
 * `created_at` ensuite, pour départager. La publication en lot horodate des
 * dizaines de fiches à la même seconde : sans ce second critère, leur ordre
 * serait laissé au hasard du moteur, et changerait d'un affichage à l'autre.
 *
 * L'ancien tri se faisait sur `last_seen_at`, qui n'est alimenté nulle part :
 * la colonne étant vide, il n'ordonnait rien.
 */

/** Tout constructeur de requête dont `order` renvoie le constructeur lui-même. */
type Ordonnable<T> = {
  order(colonne: string, options: { ascending: boolean; nullsFirst: boolean }): T;
};

export function parNouveaute<T extends Ordonnable<T>>(requete: T): T {
  return requete
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false });
}
