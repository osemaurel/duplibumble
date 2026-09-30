"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { apercuDe, ilYA } from "@/lib/temps";

import { Avatar } from "./ui";

/**
 * Liste de conversations qui se tient à jour toute seule.
 *
 * Elle était rendue une fois par le serveur, et plus rien ne bougeait : une
 * réponse arrivée pendant qu'on regardait la liste ne s'y montrait pas, et
 * l'heure restait figée sur « à l'instant » indéfiniment. Il fallait
 * recharger pour savoir qu'on avait reçu quelque chose — c'est-à-dire
 * deviner qu'il fallait recharger.
 *
 * Trois choses s'actualisent donc ici :
 *
 *   les messages, par le même canal privé que la conversation elle-même, un
 *   par fil affiché — ce qui paraît beaucoup et ne l'est pas, tous les canaux
 *   d'un même client passant par une seule connexion ;
 *
 *   l'heure relative, qui se recalcule périodiquement, faute de quoi « à
 *   l'instant » le reste une heure plus tard ;
 *
 *   la liste elle-même, redemandée au serveur quand l'onglet revient au
 *   premier plan. Une conversation qui vient de naître n'a pas de canal ici :
 *   rien ne peut nous en prévenir, et sans cela elle n'apparaîtrait jamais.
 */

/** Sans nouveau signal passé ce délai, on considère la frappe terminée. */
const SAISIE_MS = 4000;
/** Cadence de recalcul des heures relatives. */
const HORLOGE_MS = 30000;
/** Rafraîchissement de fond, onglet visible seulement. */
const RAFRAICHISSEMENT_MS = 60000;

export type LigneConversation = {
  id: string;
  href: string;
  avatarNom: string;
  avatarUrl?: string | null;
  /** Nom en gras : la femme côté membre, le membre côté agent. */
  qui: string;
  /** Côté agent seulement : « écrit à » suivi de ce nom. */
  destinataire?: string | null;
  dernier: { texte: string; deMoi: boolean } | null;
  /** Phrase affichée tant qu'aucun message n'a été échangé. */
  vide: string;
  dateISO: string | null;
  /**
   * Heure relative calculée par le serveur. Sert au premier rendu : la
   * recalculer côté client avant l'hydratation ferait diverger les deux, pour
   * une différence de quelques millisecondes qui n'intéresse personne.
   */
  quandInitial: string;
  nonLu: number;
};

/** Ce qu'on a appris après le rendu du serveur, conversation par conversation. */
type Vivant = { dateISO: string; texte: string; deMoi: boolean; nonLu: number };

type Diffusion = {
  sender: "member" | "lady";
  body: string | null;
  created_at: string;
  attachment_path: string | null;
};

