"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const TAILLE_MAX = 10 * 1024 * 1024;

type Femme = { id: string; code: string; display_name: string };

type Bilan = {
  envoyees: number;
  ignorees: string[];
  echecs: string[];
};

/**
 * Import groupé de photos.
 *
 * Chaque fichier est rattaché à une femme d'après le code contenu dans son
 * nom — `PAL-0001_avatar_02.png` comme `PAL-0001_02.jpg`. Le reste du nom est
 * indifférent : imposer une convention stricte reviendrait à faire renommer
 * deux cents fichiers à la main.
 *
 * L'ordre suit le classement alphabétique des noms, ce qui place la photo
 * `_01` en principale.
 */
export default function ImportPhotos({ femmes }: { femmes: Femme[] }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [avancement, setAvancement] = useState({ fait: 0, total: 0 });
  const [bilan, setBilan] = useState<Bilan | null>(null);

  const parCode = new Map(femmes.map((f) => [f.code.toUpperCase(), f]));

  function trouverFemme(nom: string) {
    // On teste les codes du plus long au plus court : sans cela, « PAL-1 »
    // capterait les fichiers de « PAL-12 ».
    const majuscule = nom.toUpperCase();
    const codes = [...parCode.keys()].sort((a, b) => b.length - a.length);
    const code = codes.find((c) => majuscule.includes(c));
    return code ? parCode.get(code)! : null;
  }

  async function envoyer(fichiers: FileList) {
    const liste = Array.from(fichiers).sort((a, b) => a.name.localeCompare(b.name));

    setEnCours(true);
    setBilan(null);
    setAvancement({ fait: 0, total: liste.length });

    const supabase = createClient();
    const ignorees: string[] = [];
    const echecs: string[] = [];
    let envoyees = 0;

    // Position de départ par femme : on reprend après les photos déjà en place.
    const { data: existantes } = await supabase.from("lady_photos").select("lady_id, position");
    const prochaine = new Map<string, number>();
    for (const p of existantes ?? []) {
      prochaine.set(p.lady_id, Math.max(prochaine.get(p.lady_id) ?? 0, p.position + 1));
    }

    for (const fichier of liste) {
      const femme = trouverFemme(fichier.name);

      if (!femme) {
        ignorees.push(fichier.name);
        setAvancement((a) => ({ ...a, fait: a.fait + 1 }));
        continue;
      }
      if (fichier.size > TAILLE_MAX) {
        echecs.push(`${fichier.name} : plus de 10 Mo`);
        setAvancement((a) => ({ ...a, fait: a.fait + 1 }));
        continue;
      }

      const position = prochaine.get(femme.id) ?? 1;
      const extension = fichier.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const chemin = `${femme.id}/${Date.now()}-${position}.${extension}`;

      const { error: erreurEnvoi } = await supabase.storage
        .from("lady-photos")
        .upload(chemin, fichier, { upsert: false });

      if (erreurEnvoi) {
        echecs.push(`${fichier.name} : ${erreurEnvoi.message}`);
        setAvancement((a) => ({ ...a, fait: a.fait + 1 }));
        continue;
      }

      const { error: erreurLigne } = await supabase.from("lady_photos").insert({
        lady_id: femme.id,
        storage_path: chemin,
        position,
        status: "approved",
      });

      if (erreurLigne) {
        // Sans ce retrait, le fichier resterait dans le stockage sans aucune
        // ligne pour le désigner — invisible, mais facturé.
        await supabase.storage.from("lady-photos").remove([chemin]);
        echecs.push(`${fichier.name} : ${erreurLigne.message}`);
      } else {
        prochaine.set(femme.id, position + 1);
        envoyees += 1;
      }

      setAvancement((a) => ({ ...a, fait: a.fait + 1 }));
    }

    setEnCours(false);
    setBilan({ envoyees, ignorees, echecs });
    if (champ.current) champ.current.value = "";
    if (envoyees > 0) router.refresh();
  }

  return (
    <div className="bo-carte bo-carte-p">
      <h2 className="bo-h2">Photos, en une fois</h2>
      <p className="bo-aide" style={{ fontSize: "0.9rem" }}>
        Sélectionnez tout le dossier. Chaque photo rejoint la femme dont le code figure dans son
        nom de fichier. Déposées ici, elles sont validées d&apos;office.
      </p>

      {femmes.length === 0 ? (
        <p className="bo-message avertissement" style={{ marginTop: "1.1rem" }}>
          Importez d&apos;abord le classeur : sans fiches, aucune photo ne peut être rattachée.
        </p>
      ) : (
        <div className="bo-depot" style={{ marginTop: "1.3rem" }}>
          <label htmlFor="lot-photos" className="bo-label" style={{ cursor: "pointer" }}>
            Photos ({femmes.length} fiche{femmes.length > 1 ? "s" : ""} reconnue
            {femmes.length > 1 ? "s" : ""})
          </label>
          <input
            ref={champ}
            id="lot-photos"
            type="file"
            multiple
            accept="image/*"
            disabled={enCours}
            onChange={(e) => {
              if (e.target.files?.length) void envoyer(e.target.files);
            }}
          />
        </div>
      )}

      {enCours && (
        <p className="bo-aide" style={{ marginTop: "1rem" }}>
          Envoi {avancement.fait} / {avancement.total}…
        </p>
      )}

      {bilan && (
        <div style={{ marginTop: "1.1rem", display: "grid", gap: "0.6rem" }}>
          <p className={`bo-message ${bilan.echecs.length ? "avertissement" : "succes"}`}>
            {bilan.envoyees} photo{bilan.envoyees > 1 ? "s" : ""} envoyée
            {bilan.envoyees > 1 ? "s" : ""} et validée{bilan.envoyees > 1 ? "s" : ""}.
          </p>

          {bilan.ignorees.length > 0 && (
            <p className="bo-message avertissement">
              {bilan.ignorees.length} fichier{bilan.ignorees.length > 1 ? "s" : ""} sans code
              reconnu : {bilan.ignorees.slice(0, 4).join(", ")}
              {bilan.ignorees.length > 4 ? "…" : ""}
            </p>
          )}

          {bilan.echecs.length > 0 && (
            <p className="bo-message erreur">
              {bilan.echecs.length} refus — {bilan.echecs.slice(0, 3).join(" ; ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
