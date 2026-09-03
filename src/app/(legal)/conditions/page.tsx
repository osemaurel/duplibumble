import AvisBrouillon from "@/components/site/avis-brouillon";
import { SOCIETE } from "@/lib/societe";
import { prixLisible } from "@/lib/credits";
import { baremeAffichable, paliersAffichables } from "@/lib/credits-serveur";

export const metadata = {
  title: "Conditions générales | Palab",
  description: "Conditions générales d'utilisation et de vente de la plateforme Palab.",
};

export const dynamic = "force-dynamic";

export default async function Conditions() {
  // Le barème est lu en base : les conditions ne doivent jamais annoncer un
  // prix différent de celui réellement facturé. En cas d'indisponibilité, la
  // page s'affiche quand même avec les valeurs de repli.
  const [bareme, paliers] = await Promise.all([baremeAffichable(), paliersAffichables()]);

  return (
    <article className="lg-texte">
      <h1>Conditions générales d&apos;utilisation et de vente</h1>
      <p className="lg-date">Dernière mise à jour : 3 septembre 2026</p>

      <AvisBrouillon />

      <h2>1. Éditeur du service</h2>
      <p>
        Le site {SOCIETE.siteUrl} (« Palab ») est édité par {SOCIETE.nom},{" "}
        {SOCIETE.formeJuridique}, {SOCIETE.capital}, immatriculée sous le numéro{" "}
        {SOCIETE.immatriculation}, dont le siège social est situé {SOCIETE.adresse},{" "}
        {SOCIETE.pays}. Numéro de TVA intracommunautaire : {SOCIETE.tva}. Directeur de la
        publication : {SOCIETE.directeurPublication}. Contact : {SOCIETE.emailContact}.
      </p>
      <p>Hébergement : {SOCIETE.hebergeur}.</p>

      <h2>2. Objet</h2>
      <p>
        Palab est une plateforme de mise en relation à distance. Elle permet à des membres
        majeurs d&apos;entrer en contact avec des personnes dont le profil a été vérifié par
        l&apos;équipe de Palab, au moyen d&apos;une messagerie écrite, de l&apos;envoi de photos
        et, à terme, d&apos;appels vidéo.
      </p>
      <p>
        Palab est un service de communication. Il ne garantit aucun résultat sentimental,
        aucune rencontre physique et aucune réponse de la part des personnes contactées.
      </p>

      <h2>3. Accès et inscription</h2>
      <p>
        L&apos;accès est strictement réservé aux personnes âgées d&apos;au moins 18 ans.
        L&apos;inscription requiert une adresse e-mail valide et un mot de passe. Le membre est
        responsable de la confidentialité de ses identifiants et de toute activité menée depuis
        son compte.
      </p>
      <p>
        Le membre s&apos;engage à fournir des informations exactes et à ne pas créer plusieurs
        comptes.
      </p>

      <h2>4. Représentation des profils féminins par des agents mandatés</h2>
      <p>
        <b>
          Cette clause décrit un aspect essentiel du fonctionnement du service. Elle doit être
          lue avant tout achat.
        </b>
      </p>
      <p>
        Les personnes dont le profil est publié sur Palab peuvent être représentées par un agent
        mandaté. Cet agent est lié à la personne représentée par un contrat écrit qui
        l&apos;autorise expressément à consulter les messages reçus et à y répondre en son nom.
      </p>
      <p>
        En conséquence, un message reçu depuis un profil féminin peut avoir été rédigé par
        l&apos;agent mandaté de cette personne plutôt que par elle-même. Les échanges restent
        rattachés à la personne représentée, qui en conserve la connaissance et le bénéfice.
      </p>
      <p>
        En créant un compte et en achetant des crédits, le membre reconnaît avoir été informé de
        ce fonctionnement et l&apos;accepter.
      </p>

      <h2>5. Crédits</h2>
      <p>
        L&apos;usage du service repose sur des crédits, achetés d&apos;avance par palier. Un
        crédit n&apos;est pas une monnaie : il ne peut être ni échangé, ni cédé, ni converti en
        espèces.
      </p>
      <p>Barème en vigueur :</p>
      <ul>
        <li>Envoi d&apos;un message : {bareme.message} crédit{bareme.message > 1 ? "s" : ""}</li>
        <li>Envoi d&apos;une photo : {bareme.photo} crédits</li>
        <li>Minute d&apos;appel vidéo : {bareme.video_minute} crédits</li>
        <li>
          <b>Lecture des messages reçus : gratuite.</b>
        </li>
      </ul>
      <p>
        {bareme.bonus_bienvenue} crédits sont offerts à l&apos;inscription. Les crédits achetés
        n&apos;expirent pas.
      </p>

      {paliers.length > 0 && (
        <>
          <p>Paliers de recharge, prix toutes taxes comprises :</p>
          <ul>
            {paliers.map((palier) => (
              <li key={palier.code}>
                {palier.libelle} — {palier.credits} crédits pour{" "}
                {prixLisible(palier.prix_cents, palier.devise)}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>6. Paiement</h2>
      <p>
        Les paiements sont traités par Paddle.com Market Limited, qui agit en qualité de
        marchand de référence. Paddle est le vendeur des crédits et émet la facture. Palab ne
        conserve aucune donnée de carte bancaire.
      </p>

      <h2>7. Droit de rétractation</h2>
      <p>
        Les crédits constituent un contenu numérique fourni immédiatement. Le membre qui
        commence à consommer ses crédits avant l&apos;expiration du délai de quatorze jours
        renonce expressément à son droit de rétractation pour les crédits consommés,
        conformément aux règles applicables à la fourniture de contenu numérique aux
        consommateurs de l&apos;Union européenne.
      </p>
      <p>
        Les crédits non consommés demeurent remboursables pendant quatorze jours à compter de
        l&apos;achat. Les modalités figurent dans la{" "}
        <a href="/remboursement">politique de remboursement</a>.
      </p>

      <h2>8. Règles de conduite</h2>
      <p>Il est interdit d&apos;utiliser Palab pour :</p>
      <ul>
        <li>harceler, menacer ou dénigrer une autre personne ;</li>
        <li>
          envoyer des contenus à caractère sexuel non sollicités, violents, haineux ou
          illicites ;
        </li>
        <li>
          diffuser des contenus mettant en scène des mineurs, sous quelque forme que ce soit ;
        </li>
        <li>
          solliciter de l&apos;argent, promouvoir un service tiers ou tenter une escroquerie ;
        </li>
        <li>usurper l&apos;identité d&apos;un tiers.</li>
      </ul>
      <p>
        Tout contenu peut être signalé depuis la conversation. Un manquement peut entraîner la
        suspension immédiate du compte, sans remboursement des crédits déjà consommés.
      </p>

      <h2>9. Suspension et résiliation</h2>
      <p>
        Le membre peut supprimer son compte à tout moment depuis son espace. Palab peut suspendre
        un compte en cas de manquement aux présentes conditions ou de soupçon de fraude. En cas
        de résiliation à l&apos;initiative de Palab sans manquement du membre, les crédits non
        consommés sont remboursés.
      </p>

      <h2>10. Responsabilité</h2>
      <p>
        Palab met en œuvre des moyens raisonnables pour vérifier les profils publiés et modérer
        la plateforme. Palab ne peut cependant garantir la véracité de tout propos échangé, ni
        l&apos;issue d&apos;une relation nouée par son intermédiaire.
      </p>
      <p>
        La responsabilité de Palab ne saurait excéder le montant des sommes versées par le
        membre au cours des douze mois précédant le fait générateur.
      </p>

      <h2>11. Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la{" "}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>12. Modification des conditions</h2>
      <p>
        Palab peut modifier les présentes conditions. Les membres sont informés par e-mail au
        moins trente jours avant l&apos;entrée en vigueur d&apos;une modification substantielle.
        Les crédits déjà achetés restent régis par le barème en vigueur au jour de leur achat.
      </p>

      <h2>13. Droit applicable et litiges</h2>
      <p>
        Les présentes conditions sont soumises au droit applicable au siège social de
        l&apos;éditeur ({SOCIETE.pays}). En cas de litige, le membre peut recourir à la
        plateforme européenne de règlement en ligne des litiges. À défaut d&apos;accord amiable,
        les tribunaux compétents sont ceux du siège de l&apos;éditeur, sous réserve des règles
        protectrices du consommateur applicables à son lieu de résidence.
      </p>
    </article>
  );
}
