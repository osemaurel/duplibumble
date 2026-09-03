import type { ProfilVitrine } from "@/lib/vitrine";

import GroupePhotos from "./groupe-photos";
import Photo from "./photo";

/**
 * Sections éditoriales de la landing. Rendues côté serveur : aucun état.
 * Les textes seront à terme éditables depuis l'interface admin.
 *
 * Les portraits proviennent des fiches réellement publiées, passées en
 * propriété. Quand la vitrine retombe sur les profils de démonstration, ces
 * sections suivent : elles montrent alors les mêmes visages que le reste de
 * la page, plutôt qu'un jeu d'images sans rapport.
 */

/** Photo du profil demandé, ou repli sur une image générique. */
function portrait(profils: ProfilVitrine[], rang: number, repli: string) {
  return profils.length ? profils[rang % profils.length].photo : repli;
}

/**
 * Nom et âge du même profil. Les vignettes légendées doivent nommer la
 * personne qu'elles montrent : une photo réelle sous un prénom inventé serait
 * exactement le genre de détail qui décrédibilise la page.
 */
function legende(profils: ProfilVitrine[], rang: number, repli: string) {
  if (!profils.length) return repli;
  const p = profils[rang % profils.length];
  return `${p.nom}${p.age ? `, ${p.age}` : ""}`;
}

export function Mission({ profils = [] }: { profils?: ProfilVitrine[] }) {
  return (
    <section className="mission">
      <div className="wrap mission-grid">
        <div>
          <h2>Notre mission&nbsp;: rapprocher ceux que la distance sépare.</h2>
          <p>
            Palab met en relation des hommes du monde entier avec des femmes sérieuses,
            vérifiées une à une par notre équipe. Messagerie, lettres et chat vidéo&nbsp;:
            vous avancez à votre rythme, en toute sécurité.
          </p>
          <a className="btn-dark" href="#profils">
            Découvrir les profils
          </a>
        </div>

        <GroupePhotos className="collage">
          {[
            { cls: "cc1", photo: portrait(profils, 0, "/profiles/sk.avif"), pill: "Profil vérifié", tailles: "(max-width:900px) 60vw, 380px" },
            { cls: "cc2", photo: portrait(profils, 1, "/profiles/ru.avif"), pill: "Chat vidéo", tailles: "140px" },
            { cls: "cc3", photo: portrait(profils, 2, "/profiles/dg.avif"), pill: "Traduction", tailles: "220px" },
          ].map((c) => (
            <div className={`ccard ${c.cls}`} key={c.cls}>
              <span className="ph" />
              <Photo src={c.photo} alt="Membre de Palab" sizes={c.tailles} />
              <span className="vpill">{c.pill}</span>
            </div>
          ))}
        </GroupePhotos>
      </div>
    </section>
  );
}

