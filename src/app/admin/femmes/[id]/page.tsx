import Link from "next/link";
import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { LadyStatus } from "@/lib/supabase/types";

import { attribuerFemme, changerStatutFemme, changerStatutPhoto } from "../../actions";

const LIBELLE_STATUT: Record<LadyStatus, string> = {
  draft: "Brouillon",
  pending_review: "À valider",
  published: "Publiée",
  rejected: "Refusée",
  suspended: "Suspendue",
};

const TRANSITIONS: { statut: LadyStatus; libelle: string; principal?: boolean }[] = [
  { statut: "published", libelle: "Publier", principal: true },
  { statut: "rejected", libelle: "Refuser" },
  { statut: "suspended", libelle: "Suspendre" },
  { statut: "draft", libelle: "Remettre en brouillon" },
];

export default async function FicheFemme({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: femme } = await supabase.from("ladies").select("*").eq("id", id).single();
  if (!femme) notFound();

  const [{ data: prive }, { data: photos }, { data: agents }] = await Promise.all([
    supabase.from("lady_private").select("*").eq("lady_id", id).maybeSingle(),
    supabase.from("lady_photos").select("*").eq("lady_id", id).order("position"),
    supabase.from("agents").select("id, code, agency_name").order("code"),
  ]);

  // Le compartiment est privé : chaque vignette a besoin d'une URL signée,
  // valable une heure. Une photo non validée reste ainsi invisible en dehors
  // de cet écran, même si son chemin venait à circuler.
  const admin = createAdminClient();
  const vignettes = new Map<string, string>();
  for (const photo of photos ?? []) {
    const { data } = await admin.storage
      .from("lady-photos")
      .createSignedUrl(photo.storage_path, 3600);
    if (data?.signedUrl) vignettes.set(photo.id, data.signedUrl);
  }

  const champsPublics: [string, string | number | null][] = [
    ["Prénom affiché", femme.display_name],
    ["Âge", femme.age],
    ["Ville", femme.display_city],
    ["Pays", femme.display_country],
    ["Situation", femme.marital_status],
    ["Enfants", femme.children],
    ["Profession", femme.profession],
    ["Études", femme.education],
    ["Taille", femme.height_cm ? `${femme.height_cm} cm` : null],
    ["Recherche", femme.seeking],
    ["Âge recherché", femme.seeking_age_min ? `${femme.seeking_age_min} – ${femme.seeking_age_max}` : null],
    ["Prête à déménager", femme.willing_to_relocate],
  ];

  const champsPrives: [string, string | null][] = [
    ["Nom légal", prive?.legal_name ?? null],
    ["Date de naissance", prive?.birth_date ?? null],
    ["Nationalité", prive?.nationality ?? null],
    ["Résidence", [prive?.residence_city, prive?.residence_country].filter(Boolean).join(", ") || null],
    ["E-mail", prive?.email ?? null],
    ["Téléphone", prive?.phone ?? null],
    ["Pièce d'identité", prive?.id_document_type ? `${prive.id_document_type} · ${prive.id_document_number ?? "—"}` : null],
    ["Mandat signé", prive?.mandate_signed ? `Oui${prive.mandate_date ? ` — ${prive.mandate_date}` : ""}` : "Non"],
    ["Consentement photos", prive?.photo_consent ? "Oui" : "Non"],
  ];

  const bloquants = [
    !prive && "le dossier privé est absent",
    prive && !prive.mandate_signed && "le mandat n'est pas signé",
    prive && !prive.photo_consent && "le consentement photos manque",
    !femme.agent_id && "aucun agent n'est attribué",
    !(photos ?? []).some((p) => p.status === "approved") && "aucune photo n'est validée",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/femmes" className="text-sm text-[#6B6A64] hover:text-[#E0314B]">
          ← Toutes les femmes
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-normal text-[#2E2D29]">
            {femme.display_name}
            {femme.age ? `, ${femme.age}` : ""}
          </h1>
          <span className="text-[#9A968D]">· {femme.code}</span>
          <span className="rounded-full bg-[#F1EFEB] px-3 py-1 text-xs font-medium text-[#4C4B45]">
            {LIBELLE_STATUT[femme.status]}
          </span>
        </div>
      </div>

      {bloquants.length > 0 && femme.status !== "published" && (
        <div className="rounded-2xl border border-[#F0C36D] bg-[#FFF8E8] p-5">
          <h2 className="font-semibold tracking-normal text-[#8A5A00]">
            À compléter avant publication
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-[#8A5A00]">
            {bloquants.map((manque) => (
              <li key={manque}>— {manque}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#A67A2E]">
            Rien ne vous empêche techniquement de publier : ce rappel signale seulement ce
            qui manque au dossier.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {TRANSITIONS.filter((t) => t.statut !== femme.status).map((transition) => (
          <form action={changerStatutFemme} key={transition.statut}>
            <input type="hidden" name="lady_id" value={femme.id} />
            <input type="hidden" name="statut" value={transition.statut} />
            <button
              type="submit"
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                transition.principal
                  ? "bg-[#E0314B] text-white hover:bg-[#C42741]"
                  : "bg-white border border-[#E9E7E1] text-[#4C4B45] hover:border-[#E0314B]"
              }`}
            >
              {transition.libelle}
            </button>
          </form>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white border border-[#E9E7E1] p-6">
          <h2 className="font-semibold tracking-normal text-[#2E2D29]">Fiche publique</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            {champsPublics.map(([libelle, valeur]) => (
              <div key={libelle}>
                <dt className="text-[#9A968D]">{libelle}</dt>
                <dd className="mt-0.5 text-[#2E2D29]">{valeur || "—"}</dd>
              </div>
            ))}
          </dl>

          {femme.headline && (
            <p className="mt-5 text-sm text-[#4C4B45] italic">« {femme.headline} »</p>
          )}
          {femme.bio && (
            <p className="mt-3 text-sm text-[#4C4B45] leading-relaxed">{femme.bio}</p>
          )}
        </section>

        <section className="rounded-2xl border-2 border-dashed border-[#E9E7E1] bg-white p-6">
          <h2 className="font-semibold tracking-normal text-[#2E2D29]">
            Dossier interne
            <span className="ml-2 text-xs font-normal text-[#B8324B]">jamais publié</span>
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            {champsPrives.map(([libelle, valeur]) => (
              <div key={libelle}>
                <dt className="text-[#9A968D]">{libelle}</dt>
                <dd className="mt-0.5 text-[#2E2D29]">{valeur || "—"}</dd>
              </div>
            ))}
          </dl>

          <form action={attribuerFemme} className="mt-6 flex flex-wrap items-end gap-3">
            <input type="hidden" name="lady_id" value={femme.id} />
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="agent_id"
                className="block text-sm font-medium text-[#2E2D29] mb-1.5"
              >
                Agent mandaté
              </label>
              <select
                id="agent_id"
                name="agent_id"
                defaultValue={femme.agent_id ?? ""}
                className="w-full rounded-xl border border-[#E9E7E1] px-4 py-2.5 outline-none focus:border-[#E0314B]"
              >
                <option value="">Aucun</option>
                {(agents ?? []).map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.code} — {agent.agency_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#2E2D29] text-white font-semibold px-5 py-2.5 text-sm hover:bg-[#4C4B45]"
            >
              Attribuer
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-2xl bg-white border border-[#E9E7E1] p-6">
        <h2 className="font-semibold tracking-normal text-[#2E2D29]">
          Photos · {photos?.length ?? 0}
        </h2>
        <p className="mt-1 text-sm text-[#6B6A64]">
          Une photo n&apos;apparaît dans la galerie publique que si elle est validée et la fiche
          publiée.
        </p>

        {!photos?.length ? (
          <p className="mt-6 text-[#6B6A64]">
            Aucune photo déposée. C&apos;est à l&apos;agent de les envoyer depuis son espace.
          </p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => {
              const url = vignettes.get(photo.id);
              return (
                <figure key={photo.id} className="rounded-xl overflow-hidden bg-[#FAF9F7] border border-[#E9E7E1]">
                  <div className="aspect-[3/4] bg-[#F1EFEB] flex items-center justify-center">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`Photo ${photo.position}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[#9A968D] px-3 text-center">
                        Fichier introuvable
                      </span>
                    )}
                  </div>

                  <figcaption className="p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9A968D]">
                        {photo.position === 1 ? "Principale" : `Photo ${photo.position}`}
                      </span>
                      <span
                        className={
                          photo.status === "approved"
                            ? "text-[#1B7A54] font-medium"
                            : photo.status === "rejected"
                              ? "text-[#B8324B]"
                              : "text-[#A66300]"
                        }
                      >
                        {photo.status === "approved"
                          ? "Validée"
                          : photo.status === "rejected"
                            ? "Refusée"
                            : "En attente"}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {photo.status !== "approved" && (
                        <form action={changerStatutPhoto} className="flex-1">
                          <input type="hidden" name="photo_id" value={photo.id} />
                          <input type="hidden" name="lady_id" value={femme.id} />
                          <input type="hidden" name="statut" value="approved" />
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-[#1B7A54] text-white text-xs font-semibold py-2"
                          >
                            Valider
                          </button>
                        </form>
                      )}
                      {photo.status !== "rejected" && (
                        <form action={changerStatutPhoto} className="flex-1">
                          <input type="hidden" name="photo_id" value={photo.id} />
                          <input type="hidden" name="lady_id" value={femme.id} />
                          <input type="hidden" name="statut" value="rejected" />
                          <button
                            type="submit"
                            className="w-full rounded-lg border border-[#E9E7E1] text-[#B8324B] text-xs font-semibold py-2"
                          >
                            Refuser
                          </button>
                        </form>
                      )}
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
