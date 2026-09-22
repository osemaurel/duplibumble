"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Points de saisie devant un nom, dans une liste de conversations.
 *
 * Un composant par ligne, donc un canal par conversation affichée. Cela
 * paraît beaucoup et ne l'est pas : tous les canaux d'un même client passent
 * par une seule connexion, et s'y joindre ne coûte qu'un message.
 *
 * Rien n'est affiché tant que personne n'écrit : la ligne garde exactement la
 * même hauteur, et la liste ne tressaute pas à chaque frappe.
 */

/** Sans nouveau signal passé ce délai, on considère la frappe terminée. */
const SAISIE_MS = 4000;

export default function SaisieEnCours({
  conversationId,
  monCote,
}: {
  conversationId: string;
  /** Mon côté de la conversation : ma propre frappe ne me concerne pas. */
  monCote: "member" | "lady";
}) {
  const [ecrit, setEcrit] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let vivant = true;
    let minuterie: ReturnType<typeof setTimeout> | null = null;
    let canal: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!vivant || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);

      canal = supabase
        .channel(`conversation:${conversationId}`, { config: { private: true } })
        .on("broadcast", { event: "saisie" }, ({ payload }) => {
          if ((payload as { cote?: string }).cote === monCote) return;
          setEcrit(true);
          if (minuterie) clearTimeout(minuterie);
          minuterie = setTimeout(() => setEcrit(false), SAISIE_MS);
        })
        // Un message qui arrive clôt la frappe : inutile d'attendre l'extinction.
        .on("broadcast", { event: "nouveau-message" }, () => setEcrit(false))
        .subscribe();
    })();

    return () => {
      vivant = false;
      if (minuterie) clearTimeout(minuterie);
      if (canal) void supabase.removeChannel(canal);
    };
  }, [conversationId, monCote]);

  if (!ecrit) return null;

  return (
    <span className="bo-saisie-liste" aria-label="écrit en ce moment">
      <span /><span /><span />
    </span>
  );
}
