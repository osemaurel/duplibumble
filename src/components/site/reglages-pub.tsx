"use client";

import {
  type Consentement,
  enregistrerConsentement,
  oublierCookiesMeta,
} from "@/lib/pixel";

import { useConsentement } from "./consentement";

/**
 * Où l'on revient sur son choix publicitaire.
 *
 * Le bandeau ne s'affiche qu'une fois ; sans cet encart, le « oui » serait
 * définitif. Retirer son accord doit être aussi simple que le donner, et cela
 * suppose un endroit stable où le faire — la politique de confidentialité est
 * celui que tout le monde cherche.
 */
export default function ReglagesPub() {
  const choix = useConsentement();

  // Rien tant que le navigateur n'a pas répondu : annoncer un état pour en
  // afficher un autre une fraction de seconde plus tard vaut moins que rien.
  if (choix === undefined) return null;

  function changer(valeur: Consentement) {
    const revient = choix === "oui" && valeur === "non";
    enregistrerConsentement(valeur);

    if (revient) {
      oublierCookiesMeta();
      // Le script chargé plus tôt dans la visite ne se retire pas d'un état
      // React : seule une page neuve en est vraiment débarrassée.
      window.location.reload();
    }
  }

  return (
    <div className="pub-reglages">
      <p>
        {choix === "oui"
          ? "Vous avez accepté la mesure publicitaire."
          : choix === "non"
            ? "Vous avez refusé la mesure publicitaire. Aucun cookie Meta n'est déposé."
            : "Vous n'avez pas encore fait de choix. Aucun cookie Meta n'est déposé tant que vous n'avez pas accepté."}
      </p>

      <div className="pub-reglages-boutons">
        <button type="button" onClick={() => changer("non")} disabled={choix === "non"}>
          Refuser
        </button>
        <button
          type="button"
          className="pub-accord"
          onClick={() => changer("oui")}
          disabled={choix === "oui"}
        >
          Accepter
        </button>
      </div>
    </div>
  );
}
