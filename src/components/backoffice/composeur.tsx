"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { createClient } from "@/lib/supabase/client";

const TAILLE_MAX = 8 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic"];

/**
 * Barre de saisie d'une conversation.
 *
 * Tout tient sur une ligne : trombone à gauche, champ au milieu, envoi à
 * droite — la disposition de toutes les messageries. Un gros cadre surmontant
 * un bouton large mange l'écran d'un téléphone sans rien apporter.
 *
 * La photo part vers le stockage dès qu'elle est choisie, et son chemin voyage
 * dans un champ caché. Le message ne s'envoie donc jamais avec une pièce jointe
 * encore en vol.
 */
export default function Composeur({
  conversationId,
  placeholder,
  desactive = false,
  brouillon = "",
}: {
  conversationId: string;
  placeholder: string;
  desactive?: boolean;
  /** Texte réinjecté après un envoi refusé : on ne perd pas ce qui a été tapé. */
  brouillon?: string;
}) {
  // `useFormStatus` lit l'état du formulaire parent : plus besoin de le faire
  // redescendre en propriété, et il reste juste même si l'envoi part d'ailleurs.
  const { pending: enCours } = useFormStatus();
  const champ = useRef<HTMLTextAreaElement>(null);
  const fichier = useRef<HTMLInputElement>(null);

  const [apercu, setApercu] = useState<string | null>(null);
  const apercuRef = useRef<string | null>(null);
  const [chemin, setChemin] = useState("");
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const ajusterHauteur = () => {
    const el = champ.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  // Le parent remonte ce composant après un envoi réussi (via `key`) : tout
  // repart donc vide sans qu'on ait à réinitialiser l'état à la main. Reste à
  // libérer l'aperçu, qui est une URL objet retenue par le navigateur.
  useEffect(() => () => {
    if (apercuRef.current) URL.revokeObjectURL(apercuRef.current);
  }, []);

  async function choisirPhoto(fichiers: FileList) {
    const image = fichiers[0];
    if (!image) return;

    setErreur(null);

    if (image.size > TAILLE_MAX) {
      setErreur("Photo trop lourde : 8 Mo maximum.");
      return;
    }
    if (image.type && !TYPES.includes(image.type)) {
      setErreur("Format non accepté. JPEG, PNG, WebP ou HEIC.");
      return;
    }

    setEnvoiPhoto(true);

    const supabase = createClient();
    const extension = image.name.split(".").pop()?.toLowerCase() ?? "jpg";
    // Le premier segment identifie la conversation : c'est lui que la
    // politique de stockage compare aux droits de l'expéditeur.
    const destination = `${conversationId}/${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("message-attachments")
      .upload(destination, image, { upsert: false });

    setEnvoiPhoto(false);

    if (error) {
      setErreur(`Envoi de la photo refusé : ${error.message}`);
      return;
    }

    const url = URL.createObjectURL(image);
    apercuRef.current = url;
    setApercu(url);
    setChemin(destination);
  }

  function retirerPhoto() {
    if (apercu) URL.revokeObjectURL(apercu);
    apercuRef.current = null;
    setApercu(null);
    setChemin("");
    if (fichier.current) fichier.current.value = "";
  }

  const bloque = desactive || envoiPhoto;

  return (
    <div className="bo-composeur">
      <input type="hidden" name="attachment_path" value={chemin} />
      {/* L'aperçu local voyage avec le formulaire : il permet d'afficher la
          photo dans le fil sans attendre qu'une URL signée revienne. */}
      <input type="hidden" name="apercu_local" value={apercu ?? ""} />

      {erreur && <p className="bo-message erreur">{erreur}</p>}

      {apercu && (
        <div className="bo-apercu">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={apercu} alt="Photo à envoyer" />
          <button type="button" onClick={retirerPhoto} aria-label="Retirer la photo">
            ×
          </button>
        </div>
      )}

      <div className="bo-rangee-saisie">
        <input
          ref={fichier}
          id={`photo-${conversationId}`}
          type="file"
          accept="image/*"
          hidden
          disabled={bloque}
          onChange={(e) => {
            if (e.target.files?.length) void choisirPhoto(e.target.files);
          }}
        />
        <label
          htmlFor={`photo-${conversationId}`}
          className="bo-rond"
          aria-label="Joindre une photo"
          data-desactive={bloque || undefined}
        >
          {envoiPhoto ? (
            <span className="bo-tourne" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <circle cx="8.8" cy="10.2" r="1.6" />
              <path d="m4 17.5 4.6-4.3a2 2 0 0 1 2.7 0L16 17.5" />
            </svg>
          )}
        </label>

        <textarea
          ref={champ}
          name="corps"
          rows={1}
          defaultValue={brouillon}
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

        <button
          type="submit"
          className="bo-rond envoi"
          disabled={enCours || bloque}
          aria-label="Envoyer le message"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4.5 12h13M12 5.5 18.5 12 12 18.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
