"use client";

import { useEffect, useRef } from "react";

/**
 * Zone de saisie d'un message.
 *
 * Entrée envoie, Maj+Entrée passe à la ligne — la convention de toutes les
 * messageries. Sans elle, chaque envoi demande d'aller chercher le bouton à la
 * souris, ce qui casse le rythme d'une conversation.
 */
export default function ZoneMessage({
  nom = "corps",
  placeholder,
  desactive = false,
  reinitialiser,
}: {
  nom?: string;
  placeholder: string;
  desactive?: boolean;
  /** Change de valeur quand le message est parti : le champ se vide alors. */
  reinitialiser?: unknown;
}) {
  const champ = useRef<HTMLTextAreaElement>(null);

  const ajusterHauteur = () => {
    const el = champ.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  useEffect(() => {
    if (!champ.current) return;
    champ.current.value = "";
    ajusterHauteur();
  }, [reinitialiser]);

  return (
    <textarea
      ref={champ}
      name={nom}
      rows={2}
      required
      disabled={desactive}
      placeholder={placeholder}
      onInput={ajusterHauteur}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          e.currentTarget.form?.requestSubmit();
        }
      }}
    />
  );
}
