import "server-only";

/**
 * Filtrage des adresses d'où viennent les notifications Paddle.
 *
 * La liste n'est pas recopiée dans le code : Paddle la publie et peut la
 * changer. On l'interroge, et on la garde une heure en mémoire — assez pour ne
 * pas la redemander à chaque notification, assez peu pour suivre un changement
 * sans redéploiement.
 *
 * Ce filtre est une seconde barrière, pas la première. La vraie garantie reste
 * la signature : elle prouve que la charge utile vient de Paddle et n'a pas été
 * modifiée, ce qu'une adresse d'origine ne prouve jamais. C'est pourquoi, si la
 * liste est injoignable, on laisse passer et on s'en remet à la signature —
 * refuser sur une panne réseau ferait perdre des paiements réels pour se
 * protéger d'une attaque que la signature arrête déjà.
 */

const SOURCE = "https://api.paddle.com/ips";
const DUREE_CACHE_MS = 60 * 60 * 1000;

let cache: { adresses: string[]; expire: number } | null = null;

type ReponseIps = { data?: { ipv4_cidrs?: unknown } };

async function listeAutorisee(): Promise<string[] | null> {
  if (cache && cache.expire > Date.now()) return cache.adresses;

  try {
    const reponse = await fetch(SOURCE, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!reponse.ok) return null;

    const charge = (await reponse.json()) as ReponseIps;
    const brut = charge.data?.ipv4_cidrs;
    if (!Array.isArray(brut)) return null;

    const adresses = brut.filter((v): v is string => typeof v === "string");
    if (!adresses.length) return null;

    cache = { adresses, expire: Date.now() + DUREE_CACHE_MS };
    return adresses;
  } catch {
    return null;
  }
}

/** Entier 32 bits d'une adresse IPv4, ou null si la forme ne convient pas. */
function versEntier(adresse: string): number | null {
  const morceaux = adresse.trim().split(".");
  if (morceaux.length !== 4) return null;

  let valeur = 0;
  for (const morceau of morceaux) {
    if (!/^\d{1,3}$/.test(morceau)) return null;
    const octet = Number(morceau);
    if (octet > 255) return null;
    valeur = (valeur << 8) | octet;
  }
  return valeur >>> 0;
}

/**
 * Appartenance à un bloc CIDR. Les blocs publiés sont aujourd'hui des /32,
 * c'est-à-dire des adresses uniques ; le calcul de masque est là pour le jour
 * où Paddle en publierait de plus larges.
 */
function dansLeBloc(adresse: number, cidr: string): boolean {
  const [base, prefixeBrut] = cidr.split("/");
  const prefixe = prefixeBrut === undefined ? 32 : Number(prefixeBrut);
  if (!Number.isInteger(prefixe) || prefixe < 0 || prefixe > 32) return false;

  const reference = versEntier(base);
  if (reference === null) return false;

  if (prefixe === 0) return true;
  const masque = (0xffffffff << (32 - prefixe)) >>> 0;
  return (adresse & masque) === (reference & masque);
}

/** Adresse de l'appelant, telle que la pose la plateforme d'hébergement. */
export function adresseAppelante(requete: Request): string | null {
  const transmise = requete.headers.get("x-forwarded-for");
  // La chaîne peut contenir plusieurs sauts : le premier est l'appelant.
  const premiere = transmise?.split(",")[0]?.trim();
  return premiere || requete.headers.get("x-real-ip") || null;
}

export type VerdictIp = "autorisee" | "refusee" | "indeterminee";

export async function adresseDePaddle(adresse: string | null): Promise<VerdictIp> {
  const autorisees = await listeAutorisee();
  if (!autorisees) return "indeterminee";
  if (!adresse) return "indeterminee";

  const numerique = versEntier(adresse);
  // Une adresse IPv6 n'est pas comparable à cette liste, qui n'expose que de
  // l'IPv4 : on ne conclut pas plutôt que de refuser à tort.
  if (numerique === null) return "indeterminee";

  return autorisees.some((cidr) => dansLeBloc(numerique, cidr)) ? "autorisee" : "refusee";
}
