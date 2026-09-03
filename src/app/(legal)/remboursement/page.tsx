import AvisBrouillon from "@/components/site/avis-brouillon";
import { SOCIETE } from "@/lib/societe";
import { baremeAffichable } from "@/lib/credits-serveur";

export const metadata = {
  title: "Remboursement et annulation | Palab",
  description: "Conditions de remboursement des crédits achetés sur Palab.",
};

export const dynamic = "force-dynamic";

export default async function Remboursement() {
  const bareme = await baremeAffichable();

  return (
    <article className="lg-texte">
      <h1>Politique de remboursement et d&apos;annulation</h1>
      <p className="lg-date">Dernière mise à jour : 3 septembre 2026</p>

      <AvisBrouillon />

      <h2>1. Remboursement automatique des messages sans réponse</h2>
      <p>
        <b>
          Un message resté sans réponse pendant {bareme.jours_remboursement} jours vous est
          remboursé automatiquement.
        </b>{" "}
        Aucune démarche n&apos;est nécessaire : les crédits reviennent sur votre compte et
        l&apos;opération apparaît dans votre relevé.
      </p>
      <p>
        Si une réponse vous parvient, les messages qui la précèdent sont considérés comme ayant
        rempli leur objet et ne sont pas remboursés.
      </p>

      <h2>2. Crédits non consommés</h2>
      <p>
        Les crédits achetés et non consommés sont remboursables pendant quatorze jours à compter
        de l&apos;achat, sur simple demande à {SOCIETE.emailContact}. Le remboursement est
        effectué sur le moyen de paiement d&apos;origine sous quatorze jours.
      </p>

      <h2>3. Crédits déjà consommés</h2>
      <p>
        Les crédits dépensés correspondent à un service déjà rendu — un message transmis, une
        photo envoyée — et ne sont pas remboursables, sauf dans les cas prévus aux articles 4
        et 5.
      </p>

      <h2>4. Dysfonctionnement du service</h2>
      <p>
        Si un message n&apos;a pas été transmis, ou si le service a été indisponible au point de
        vous empêcher d&apos;utiliser vos crédits, ceux-ci vous sont restitués intégralement.
        Signalez-le à {SOCIETE.emailContact} en indiquant la date et la conversation concernée.
      </p>

      <h2>5. Profil frauduleux ou compte suspendu</h2>
      <p>
        Si un profil avec lequel vous avez échangé est retiré pour fraude, les crédits dépensés
        dans cette conversation vous sont remboursés.
      </p>
      <p>
        Si Palab suspend votre compte sans manquement de votre part, vos crédits non consommés
        vous sont remboursés. En cas de suspension pour manquement aux conditions générales,
        aucun remboursement n&apos;est dû.
      </p>

      <h2>6. Comment demander un remboursement</h2>
      <p>
        Écrivez à {SOCIETE.emailContact} depuis l&apos;adresse e-mail de votre compte, en
        précisant le motif et, si possible, la date de l&apos;achat concerné. Une réponse vous
        est apportée sous cinq jours ouvrés.
      </p>
      <p>
        Les achats étant traités par Paddle en qualité de marchand de référence, le
        remboursement est exécuté par Paddle et apparaît sous son libellé sur votre relevé
        bancaire.
      </p>

      <h2>7. Droit de rétractation</h2>
      <p>
        Les crédits sont un contenu numérique fourni immédiatement. En commençant à les consommer
        avant la fin du délai légal de quatorze jours, vous renoncez à votre droit de
        rétractation pour les seuls crédits consommés. Les crédits non consommés restent
        couverts par l&apos;article 2.
      </p>
    </article>
  );
}
