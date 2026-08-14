"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { useEchange } from "./echange";

export type MessageAffiche = {
  id: string;
  body: string;
  created_at: string;
  /** Vrai si le message est de mon côté de la conversation. */
  mienne: boolean;
  /** Mention d'auteur, côté agent uniquement. */
  signature?: string | null;
  /** Signature d'un confrère : soulignée pour ne pas passer inaperçue. */
  signatureAutre?: boolean;
  /** Chemin de la pièce jointe dans le stockage, le cas échéant. */
  attachment_path?: string | null;
  /** Vrai tant que le serveur n'a pas confirmé l'envoi. */
  enVol?: boolean;
  /** Aperçu local d'une photo qui part : évite d'attendre une URL signée. */
  apercuLocal?: string | null;
};

function heure(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function jour(date: string) {
  const d = new Date(date);
  const aujourdhui = new Date();
  const hier = new Date();
  hier.setDate(aujourdhui.getDate() - 1);

  const memeJour = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (memeJour(d, aujourdhui)) return "Aujourd'hui";
  if (memeJour(d, hier)) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Fil de discussion, en direct.
 *
 * Les messages arrivent par abonnement plutôt qu'au rechargement. Le RLS
 * s'applique aussi aux abonnements : on ne reçoit que ce qu'on avait déjà le
 * droit de lire, l'abonnement n'ouvre donc rien de plus.
 */
export default function FilMessages({
  conversationId,
  initiaux,
  monCote,
  vide,
}: {
  conversationId: string;
  initiaux: MessageAffiche[];
  /** Quel expéditeur s'affiche à droite. */
  monCote: "member" | "lady";
  vide: string;
}) {
  // Deux sources : la liste rendue par le serveur, et ce qui arrive par
  // l'abonnement. On ne garde en état que la seconde, et on fusionne au rendu.
  // Recopier le serveur dans l'état obligerait à les resynchroniser sans cesse,
  // et ferait diverger les deux à la moindre course.
  const [recus, setRecus] = useState<MessageAffiche[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const bas = useRef<HTMLDivElement>(null);

  const echange = useEchange();

  const connus = new Set(initiaux.map((m) => m.id));
  const reels = [...initiaux, ...recus.filter((m) => !connus.has(m.id))];

  // Un message en vol s'efface dès que son vrai jumeau apparaît, sans attendre
  // que l'action se termine : l'abonnement le livre souvent en premier, et deux
  // bulles identiques se verraient.
  const arrives = new Set(reels.filter((m) => m.mienne).map((m) => m.body));
  const enVol = (echange?.enAttente ?? []).filter((m) => !arrives.has(m.body));

  const messages = [...reels, ...enVol].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  useEffect(() => {
    const supabase = createClient();

    const canal = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (charge) => {
          const ligne = charge.new as {
            id: string;
            body: string;
            created_at: string;
            sender: "member" | "lady";
            attachment_path: string | null;
          };

          setRecus((actuels) =>
            actuels.some((m) => m.id === ligne.id)
              ? actuels
              : [
                  ...actuels,
                  {
                    id: ligne.id,
                    body: ligne.body,
                    created_at: ligne.created_at,
                    mienne: ligne.sender === monCote,
                    attachment_path: ligne.attachment_path,
                  },
                ],
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [conversationId, monCote]);

  const cheminsAsigner = messages
    .filter((m) => !m.enVol)
    .map((m) => m.attachment_path)
    .filter((c): c is string => Boolean(c) && !urls[c as string])
    .join("|");

  useEffect(() => {
    if (!cheminsAsigner) return;
    let vivant = true;

    (async () => {
      const supabase = createClient();
      const { data } = await supabase.storage
        .from("message-attachments")
        .createSignedUrls(cheminsAsigner.split("|"), 3600);

      if (!vivant || !data) return;

      const nouvelles: Record<string, string> = {};
      for (const entree of data) {
        if (entree.path && entree.signedUrl) nouvelles[entree.path] = entree.signedUrl;
      }
      setUrls((anciennes) => ({ ...anciennes, ...nouvelles }));
    })();

    return () => {
      vivant = false;
    };
  }, [cheminsAsigner]);

  // Se coller au dernier message : c'est celui qu'on vient lire.
  useEffect(() => {
    bas.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  let dernierJour = "";

  return (
    <div className="bo-conv-flux">
      {!messages.length ? (
        <p
          style={{
            textAlign: "center",
            padding: "2.5rem 0",
            fontSize: "0.9rem",
            color: "var(--ink-3)",
          }}
        >
          {vide}
        </p>
      ) : (
        messages.map((message) => {
          const jourDuMessage = jour(message.created_at);
          const nouveauJour = jourDuMessage !== dernierJour;
          dernierJour = jourDuMessage;

          return (
            <div key={message.id}>
              {nouveauJour && <div className="bo-jour">{jourDuMessage}</div>}

              <div className={`bo-bulle-rangee ${message.mienne ? "mienne" : "sienne"}`}>
                <div className={`bo-bulle${message.enVol ? " en-vol" : ""}`}>
                  {(message.attachment_path || message.apercuLocal) && (
                    <div className="bo-bulle-photo">
                      {message.apercuLocal ?? (message.attachment_path && urls[message.attachment_path]) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={message.apercuLocal ?? urls[message.attachment_path as string]}
                          alt="Photo envoyée"
                        />
                      ) : (
                        <span>Chargement de la photo…</span>
                      )}
                    </div>
                  )}
                  {message.body && <div className="texte">{message.body}</div>}
                  <p className="meta">
                    {message.enVol ? "Envoi…" : heure(message.created_at)}
                    {message.signature && (
                      <span className={message.signatureAutre ? "autre-auteur" : undefined}>
                        {" · rédigé par "}
                        {message.signature}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={bas} />
    </div>
  );
}
