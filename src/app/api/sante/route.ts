import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Point de contrôle de la configuration.
 *
 * Ne renvoie que des booléens et un état de connexion : jamais une valeur de
 * clé, jamais une donnée de membre. Sert à diagnostiquer un déploiement sans
 * avoir à ouvrir les journaux Vercel — utile quand celui qui développe ne peut
 * pas joindre le site lui-même.
 */
export async function GET() {
  const configuration = {
    url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL),
    clePublique: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.SUPABASE_ANON_KEY,
    ),
    clePubliqueExposeeAuNavigateur: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    cleDeService: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
    ),
  };

  // Le paiement se diagnostique de la même façon : des booléens, jamais une
  // valeur de clé. Sans ces quatre-là, les paliers restent affichés mais aucun
  // bouton n'ouvre le tunnel.
  const paiement = {
    cleApi: Boolean(process.env.PADDLE_API_KEY),
    secretNotifications: Boolean(process.env.PADDLE_WEBHOOK_SECRET),
    jetonNavigateur: Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN),
    environnement: process.env.PADDLE_ENV === "production" ? "production" : "bac à sable",
  };

  let base: { joignable: boolean; detail: string } = {
    joignable: false,
    detail: "non testée",
  };

  if (configuration.url && configuration.clePublique) {
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from("ladies")
        .select("*", { count: "exact", head: true })
        .eq("status", "published");

      base = error
        ? { joignable: false, detail: error.message }
        : { joignable: true, detail: "lecture de la galerie publique réussie" };
    } catch (erreur) {
      base = {
        joignable: false,
        detail: erreur instanceof Error ? erreur.message : "erreur inconnue",
      };
    }
  }

  const pret =
    configuration.url &&
    configuration.clePubliqueExposeeAuNavigateur &&
    configuration.cleDeService &&
    base.joignable;

  return NextResponse.json(
    { pret, configuration, base, paiement },
    { status: pret ? 200 : 503 },
  );
}
