import AvisBrouillon from "@/components/site/avis-brouillon";
import { SOCIETE } from "@/lib/societe";

export const metadata = {
  title: "Politique de confidentialité | Palab",
  description: "Données collectées par Palab, usages, durées de conservation et droits.",
};

export default function Confidentialite() {
  return (
    <article className="lg-texte">
      <h1>Politique de confidentialité</h1>
      <p className="lg-date">Dernière mise à jour : 3 septembre 2026</p>

      <AvisBrouillon />

      <h2>1. Responsable du traitement</h2>
      <p>
        {SOCIETE.nom}, {SOCIETE.adresse}, {SOCIETE.pays}. Pour toute question relative à vos
        données : {SOCIETE.emailPrivacy}.
      </p>

      <h2>2. Données collectées</h2>
      <table className="lg-table">
        <thead>
          <tr>
            <th>Donnée</th>
            <th>Pourquoi</th>
            <th>Base légale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Adresse e-mail, mot de passe (chiffré)</td>
            <td>Créer et sécuriser votre compte</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Prénom, pays, langue</td>
            <td>Afficher votre profil et adapter l&apos;interface</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Messages et photos échangés</td>
            <td>Fournir la messagerie</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Historique des crédits et des achats</td>
            <td>Facturation et obligations comptables</td>
            <td>Obligation légale</td>
          </tr>
          <tr>
            <td>Signalements et mesures de modération</td>
            <td>Sécurité des utilisateurs</td>
            <td>Intérêt légitime</td>
          </tr>
        </tbody>
      </table>
      <p>
        Les données de carte bancaire ne transitent jamais par Palab : elles sont collectées et
        conservées par Paddle.
      </p>

      <h2>3. Accès aux messages par les agents mandatés</h2>
      <p>
        Les messages que vous adressez à un profil féminin peuvent être lus, et les réponses
        rédigées, par un agent mandaté par la personne représentée, dans les conditions décrites
        à l&apos;article 4 des <a href="/conditions">conditions générales</a>. Cet agent est tenu
        à une obligation de confidentialité contractuelle.
      </p>
      <p>
        Votre adresse e-mail n&apos;est jamais communiquée aux agents ni aux personnes
        représentées.
      </p>

      <h2>4. Destinataires</h2>
      <ul>
        <li>
          <b>Supabase</b> — hébergement de la base de données et des fichiers.
        </li>
        <li>
          <b>Vercel</b> — hébergement de l&apos;application.
        </li>
        <li>
          <b>Paddle</b> — traitement des paiements et facturation.
        </li>
      </ul>
      <p>
        Certains de ces prestataires sont établis hors de l&apos;Union européenne. Les transferts
        sont encadrés par les clauses contractuelles types de la Commission européenne.
      </p>

      <h2>5. Durées de conservation</h2>
      <ul>
        <li>Compte et profil : pendant toute la vie du compte, puis 30 jours après suppression.</li>
        <li>Messages et photos : jusqu&apos;à la suppression du compte, puis 30 jours.</li>
        <li>Documents comptables et factures : 10 ans, en application des obligations légales.</li>
        <li>Signalements : 3 ans à compter de leur traitement.</li>
      </ul>

      <h2>6. Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
        limitation, d&apos;opposition et de portabilité. Vous pouvez les exercer à tout moment en
        écrivant à {SOCIETE.emailPrivacy}. Une réponse vous sera apportée dans un délai d&apos;un
        mois.
      </p>
      <p>
        Vous pouvez supprimer votre compte directement depuis votre espace membre. Vous disposez
        également du droit d&apos;introduire une réclamation auprès de l&apos;autorité de
        contrôle compétente.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Palab dépose uniquement les cookies nécessaires au maintien de votre session et à la
        sécurité du site. Ces cookies ne servent ni au profilage publicitaire ni à la mesure
        d&apos;audience par un tiers, et ne requièrent donc pas de consentement préalable.
      </p>
      <p>
        Le tunnel de paiement de Paddle peut déposer ses propres cookies, décrits dans la
        politique de Paddle.
      </p>

      <h2>8. Sécurité</h2>
      <p>
        Les échanges sont chiffrés en transit. L&apos;accès aux données est restreint au niveau
        de la base par des règles appliquées à chaque requête. Les photos sont conservées dans un
        espace privé, accessible uniquement par des adresses temporaires.
      </p>

      <h2>9. Mineurs</h2>
      <p>
        Le service est interdit aux personnes de moins de 18 ans. Tout compte identifié comme
        appartenant à un mineur est supprimé et ses données effacées.
      </p>
    </article>
  );
}
