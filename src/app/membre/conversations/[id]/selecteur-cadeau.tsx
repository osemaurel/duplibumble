"use client";

import { useActionState } from "react";

import { useEchange } from "@/components/backoffice/echange";
import type { GiftCatalogItem } from "@/lib/supabase/types";

import { envoyerCadeau } from "../../actions";

type Resultat = { ok: true; message: string } | { ok: false; message: string };

/**
 * Panneau de choix d'un cadeau virtuel.
 *
 * Le cadeau se pose dans le fil dès le clic, comme un message : plusieurs
 * boutons de soumission partagent un seul formulaire, chacun portant son
 * propre code en valeur — c'est lui que le serveur reçoit, jamais un prix
 * que le bouton se contenterait d'annoncer.
 *
 * Le déclencheur vit ailleurs — dans la rangée de saisie, à côté du trombone.
 * C'est ce qui impose de séparer les deux : le bouton est dans le formulaire
 * du message, et ce panneau porte son propre formulaire. Imbriquer l'un dans
 * l'autre ne serait pas du HTML valide, et le navigateur déferait
 * silencieusement l'imbrication au chargement.
 */
export default function SelecteurCadeau({
  conversationId,
  categories,
  solde,
  ouvert,
  onFermer,
}: {
  conversationId: string;
  categories: { nom: string; cadeaux: GiftCatalogItem[] }[];
  solde: number;
  ouvert: boolean;
  onFermer: () => void;
}) {
  const echange = useEchange();

  const [resultat, soumettre, enCours] = useActionState<Resultat | null, FormData>(
    async (prev, formData) => {
      const code = String(formData.get("gift_code") ?? "");
      const cadeau = categories.flatMap((c) => c.cadeaux).find((c) => c.code === code);

      if (cadeau) {
        echange?.deposer({
          id: `cadeau-en-vol-${Date.now()}`,
          body: `${cadeau.emoji} ${cadeau.libelle}`,
          created_at: new Date().toISOString(),
          mienne: true,
          gift_code: cadeau.code,
          enVol: true,
        });
      }

      const reponse = await envoyerCadeau(prev, formData);
      if (reponse.ok) onFermer();
      return reponse;
    },
    null,
  );

  if (!categories.length || !ouvert) return null;

  return (
    <div className="bo-cadeaux-fond" onClick={onFermer}>
      <div
        className="bo-cadeaux-panneau"
        role="dialog"
        aria-modal="true"
        aria-label="Choisir un cadeau"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bo-cadeaux-entete">
          <h3>Envoyer un cadeau</h3>
          <button type="button" onClick={onFermer} aria-label="Fermer">
            ×
          </button>
        </div>

        <p className="bo-aide" style={{ padding: "0 1.2rem" }}>
          Un geste symbolique dans la conversation, réglé avec vos crédits — solde actuel :{" "}
          {solde}.
        </p>

        {resultat && !resultat.ok && (
          <p className="bo-message erreur" style={{ margin: "0 1.2rem" }}>
            {resultat.message}
          </p>
        )}

        <form action={soumettre} className="bo-cadeaux-corps">
          <input type="hidden" name="conversation_id" value={conversationId} />
          {categories.map((categorie) => (
            <div key={categorie.nom} className="bo-cadeaux-categorie">
              <h4>{categorie.nom}</h4>
              <div className="bo-cadeaux-grille">
                {categorie.cadeaux.map((cadeau) => (
                  <button
                    key={cadeau.code}
                    type="submit"
                    name="gift_code"
                    value={cadeau.code}
                    className="bo-cadeau-carte"
                    disabled={enCours || solde < cadeau.cost}
                    title={`${cadeau.libelle} — ${cadeau.cost} crédits`}
                  >
                    <span className="emoji">{cadeau.emoji}</span>
                    <span className="libelle">{cadeau.libelle}</span>
                    <span className="cout">{cadeau.cost} crédits</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </form>
      </div>
    </div>
  );
}
