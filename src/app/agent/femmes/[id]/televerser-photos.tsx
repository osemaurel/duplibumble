"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const TAILLE_MAX = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic"];

export default function TeleverserPhotos({
  ladyId,
  prochainePosition,
}: {
  ladyId: string;
  prochainePosition: number;
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
    <div className="rounded-xl border-2 border-dashed border-[#E9E7E1] p-5">
      <label
        htmlFor="photos"
        className="block text-sm font-medium text-[#2E2D29] cursor-pointer"
      >
        Ajouter des photos
      </label>
      <p className="mt-1 text-xs text-[#9A968D]">
        JPEG, PNG, WebP ou HEIC. 10 Mo maximum par fichier. Format vertical, visage net. La
        photo en position 1 est la principale.
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
        className="mt-3 block w-full text-sm text-[#4C4B45] file:mr-4 file:rounded-lg file:border-0 file:bg-[#2E2D29] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#4C4B45] disabled:opacity-60"
      />

      {enCours && <p className="mt-3 text-sm text-[#6B6A64]">Envoi en cours…</p>}

      {message && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            message.ok ? "bg-[#E8F6EF] text-[#1B7A54]" : "bg-[#FDECEF] text-[#B8324B]"
          }`}
        >
          {message.texte}
        </p>
      )}
    </div>
  );
}
