"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const TAILLE_MAX = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic"];

/**
 * Envoi des photos d'une femme, depuis le navigateur.
 *
 * Partagé par l'agent et l'administration : le RLS du stockage décide qui a le
 * droit d'écrire dans le dossier, la même interface convient donc aux deux.
 */
export default function TeleverserPhotos({
  ladyId,
  prochainePosition,
  valideDOffice = false,
}: {
  ladyId: string;
  prochainePosition: number;
  /** L'administration valide en déposant : elle n'a personne à attendre. */
  valideDOffice?: boolean;
}) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function envoyer(fichiers: FileList) {
    setEnCours(true);
    setMessage(null);

    const supabase = createClient();
    const refuses: string[] = [];
    let envoyees = 0;
    let position = prochainePosition;

    for (const fichier of Array.from(fichiers)) {
      if (fichier.size > TAILLE_MAX) {
        refuses.push(`${fichier.name} : plus de 10 Mo`);
        continue;
      }
      if (fichier.type && !TYPES.includes(fichier.type)) {
        refuses.push(`${fichier.name} : format non accepté`);
        continue;
      }

      // Le premier segment du chemin est l'identifiant de la femme : c'est lui
      // que la politique de stockage compare au mandat de l'agent.
      const extension = fichier.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const chemin = `${ladyId}/${Date.now()}-${position}.${extension}`;

      const { error: erreurEnvoi } = await supabase.storage
        .from("lady-photos")
        .upload(chemin, fichier, { upsert: false });

      if (erreurEnvoi) {
        refuses.push(`${fichier.name} : ${erreurEnvoi.message}`);
        continue;
      }

      const { error: erreurLigne } = await supabase.from("lady_photos").insert({
        lady_id: ladyId,
        storage_path: chemin,
        position,
        ...(valideDOffice ? { status: "approved" as const } : {}),
      });

      if (erreurLigne) {
        // Sans ce retrait, le fichier resterait dans le stockage sans aucune
        // ligne pour le désigner — invisible, mais facturé.
        await supabase.storage.from("lady-photos").remove([chemin]);
        refuses.push(`${fichier.name} : ${erreurLigne.message}`);
        continue;
      }

      envoyees += 1;
      position += 1;
    }

    setEnCours(false);
    if (champ.current) champ.current.value = "";

    setMessage({
      ok: envoyees > 0 && refuses.length === 0,
      texte:
        (envoyees > 0
          ? `${envoyees} photo${envoyees > 1 ? "s" : ""} envoyée${envoyees > 1 ? "s" : ""}. `
          : "") + (refuses.length ? `Refusé — ${refuses.join(" ; ")}` : ""),
    });

    if (envoyees > 0) router.refresh();
  }

  return (
    <div className="bo-depot">
      <label htmlFor="photos" className="bo-label" style={{ cursor: "pointer", marginBottom: 0 }}>
        Ajouter des photos
      </label>
      <p className="bo-aide" style={{ marginTop: "0.3rem" }}>
        JPEG, PNG, WebP ou HEIC. 10 Mo maximum par fichier. Format vertical, visage net. La
        photo en position 1 est la principale.
        {valideDOffice && " Déposées ici, elles sont validées d'office."}
      </p>

      <input
        ref={champ}
        id="photos"
        type="file"
        multiple
        accept="image/*"
        disabled={enCours}
        onChange={(e) => {
          if (e.target.files?.length) void envoyer(e.target.files);
        }}
      />

      {enCours && (
        <p className="bo-aide" style={{ marginTop: "0.8rem" }}>
          Envoi en cours…
        </p>
      )}

      {message && (
        <p
          className={`bo-message ${message.ok ? "succes" : "erreur"}`}
          style={{ marginTop: "0.8rem" }}
        >
          {message.texte}
        </p>
      )}
    </div>
  );
}
