"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

import type { MessageAffiche } from "./fil-messages";

/**
 * Le direct d'une conversation : messages qui arrivent, saisie de l'autre, et
 * envoi optimiste.
 *
 * Tout tient ici parce que le fil et la barre de saisie sont voisins et non
 * imbriqués : sans ce point commun, la barre n'aurait aucun moyen de faire
 * apparaître un message dans le fil avant la réponse du serveur, ni de
 * signaler que l'on écrit.
 *
 * `useOptimistic` se charge du retrait : React abandonne l'état optimiste dès
 * que l'action est terminée. À ce moment-là le vrai message est déjà arrivé
 * par le canal. Aucun nettoyage manuel, donc aucun doublon qui s'installe.
 *
 * Le canal est une diffusion privée, alimentée par un déclencheur de la base.
 * La version précédente écoutait la réplication (`postgres_changes`) : elle se
 * déclarait abonnée et ne recevait jamais rien, si bien qu'il fallait
 * recharger la page pour voir un message. Mesuré, reproduit hors navigateur,
 * puis remplacé — voir la migration 0026.
 */

/** Durée d'affichage des points après le dernier signal de saisie. */
const SAISIE_MS = 4000;
/** Un signal au plus toutes les deux secondes : le reste est du bruit. */
const RYTHME_SAISIE_MS = 2000;

type Contexte = {
  enAttente: MessageAffiche[];
  deposer: (message: MessageAffiche) => void;
  /** Messages arrivés par le canal depuis l'ouverture de la page. */
  recus: MessageAffiche[];
  /** Vrai quand l'autre partie est en train d'écrire. */
  autreEcrit: boolean;
  /** À appeler à chaque frappe ; se charge lui-même de s'espacer. */
  signalerSaisie: () => void;
};

const ContexteEchange = createContext<Contexte | null>(null);

export function useEchange() {
  return useContext(ContexteEchange);
}

export default function Echange({
  children,
  conversationId,
  monCote,
}: {
  children: React.ReactNode;
  conversationId: string;
  /** Quel expéditeur je suis : ce qui vient de moi ne me revient pas. */
  monCote: "member" | "lady";
}) {
  const [enAttente, deposer] = useOptimistic<MessageAffiche[], MessageAffiche>(
    [],
    (actuels, message) => [...actuels, message],
  );

  const [recus, setRecus] = useState<MessageAffiche[]>([]);
  const [autreEcrit, setAutreEcrit] = useState(false);

  const canal = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const dernierSignal = useRef(0);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let vivant = true;

    (async () => {
      // Le jeton doit être posé sur la connexion avant l'abonnement : un canal
      // privé sans jeton est refusé silencieusement.
      const { data } = await supabase.auth.getSession();
      if (!vivant || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);

      const abonnement = supabase
        .channel(`conversation:${conversationId}`, { config: { private: true } })
        .on("broadcast", { event: "nouveau-message" }, ({ payload }) => {
          const ligne = payload as {
            id: string;
            body: string;
            created_at: string;
            sender: "member" | "lady";
            attachment_path: string | null;
            gift_code: string | null;
          };

          // Ce que j'envoie moi-même remonte déjà par l'envoi optimiste.
          if (ligne.sender === monCote) return;

          setAutreEcrit(false);
          setRecus((actuels) =>
            actuels.some((m) => m.id === ligne.id)
              ? actuels
              : [
                  ...actuels,
                  {
                    id: ligne.id,
                    body: ligne.body,
                    created_at: ligne.created_at,
                    mienne: false,
                    attachment_path: ligne.attachment_path,
                    gift_code: ligne.gift_code,
                  },
                ],
          );
        })
        .on("broadcast", { event: "saisie" }, ({ payload }) => {
          if ((payload as { cote?: string }).cote === monCote) return;

          setAutreEcrit(true);
          if (minuterie.current) clearTimeout(minuterie.current);
          // Les points s'éteignent d'eux-mêmes : un onglet fermé en pleine
          // frappe n'envoie aucun signal d'arrêt, et les laisserait à vie.
          minuterie.current = setTimeout(() => setAutreEcrit(false), SAISIE_MS);
        })
        .subscribe();

      canal.current = abonnement;
    })();

    return () => {
      vivant = false;
      if (minuterie.current) clearTimeout(minuterie.current);
      if (canal.current) void supabase.removeChannel(canal.current);
      canal.current = null;
    };
  }, [conversationId, monCote]);

  const signalerSaisie = useCallback(() => {
    const maintenant = Date.now();
    if (maintenant - dernierSignal.current < RYTHME_SAISIE_MS) return;
    dernierSignal.current = maintenant;

    void canal.current?.send({
      type: "broadcast",
      event: "saisie",
      payload: { cote: monCote },
    });
  }, [monCote]);

  const valeur = useMemo(
    () => ({ enAttente, deposer, recus, autreEcrit, signalerSaisie }),
    [enAttente, deposer, recus, autreEcrit, signalerSaisie],
  );

  return <ContexteEchange.Provider value={valeur}>{children}</ContexteEchange.Provider>;
}
