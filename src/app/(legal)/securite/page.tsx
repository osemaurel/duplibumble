import Link from "next/link";

export const metadata = {
  title: "Sécurité | Palab",
  description: "Comment Palab vérifie les profils, modère les signalements et protège les membres.",
};

/**
 * Page dédiée, distincte de l'ancre #securite de la landing.
 *
 * Le bouton « Notre charte de sécurité » vivait à l'intérieur même de la
 * section qu'une ancre aurait pointée — un lien vers soi-même n'apprend rien
 * de plus. Cette page développe ce que la landing ne fait qu'annoncer.
 */
export default function Securite() {
  return (
    <article className="lg-texte">
      <h1>Comment Palab protège ses membres</h1>

      <h2>Vérification des profils</h2>
      <p>
        Une femme qui rejoint Palab dépose une candidature. Notre équipe contrôle son identité,
        ses photos et ses intentions avant toute publication. Aucun profil n&apos;apparaît sur la
        plateforme sans être passé par cette vérification.
      </p>
      <p>
        Chaque photo publiée est validée une par une : une photo refusée n&apos;est jamais
        visible, ni par vous, ni par personne.
      </p>

      <h2>Des femmes représentées par des agents mandatés</h2>
      <p>
        Une partie des profils est gérée par un agent mandaté, dans les conditions décrites à
        l&apos;article&nbsp;4 des <Link href="/conditions">conditions générales</Link>. Ce n&apos;est
        pas caché ni ambigu : c&apos;est écrit dans le contrat que chaque membre accepte avant
        d&apos;acheter des crédits.
      </p>

      <h2>Signaler un problème</h2>
      <p>
        Un message ou une photo qui vous met mal à l&apos;aise se signale directement depuis la
        conversation. Un signalement arrive dans notre file de modération et est traité par une
        personne, pas un robot.
      </p>
      <p>
        Pour une situation urgente, écrivez-nous directement — les modalités sont sur la page{" "}
        <Link href="/contact">Nous contacter</Link>.
      </p>

      <h2>Reconnaître une tentative d&apos;arnaque</h2>
      <ul>
        <li>
          Personne de sérieux ne vous demandera jamais d&apos;argent, de coordonnées bancaires ou
          de payer des frais avant une rencontre.
        </li>
        <li>
          Méfiez-vous d&apos;un profil qui refuse systématiquement l&apos;appel vidéo, ou qui
          invente des prétextes pour ne jamais s&apos;y prêter.
        </li>
        <li>Ne quittez jamais Palab pour poursuivre une conversation ailleurs sur demande insistante.</li>
      </ul>

      <h2>Vos données</h2>
      <p>
        Vos échanges restent privés, et vos données de paiement ne transitent jamais par nos
        serveurs. Le détail figure dans la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
    </article>
  );
}