export function Verification({ profils = [] }: { profils?: ProfilVitrine[] }) {
  return (
    <section className="circle-sec" id="securite">
      <div className="wrap">
        <div className="circle-card">
          <GroupePhotos className="circle-photo">
            <span className="ph" />
            <Photo
              src={portrait(profils, 3, "/profiles/ci.avif")}
              alt="Membre de Palab vérifiée"
              sizes="(max-width:900px) 100vw, 45vw"
            />
            <svg className="stamp" viewBox="0 0 200 200" aria-hidden="true">
              <defs>
                <path id="circ" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
              </defs>
              <circle cx="100" cy="100" r="98" fill="rgba(46,45,41,.35)" />
              <circle cx="100" cy="100" r="56" fill="#E0314B" />
              <g fill="#fff">
                <rect x="72" y="82" width="56" height="9" rx="4.5" />
                <rect x="80" y="97" width="40" height="9" rx="4.5" />
                <rect x="88" y="112" width="24" height="9" rx="4.5" />
              </g>
              <text fontSize="16" fontWeight="700" letterSpacing="3" fill="#FFFFFF" fontFamily="Outfit,sans-serif">
                <textPath href="#circ">PROFIL VÉRIFIÉ • PROFIL VÉRIFIÉ •</textPath>
              </text>
            </svg>
          </GroupePhotos>

          <div className="circle-body">
            <h2>Chaque profil est vérifié, un par un</h2>
            <p>
              Les femmes qui souhaitent rejoindre Palab déposent une candidature. Notre équipe
              contrôle l&apos;identité, les photos et les intentions de chacune avant toute
              publication&nbsp;: pas de robots, pas de faux profils, pas de photos trompeuses.
            </p>
            <p>
              Vos échanges et vos données de paiement restent privés. Une modération humaine
              surveille la plateforme en continu et notre support vous répond 7&nbsp;j/7, de votre
              premier message à votre première rencontre.
            </p>
            <a className="btn-dark" href="/securite">
              Notre charte de sécurité
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Communication({ profils = [] }: { profils?: ProfilVitrine[] }) {
  return (
    <section className="duo" id="communication">
      <div className="wrap duo-grid">
        <div className="ycard">
          <div className="ycard-visual">
            <GroupePhotos className="shots">
              <div className="shot s-side">
                <span className="ph" />
                <Photo src={portrait(profils, 4, "/profiles/p2.avif")} alt="" sizes="120px" />
                <span className="idv">✓ Vérifiée</span>
              </div>
              <div className="shot s-main">
                <span className="ph" />
                <Photo
                  src={portrait(profils, 5, "/profiles/p1.avif")}
                  alt={`Conversation avec ${legende(profils, 5, "Amina, 28")}`}
                  sizes="220px"
                />
                <span className="shot-name">{legende(profils, 5, "Amina, 28")}</span>
                <span className="idv">✓ Vérifiée</span>
              </div>
              <div className="shot s-side">
                <span className="ph" />
                <Photo src={portrait(profils, 6, "/profiles/p4.avif")} alt="" sizes="120px" />
                <span className="idv">✓ Vérifiée</span>
              </div>
            </GroupePhotos>
          </div>
          <h3>Messages &amp; lettres</h3>
          <p>
            Écrivez, envoyez des photos, offrez un cadeau virtuel. La traduction automatique gomme
            la barrière de la langue&nbsp;: elle vous lit dans la sienne, vous la lisez dans la
            vôtre.
          </p>
          <a className="go" href="#profils">
            Commencer une conversation
          </a>
        </div>

        <div className="ycard">
          <div className="ycard-visual">
            <span className="chip" style={{ top: "14%", left: "8%" }}>
              <span className="cdot" /> Appel en cours
            </span>
            <span className="chip" style={{ top: "34%", left: "5%" }}>
              <span className="cdot" style={{ background: "#8B5CF6" }} /> Traduction
            </span>
            <span className="chip" style={{ top: "54%", left: "9%" }}>
              <span className="cdot" style={{ background: "#10B981" }} /> HD sécurisé
            </span>
            <GroupePhotos className="shots">
              <div className="shot s-side" style={{ width: "clamp(120px,12vw,190px)", aspectRatio: "10/13", borderRadius: 22 }}>
                <span className="ph" />
                <Photo
                  src={portrait(profils, 7, "/profiles/p6.avif")}
                  alt="Membre en appel vidéo"
                  sizes="190px"
                />
              </div>
              <div className="shot s-main">
                <span className="ph" />
                <Photo
                  src={portrait(profils, 8, "/profiles/p3.avif")}
                  alt={`Appel vidéo avec ${legende(profils, 8, "Mei, 25")}`}
                  sizes="220px"
                />
                <span className="shot-name">{legende(profils, 8, "Mei, 25")}</span>
              </div>
            </GroupePhotos>
            <span className="flower" aria-hidden="true">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="#fff">
                <circle cx="32" cy="14" r="10" />
                <circle cx="50" cy="26" r="10" />
                <circle cx="44" cy="46" r="10" />
                <circle cx="20" cy="46" r="10" />
                <circle cx="14" cy="26" r="10" />
                <circle cx="32" cy="31" r="9" fill="#E0314B" />
                <rect x="24" y="27" width="16" height="4" rx="2" />
                <rect x="27" y="33" width="10" height="4" rx="2" />
              </svg>
            </span>
          </div>
          <h3>Chat vidéo en direct</h3>
          <p>
            Quand la conversation devient sérieuse, passez en vidéo. Vous voyez à qui vous parlez,
            elle vous voit&nbsp;: c&apos;est la meilleure preuve qu&apos;il y a bien quelqu&apos;un
            de réel en face.
          </p>
          <a className="go" href="#profils">
            Lancer un appel vidéo
          </a>
        </div>
      </div>
    </section>
  );
}

export function Testimonial() {
  return (
    <section className="testi" id="fonctionnement">
      <div className="wrap testi-grid">
        <div>
          <span className="qmark" aria-hidden="true">
            &quot;
          </span>
          <blockquote>
            On s&apos;est écrit pendant quatre mois avant le premier appel vidéo. Aujourd&apos;hui,
            je prépare mon voyage pour la rencontrer
          </blockquote>
          <cite>Marc, 41 ans — membre depuis 2025</cite>
          {/* Pas de bouton « Lire d'autres histoires » : ce témoignage est
              lui-même un profil de démonstration (voir le bandeau du pied de
              page). En inventer d'autres pour remplir une page reviendrait à
              fabriquer de faux avis clients — à remettre en place le jour où
              de vrais témoignages existent, pas avant. */}
        </div>
        <GroupePhotos className="testi-photo">
          <span className="ph" />
          <Photo
            src="/profiles/te.avif"
            alt="Un couple réuni, portrait en noir et blanc"
            sizes="(max-width:900px) 100vw, 45vw"
          />
        </GroupePhotos>
      </div>
    </section>
  );
}

export function Footer() {
  // Une destination par intitulé quand elle existe réellement. "Cadeaux
  // virtuels" et "Conseils de rencontre" restent sans lien : la fonctionnalité
  // et le contenu correspondants n'existent pas encore, et un lien qui ne mène
  // nulle part de précis serait pire qu'une absence de lien.
  const columns: { title: string; links: { libelle: string; href?: string }[] }[] = [
    {
      title: "La plateforme",
      links: [
        { libelle: "Femmes en ligne", href: "/profils" },
        { libelle: "Messages & lettres", href: "#communication" },
        { libelle: "Chat vidéo", href: "#communication" },
        { libelle: "Cadeaux virtuels" },
        { libelle: "Tarifs & crédits", href: "/tarifs" },
      ],
    },
    {
      title: "Vous êtes une femme ?",
      links: [
        { libelle: "Déposer ma candidature", href: "/contact" },
        { libelle: "Comment être vérifiée", href: "/securite" },
        { libelle: "Charte des membres", href: "/conditions" },
        { libelle: "Questions fréquentes", href: "/contact" },
      ],
    },
    {
      title: "Aide & sécurité",
      links: [
        { libelle: "Vérification des profils", href: "/securite" },
        { libelle: "Lutte anti-arnaque", href: "/securite" },
        { libelle: "Conseils de rencontre" },
      ],
    },
  ];

  // Les pages qui existent réellement. Un lien mort vers une mention légale
  // fait échouer une vérification de paiement aussi sûrement qu'une page
  // absente — et se remarque moins.
  const legales = [
    { libelle: "Conditions générales", href: "/conditions" },
    { libelle: "Confidentialité", href: "/confidentialite" },
    { libelle: "Remboursement", href: "/remboursement" },
    { libelle: "Nous contacter", href: "/contact" },
  ];

  return (
    <footer>
      <div className="wrap">
        <div className="fgrid">
          <div className="fbrand">
            <span className="wordmark">Palab</span>
            <p>
              La plateforme de rencontres internationales où chaque profil féminin est vérifié par
              une équipe humaine.
            </p>
          </div>
          {columns.map((c) => (
            <div key={c.title}>
              <h4>{c.title}</h4>
              <ul>
                {c.links.map((l) => (
                  <li key={l.libelle}>
                    {l.href ? <a href={l.href}>{l.libelle}</a> : <span className="lien-a-venir">{l.libelle}</span>}
                  </li>
                ))}
                {c.title === "Aide & sécurité" && (
                  <li>
                    <a href="/contact">Nous contacter</a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="fbottom">
          <div className="flegal">
            {legales.map((l) => (
              <a href={l.href} key={l.href}>
                {l.libelle}
              </a>
            ))}
          </div>
          <span>© 2026 Palab — Tous droits réservés. Réservé aux personnes majeures (18+).</span>
          <span className="disclaim">
            Palab — maquette de démonstration. Les profils affichés sont fictifs et les photos
            générées par IA&nbsp;; ils seront remplacés par de véritables membres ayant donné leur
            consentement.
          </span>
        </div>
      </div>
    </footer>
  );
}
