import AvisBrouillon from "@/components/site/avis-brouillon";
import { SOCIETE } from "@/lib/societe";

export const metadata = {
  title: "Nous contacter | Palab",
  description: "Coordonnées de Palab : support, données personnelles, mentions légales.",
};

export default function Contact() {
  return (
    <article className="lg-texte">
      <h1>Nous contacter</h1>

      <AvisBrouillon />

      <h2>Support et questions</h2>
      <p>
        Écrivez à <b>{SOCIETE.emailContact}</b>. Nous répondons sous cinq jours ouvrés, du lundi
        au vendredi.
      </p>
      <p>
        Pour une demande de remboursement, précisez la date de l&apos;achat concerné et écrivez
        depuis l&apos;adresse e-mail de votre compte. Les modalités figurent dans la{" "}
        <a href="/remboursement">politique de remboursement</a>.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Pour exercer vos droits d&apos;accès, de rectification ou d&apos;effacement :{" "}
        <b>{SOCIETE.emailPrivacy}</b>. Voir la{" "}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>Signaler un contenu ou un comportement</h2>
      <p>
        Un bouton de signalement est disponible dans chaque conversation. Pour une situation
        urgente — contenu impliquant un mineur, menace, chantage — écrivez à{" "}
        <b>{SOCIETE.emailContact}</b> en indiquant « URGENT » en objet.
      </p>

      <h2>Mentions légales</h2>
      <dl className="lg-defs">
        <div>
          <dt>Éditeur</dt>
          <dd>
            {SOCIETE.nom}, {SOCIETE.formeJuridique}
          </dd>
        </div>
        <div>
          <dt>Capital social</dt>
          <dd>{SOCIETE.capital}</dd>
        </div>
        <div>
          <dt>Immatriculation</dt>
          <dd>{SOCIETE.immatriculation}</dd>
        </div>
        <div>
          <dt>TVA intracommunautaire</dt>
          <dd>{SOCIETE.tva}</dd>
        </div>
        <div>
          <dt>Siège social</dt>
          <dd>
            {SOCIETE.adresse}, {SOCIETE.pays}
          </dd>
        </div>
        <div>
          <dt>Directeur de la publication</dt>
          <dd>{SOCIETE.directeurPublication}</dd>
        </div>
        <div>
          <dt>Hébergeur</dt>
          <dd>{SOCIETE.hebergeur}</dd>
        </div>
      </dl>
    </article>
  );
}
