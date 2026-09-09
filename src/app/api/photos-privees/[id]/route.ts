import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Sert la version intacte d'une photo privée, au membre qui l'a débloquée.
 *
 * Contrairement à `/api/photos/[id]/[version]`, cette adresse ne porte pas de
 * version et n'est jamais mise en cache par un relais partagé : la réponse
 * dépend de qui demande, un cache commun la donnerait donc soit à tort à un
 * non-payeur, soit toujours floutée à qui a payé.
 *
 * L'autorisation se lit dans `photo_unlocks`, avec le client authentifié
 * (RLS) : seul le membre qui a réellement débloqué cette photo précise y a
 * une ligne. Le fichier lui-même est ensuite lu avec la clé de service, pour
 * la même raison que dans la route publique — le stockage ne laisse plus
 * personne d'autre le lire directement depuis la migration 0021.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refuse() {
  return new Response("Introuvable", { status: 404 });
}

export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return refuse();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return refuse();

  const { data: deblocage } = await supabase
    .from("photo_unlocks")
    .select("photo_id")
    .eq("member_id", user.id)
    .eq("photo_id", id)
    .maybeSingle();

  if (!deblocage) return refuse();

  const admin = createAdminClient();

  const { data: photo } = await admin
    .from("lady_photos")
    .select("storage_path, status")
    .eq("id", id)
    .maybeSingle();

  if (!photo || photo.status !== "approved") return refuse();

  const { data: fichier, error } = await admin.storage
    .from("lady-photos")
    .download(photo.storage_path);

  if (error || !fichier) return refuse();

  return new Response(fichier, {
    headers: {
      "Content-Type": fichier.type || "image/jpeg",
      // Privé au visiteur : jamais partagé par un CDN, seulement par son propre
      // navigateur, et brièvement.
      "Cache-Control": "private, max-age=3600, no-transform",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
