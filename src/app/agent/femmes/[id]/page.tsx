import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LadyStatus } from "@/lib/supabase/types";

import { soumettreFiche, supprimerPhoto } from "../../actions";
import FormulaireFiche from "./formulaire-fiche";
import TeleverserPhotos from "./televerser-photos";

const LIBELLE: Record<LadyStatus, string> = {
  draft: "Brouillon",
  pending_review: "En attente de validation",
  published: "Publiée",
  rejected: "Refusée",
  suspended: "Suspendue",
};

export default async function FicheFemmeAgent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { agent } = await requireAgent();
  const supabase = await createClient();

  const { data: femme } = await supabase.from("ladies").select("*").eq("id", id).maybeSingle();
  if (!femme) notFound();

  // La galerie publique est lisible par tous : une fiche publiée d'un confrère
  // remonterait donc ici sans être modifiable. On l'écarte explicitement.
  if (femme.agent_id !== agent.id) notFound();

  const [{ data: prive }, { data: photos }] = await Promise.all([
    supabase.from("lady_private").select("*").eq("lady_id", id).maybeSingle(),
    supabase.from("lady_photos").select("*").eq("lady_id", id).order("position"),
  ]);

  const vignettes = new Map<string, string>();
  for (const photo of photos ?? []) {
    const { data } = await supabase.storage
      .from("lady-photos")
      .createSignedUrl(photo.storage_path, 3600);
    if (data?.signedUrl) vignettes.set(photo.id, data.signedUrl);
  }

  const prochainePosition =
    (photos ?? []).reduce((max, p) => Math.max(max, p.position), 0) + 1;

  const manques = [
    !femme.headline && "l'accroche",
    !femme.bio && "la présentation",
    !femme.looking_for && "le texte « ce qu'elle recherche »",
    !femme.display_country && "le pays",
    (photos ?? []).length < 4 && "au moins quatre photos",
    !prive?.mandate_signed && "le mandat signé (à faire remonter à l'administration)",
  ].filter(Boolean) as string[];

  const soumissionPossible = femme.status === "draft" || femme.status === "rejected";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/agent/femmes" className="text-sm text-[#6B6A64] hover:text-[#E0314B]">
          ← Mes fiches
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-normal text-[#2E2D29]">
              {femme.display_name}
              {femme.age ? `, ${femme.age}` : ""}
            </h1>
            <span className="text-[#9A968D]">· {femme.code}</span>
            <span className="rounded-full bg-[#F1EFEB] px-3 py-1 text-xs font-medium text-[#4C4B45]">
              {LIBELLE[femme.status]}
            </span>
          </div>

          {soumissionPossible && (
            <form action={soumettreFiche}>
              <input type="hidden" name="lady_id" value={femme.id} />
              <button
                type="submit"
                className="rounded-xl bg-[#E0314B] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C42741]"
              >
                Soumettre à la validation
              </button>
            </form>
          )}
        </div>
      </div>

      {femme.status === "pending_review" && (
        <p className="rounded-2xl border border-[#F0C36D] bg-[#FFF8E8] px-5 py-4 text-sm text-[#8A5A00]">
          Fiche transmise à l&apos;administration. Vous pouvez continuer à la modifier ; la
          publication ne dépend plus que de sa validation.
        </p>
      )}

      {femme.status === "rejected" && (
        <p className="rounded-2xl border border-[#F2A7B5] bg-[#FDECEF] px-5 py-4 text-sm text-[#B8324B]">
          Fiche refusée par l&apos;administration. Corrigez ce qui a été signalé, puis
          soumettez-la de nouveau.
        </p>
      )}

      {manques.length > 0 && femme.status !== "published" && (
        <div className="rounded-2xl border border-[#E9E7E1] bg-white px-5 py-4">
          <p className="text-sm font-medium text-[#2E2D29]">Il manque encore :</p>
          <ul className="mt-2 space-y-1 text-sm text-[#6B6A64]">
            {manques.map((manque) => (
              <li key={manque}>— {manque}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#9A968D]">
            Rien ne vous empêche de soumettre malgré tout : une fiche incomplète a simplement
            peu de chances d&apos;être publiée.
          </p>
        </div>
      )}

      <FormulaireFiche femme={femme} />

      <section className="rounded-2xl border border-[#E9E7E1] bg-white p-6">
        <h2 className="font-semibold tracking-normal text-[#2E2D29]">
          Photos · {photos?.length ?? 0}
        </h2>
        <p className="mt-1 text-sm text-[#6B6A64]">
          Chaque photo est validée une par une par l&apos;administration avant d&apos;apparaître
          publiquement.
        </p>

        <div className="mt-5">
          <TeleverserPhotos ladyId={femme.id} prochainePosition={prochainePosition} />
        </div>

        {photos?.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => {
              const url = vignettes.get(photo.id);
              return (
                <figure
                  key={photo.id}
                  className="overflow-hidden rounded-xl border border-[#E9E7E1] bg-[#FAF9F7]"
                >
                  <div className="flex aspect-[3/4] items-center justify-center bg-[#F1EFEB]">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`Photo ${photo.position}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="px-3 text-center text-xs text-[#9A968D]">
                        Aperçu indisponible
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
                            ? "font-medium text-[#1B7A54]"
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

                    {photo.rejection_note && (
                      <p className="mt-2 text-xs text-[#B8324B]">{photo.rejection_note}</p>
                    )}

                    <form action={supprimerPhoto} className="mt-3">
                      <input type="hidden" name="photo_id" value={photo.id} />
                      <input type="hidden" name="lady_id" value={femme.id} />
                      <input type="hidden" name="storage_path" value={photo.storage_path} />
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-[#E9E7E1] py-2 text-xs font-semibold text-[#B8324B] hover:border-[#B8324B]"
                      >
                        Retirer
                      </button>
                    </form>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 text-sm text-[#6B6A64]">
            Aucune photo pour l&apos;instant. Six à dix photos verticales donnent le meilleur
            résultat.
          </p>
        )}
      </section>

      <section className="rounded-2xl border-2 border-dashed border-[#E9E7E1] bg-white p-6">
        <h2 className="font-semibold tracking-normal text-[#2E2D29]">
          Dossier interne
          <span className="ml-2 text-xs font-normal text-[#B8324B]">jamais publié</span>
        </h2>
        <p className="mt-1 text-sm text-[#6B6A64]">
          Ces informations servent à la vérification. Pour les corriger, passez par
          l&apos;administration.
        </p>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          {(
            [
              ["Nom légal", prive?.legal_name ?? null],
              ["Date de naissance", prive?.birth_date ?? null],
              ["Nationalité", prive?.nationality ?? null],
              [
                "Résidence",
                [prive?.residence_city, prive?.residence_country].filter(Boolean).join(", ") ||
                  null,
              ],
              ["Mandat signé", prive?.mandate_signed ? "Oui" : "Non"],
              ["Consentement photos", prive?.photo_consent ? "Oui" : "Non"],
            ] as [string, string | null][]
          ).map(([libelle, valeur]) => (
            <div key={libelle}>
              <dt className="text-[#9A968D]">{libelle}</dt>
              <dd className="mt-0.5 text-[#2E2D29]">{valeur || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
