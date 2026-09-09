import Link from "next/link";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * En-tête et compteurs de l'espace membre.
 *
 * Extrait de la mise en page membre parce que la liste des profils s'en sert
 * aussi : elle vit hors de `/membre`, mais un membre qui la consulte ne quitte
 * pas son espace pour autant. Sans cela, toucher « Profils » dans la barre du
 * bas faisait disparaître et la barre et le solde, et l'écran donnait
 * l'impression d'avoir été déconnecté.
 *
 * `cache` évite que l'en-tête et la barre d'onglets, deux composants voisins,
 * comptent chacun de leur côté : la requête est faite une fois par affichage.
 */
export const resumeMembre = cache(async (membreId: string) => {
  const supabase = await createClient();

  const [{ data: solde }, { data: conversations }] = await Promise.all([
    supabase.from("credit_balances").select("balance").eq("member_id", membreId).maybeSingle(),
    supabase.from("conversations").select("member_unread"),
  ]);

  return {
    solde: solde?.balance ?? 0,
    nonLus: (conversations ?? []).reduce((total, c) => total + c.member_unread, 0),
  };
});

export default async function EnteteMembre({ membreId }: { membreId: string }) {
  const { solde, nonLus } = await resumeMembre(membreId);

  return (
    // Sur téléphone l'en-tête ne garde que l'essentiel : la navigation descend
    // en bas de l'écran, à portée du pouce.
    <header className="mb-barre">
      <Link href="/" className="mb-mark">
        Palab
      </Link>

      <nav className="mb-nav">
        <Link href="/profils" className="sur-large">
          Profils
        </Link>
        <Link href="/membre" className="sur-large">
          Messages
          {nonLus > 0 && <span className="mb-pastille">{nonLus}</span>}
        </Link>

        <Link href="/membre/compte" className="mb-credits" title="Mes crédits">
          {solde} crédits
        </Link>

        <Link href="/membre/compte" className="sur-large mb-quitter">
          Mon compte
        </Link>
      </nav>
    </header>
  );
}
