"use client";

import { useState } from "react";

import Composeur from "@/components/backoffice/composeur";
import { useEchange } from "@/components/backoffice/echange";
import type { GiftCatalogItem } from "@/lib/supabase/types";

import { envoyerMessage } from "../../actions";
import SelecteurCadeau from "./selecteur-cadeau";

/**
 * Barre d'envoi côté membre.
 *
 * Le message est déposé dans le fil avant l'appel au serveur : il apparaît au
 * clic, marqué « Envoi… », puis cède la place au vrai message. Attendre la
 * réponse du serveur pour l'afficher donnait deux secondes d'écran figé, où
 * l'on ne savait pas si le clic avait été pris.
 */
export default function FormulaireMessage({
  conversationId,
  prenom,
  cout,
  solde,
  categoriesCadeaux,
}: {
  conversationId: string;
  prenom: string;
  cout: number;
  solde: number;
  categoriesCadeaux: { nom: string; cadeaux: GiftCatalogItem[] }[];
}) {
  const echange = useEchange();
  const [resultat, setResultat] = useState<{ ok: boolean; message?: string } | null>(null);
  const [envois, setEnvois] = useState(0);
  const [brouillon, setBrouillon] = useState("");
  const [cadeauOuvert, setCadeauOuvert] = useState(false);

  const soldeInsuffisant = solde < cout;

  async function soumettre(donnees: FormData) {
    const corps = String(donnees.get("corps") ?? "").trim();
    const piece = String(donnees.get("attachment_path") ?? "").trim();
    if (!corps && !piece) return;

    echange?.deposer({
      id: `en-vol-${Date.now()}`,
      body: corps,
      created_at: new Date().toISOString(),
      mienne: true,
      attachment_path: piece || null,
      apercuLocal: String(donnees.get("apercu_local") ?? "") || null,
      enVol: true,
    });

    // Vider la saisie tout de suite : la barre doit être prête pour le message
    // suivant, pas bloquée le temps de l'aller-retour.
    setBrouillon("");
    setEnvois((n) => n + 1);

    const reponse = await envoyerMessage(null, donnees);
    setResultat(reponse);

    // Refusé : on rend son texte à l'expéditeur plutôt que de le perdre.
    if (!reponse.ok) {
      setBrouillon(corps);
      setEnvois((n) => n + 1);
    }
  }

  return (
    <>
      <form action={soumettre} className="bo-repondre">
        <input type="hidden" name="conversation_id" value={conversationId} />

        {resultat && !resultat.ok && <p className="bo-message erreur">{resultat.message}</p>}

        {soldeInsuffisant && (
          <p className="bo-message avertissement">
            Vos crédits sont épuisés. Le rechargement arrive très bientôt.
          </p>
        )}

        <Composeur
          conversationId={conversationId}
          placeholder={`Écrire à ${prenom}…`}
          desactive={soldeInsuffisant}
          brouillon={brouillon}
          key={envois}
          actionEnPlus={
            categoriesCadeaux.length > 0 ? (
              // `type="button"` : sans cela, un bouton dans un formulaire le
              // soumet, et ouvrir le catalogue enverrait le message en cours.
              // Il reste actif même à court de crédits — le panneau montre ce
              // qui est à portée, et le solde est écrit dessus.
              <button
                type="button"
                className="bo-rond cadeau"
                aria-label="Envoyer un cadeau"
                aria-haspopup="dialog"
                aria-expanded={cadeauOuvert}
                onClick={() => setCadeauOuvert(true)}
              >
                🎁
              </button>
            ) : null
          }
        />
      </form>

      {/* Le panneau porte son propre formulaire : il reste hors de celui du
          message, deux <form> imbriqués n'étant pas du HTML valide. Il
          s'affiche par-dessus la page, sa place dans l'arbre ne se voit pas. */}
      <SelecteurCadeau
        conversationId={conversationId}
        categories={categoriesCadeaux}
        solde={solde}
        ouvert={cadeauOuvert}
        onFermer={() => setCadeauOuvert(false)}
      />
    </>
  );
}
