import { flouter, largeurAdmise, redimensionner } from "@/lib/images";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sert une photo de fiche publiée sous une URL stable.
 *
 * Pourquoi ne pas garder les URL signées de Supabase ? Parce qu'une URL signée
 * change à chaque rendu : ni le navigateur ni l'optimiseur d'images de Next ne
 * peuvent la mettre en cache. Chaque visite retéléchargeait donc l'original —
 * plusieurs mégaoctets par vignette. Ici l'adresse ne dépend que de la photo et
 * de sa date de mise à jour : elle se met en cache, et Next peut la
 * redimensionner avant de la servir.
 *
 * La version est un segment de chemin, pas un paramètre de requête : Next
 * refuse d'optimiser une URL locale qui porte une chaîne de requête, et
 * renvoie « url parameter is not allowed » — donc une image cassée.
 *
 * Ce que la route accepte de rendre public est volontairement étroit : une
 * photo validée, appartenant à une fiche publiée. C'est exactement ce que la
 * page d'accueil affiche déjà à tout visiteur. Une photo en attente, refusée,
 * ou rattachée à une fiche en brouillon renvoie 404 — y compris à quelqu'un qui
 * devinerait son identifiant.
 *
 * Une photo marquée privée est toujours rendue floutée ici, quel que soit le
 * visiteur : cette adresse est mise en cache par des relais partagés, la même
 * réponse part donc à tout le monde. La version intacte vit ailleurs — voir
 * `/api/photos-privees/[id]`, qui ne connaît pas de cache commun et vérifie
 * qui demande avant de répondre.
 */

/** Une heure : une photo dépubliée disparaît des caches en une heure au plus. */
const CACHE = "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function introuvable() {
  // Même réponse pour « n'existe pas » et « pas encore publiée » : l'écart
  // entre les deux renseignerait sur des fiches non publiques.
  return new Response("Introuvable", { status: 404 });
}

export async function GET(
  requete: Request,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  // La version ne sert qu'à distinguer deux états d'une même photo dans les
  // caches : elle n'est pas relue ici, l'identifiant suffit à retrouver la ligne.
  const { id } = await params;
  if (!UUID.test(id)) return introuvable();

  // La largeur voulue, ramenée à une liste fermée : sans cela, n'importe qui
  // ferait fabriquer autant de variantes qu'il existe de nombres, et chacune
  // occuperait une entrée de cache.
  const largeur = largeurAdmise(Number(new URL(requete.url).searchParams.get("l")));

  const admin = createAdminClient();

  const { data: photo } = await admin
    .from("lady_photos")
    .select("lady_id, storage_path, status, updated_at, is_private")
    .eq("id", id)
    .maybeSingle();

  if (!photo || photo.status !== "approved") return introuvable();

  const { data: femme } = await admin
    .from("ladies")
    .select("status")
    .eq("id", photo.lady_id)
    .maybeSingle();

  if (femme?.status !== "published") return introuvable();

  const { data: fichier, error } = await admin.storage
    .from("lady-photos")
    .download(photo.storage_path);

  if (error || !fichier) return introuvable();

  // Redimensionnée ici, et non par l'optimiseur de Next : celui-ci est un
  // service compté, et son quota épuisé a fait disparaître toutes les photos du
  // site d'un coup. L'original pèse plusieurs mégaoctets, il ne part jamais tel
  // quel vers un téléphone.
  const octets = await fichier.arrayBuffer();
  const corps = new Uint8Array(
    photo.is_private ? await flouter(octets, largeur) : await redimensionner(octets, largeur),
  );

  return new Response(corps, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": CACHE,
      // Change quand la photo change, et avec la largeur demandée : deux
      // tailles de la même photo ne doivent pas se confondre dans un cache.
      ETag: `"${id}-${Date.parse(photo.updated_at) || 0}-${largeur}${photo.is_private ? "-flou" : ""}"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
