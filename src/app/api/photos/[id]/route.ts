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
 * Ce que la route accepte de rendre public est volontairement étroit : une
 * photo validée, appartenant à une fiche publiée. C'est exactement ce que la
 * page d'accueil affiche déjà à tout visiteur. Une photo en attente, refusée,
 * ou rattachée à une fiche en brouillon renvoie 404 — y compris à quelqu'un qui
 * devinerait son identifiant.
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
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID.test(id)) return introuvable();

  const admin = createAdminClient();

  const { data: photo } = await admin
    .from("lady_photos")
    .select("lady_id, storage_path, status, updated_at")
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

  return new Response(fichier, {
    headers: {
      "Content-Type": fichier.type || "image/jpeg",
      "Cache-Control": CACHE,
      // Change quand la photo change : un remplacement invalide le cache sans
      // attendre l'expiration.
      ETag: `"${id}-${Date.parse(photo.updated_at) || 0}"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