export default function ListeConversations({
  lignes,
  monCote,
}: {
  lignes: LigneConversation[];
  /** Mon côté de la conversation : ce qui vient de moi ne me notifie pas. */
  monCote: "member" | "lady";
}) {
  const router = useRouter();

  const [vivants, setVivants] = useState<Record<string, Vivant>>({});
  const [ecrivent, setEcrivent] = useState<Record<string, boolean>>({});
  // `null` tant que le navigateur n'a pas pris la main : le premier rendu
  // reprend l'heure du serveur, à l'identique.
  const [maintenant, setMaintenant] = useState<number | null>(null);

  // Une chaîne plutôt que le tableau : les propriétés changent d'identité à
  // chaque rendu du serveur, et l'abonnement se referait pour rien.
  const cleCanaux = useMemo(
    () => lignes.map((l) => l.id).sort().join(","),
    [lignes],
  );

  useEffect(() => {
    const identifiants = cleCanaux ? cleCanaux.split(",") : [];
    if (!identifiants.length) return;

    const supabase = createClient();
    const canaux: ReturnType<typeof supabase.channel>[] = [];
    const minuteries = new Map<string, ReturnType<typeof setTimeout>>();
    let vivant = true;

    (async () => {
      // Le jeton doit être posé sur la connexion avant tout abonnement : un
      // canal privé sans jeton est refusé silencieusement.
      const { data } = await supabase.auth.getSession();
      if (!vivant || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (!vivant) return;

      for (const id of identifiants) {
        const canal = supabase
          .channel(`conversation:${id}`, { config: { private: true } })
          .on("broadcast", { event: "nouveau-message" }, ({ payload }) => {
            const message = payload as Diffusion;
            const deMoi = message.sender === monCote;

            // Un message reçu clôt la frappe : inutile d'attendre l'extinction.
            const minuterie = minuteries.get(id);
            if (minuterie) clearTimeout(minuterie);
            setEcrivent((actuels) => ({ ...actuels, [id]: false }));

            setVivants((actuels) => {
              const precedent = actuels[id];
              const depart = precedent?.nonLu ?? lignes.find((l) => l.id === id)?.nonLu ?? 0;

              return {
                ...actuels,
                [id]: {
                  dateISO: message.created_at,
                  texte: apercuDe(message),
                  deMoi,
                  nonLu: deMoi ? 0 : depart + 1,
                },
              };
            });

            setMaintenant(Date.now());
          })
          .on("broadcast", { event: "saisie" }, ({ payload }) => {
            if ((payload as { cote?: string }).cote === monCote) return;

            setEcrivent((actuels) => ({ ...actuels, [id]: true }));

            const precedente = minuteries.get(id);
            if (precedente) clearTimeout(precedente);
            // Les points s'éteignent d'eux-mêmes : un onglet fermé en pleine
            // frappe n'envoie aucun signal d'arrêt.
            minuteries.set(
              id,
              setTimeout(() => setEcrivent((actuels) => ({ ...actuels, [id]: false })), SAISIE_MS),
            );
          })
          .subscribe();

        canaux.push(canal);
      }
    })();

    return () => {
      vivant = false;
      for (const minuterie of minuteries.values()) clearTimeout(minuterie);
      for (const canal of canaux) void supabase.removeChannel(canal);
    };
    // `lignes` n'est lu que pour un point de départ du compteur de non-lus :
    // le remettre en dépendance referait tous les abonnements à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleCanaux, monCote]);

  // L'horloge. Sans elle, « à l'instant » s'imprime une fois pour toutes.
  useEffect(() => {
    const battement = setInterval(() => setMaintenant(Date.now()), HORLOGE_MS);
    return () => clearInterval(battement);
  }, []);

  // Le direct ne couvre pas tout, et deux trous se referment ici.
  //
  // Le premier est le retour en arrière. Next réutilise toujours son cache
  // pour la navigation « retour », et c'est délibéré de sa part : cela évite
  // de perdre la position de lecture. Mais on revient alors sur la liste
  // exactement telle qu'on l'avait laissée — même aperçu, même « à l'instant »
  // figé, même pastille — alors qu'on vient précisément de lire la
  // conversation. D'où la demande au montage.
  //
  // Le second est la conversation qui vient de naître. Elle n'a pas de canal
  // ici, rien ne peut nous en prévenir : on redemande donc la liste au retour
  // sur l'onglet et de loin en loin. Jamais quand l'onglet est caché — ce
  // serait du trafic pour un écran que personne ne regarde.
  useEffect(() => {
    const redemander = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    redemander();

    const battement = setInterval(redemander, RAFRAICHISSEMENT_MS);
    document.addEventListener("visibilitychange", redemander);

    return () => {
      clearInterval(battement);
      document.removeEventListener("visibilitychange", redemander);
    };
  }, [router]);

  const affichees = useMemo(() => {
    const fusionnees = lignes.map((ligne) => {
      const vif = vivants[ligne.id];

      // L'apport du direct ne vaut que tant que le serveur n'a pas rattrapé.
      // À égalité de date c'est lui qui fait foi — c'est ainsi que la pastille
      // de non-lus retombe à zéro quand on revient d'une conversation lue.
      const plusRecent = vif && (!ligne.dateISO || vif.dateISO > ligne.dateISO);
      if (!plusRecent) return ligne;

      return {
        ...ligne,
        dateISO: vif.dateISO,
        dernier: { texte: vif.texte, deMoi: vif.deMoi },
        nonLu: vif.nonLu,
      };
    });

    return fusionnees.sort((a, b) => {
      if (!a.dateISO) return 1;
      if (!b.dateISO) return -1;
      return b.dateISO.localeCompare(a.dateISO);
    });
  }, [lignes, vivants]);

  return (
    <ul className="bo-fil">
      {affichees.map((ligne) => (
        <li key={ligne.id}>
          <Link href={ligne.href} className={ligne.nonLu > 0 ? "non-lu" : undefined}>
            <Avatar nom={ligne.avatarNom} url={ligne.avatarUrl} />

            <span className="corps">
              <span className="ligne1">
                <span className="qui">{ligne.qui}</span>
                {ligne.destinataire && (
                  <>
                    <span className="vers">écrit à</span>
                    <span className="elle">{ligne.destinataire}</span>
                  </>
                )}
                {ecrivent[ligne.id] && (
                  <span className="bo-saisie-liste" aria-label="écrit en ce moment">
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </span>
              <span className="apercu">
                {ligne.dernier
                  ? `${ligne.dernier.deMoi ? "Vous : " : ""}${ligne.dernier.texte}`
                  : ligne.vide}
              </span>
            </span>

            <span className="droite">
              <span className="quand">
                {maintenant === null ? ligne.quandInitial : ilYA(ligne.dateISO, maintenant)}
              </span>
              {ligne.nonLu > 0 && <span className="compte">{ligne.nonLu}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
