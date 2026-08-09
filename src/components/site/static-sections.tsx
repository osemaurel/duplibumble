/**
 * Sections éditoriales de la landing. Purement statiques : aucun état,
 * donc rendues côté serveur. Les textes seront à terme éditables depuis
 * l'interface admin.
 */

export function Mission() {
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

        <div className="collage">
          {[
            { cls: "cc1", photo: "/profiles/sk.avif", pill: "Profil vérifié", alt: "Membre de Palab en extérieur", ph: "linear-gradient(160deg,#F2788C,#B8324B)" },
            { cls: "cc2", photo: "/profiles/ru.avif", pill: "Chat vidéo", alt: "Membre de Palab", ph: "linear-gradient(160deg,#A8C6E8,#5E8AC0)" },
            { cls: "cc3", photo: "/profiles/dg.avif", pill: "Traduction", alt: "Membre de Palab", ph: "linear-gradient(160deg,#EAD9C6,#C9A87F)" },
          ].map((c) => (
            <div className={`ccard ${c.cls}`} key={c.cls}>
              <div className="ph" style={{ position: "absolute", inset: 0, background: c.ph }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.photo} alt={c.alt} />
              <span className="vpill">{c.pill}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Verification() {
  return (
    <section className="circle-sec" id="securite">
      <div className="wrap">
        <div className="circle-card">
          <div className="circle-photo">
            <div className="ph" style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#B98A5E,#7C5638)" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/profiles/ci.avif" alt="Deux membres de Palab en visioconférence" />
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
          </div>

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
            <a className="btn-dark" href="#">
              Notre charte de sécurité
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Communication() {
  return (
    <section className="duo" id="communication">
      <div className="wrap duo-grid">
        <div className="ycard">
          <div className="ycard-visual">
            <div className="shots">
              <div className="shot s-side">
                <div className="ph" style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#F5A65B,#C97B3F)" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/profiles/p2.avif" alt="" />
                <span className="idv">✓ Vérifiée</span>
              </div>
              <div className="shot s-main">
                <div className="ph" style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#E9805E,#B85538)" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/profiles/p1.avif" alt="Conversation avec Amina, 28 ans" />
                <span className="shot-name">Amina, 28</span>
                <span className="idv">✓ Vérifiée</span>
              </div>
              <div className="shot s-side">
                <div className="ph" style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#8FB57C,#5C8049)" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/profiles/p4.avif" alt="" />
                <span className="idv">✓ Vérifiée</span>
              </div>
            </div>
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
            <div className="shots">
              <div className="shot s-side" style={{ width: "clamp(120px,12vw,190px)", aspectRatio: "10/13", borderRadius: 22 }}>
                <div className="ph" style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#8FD3BC,#4FA98A)" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/profiles/p6.avif" alt="Membre en appel vidéo" />
              </div>
              <div className="shot s-main">
                <div className="ph" style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#F2788C,#B8324B)" }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/profiles/p3.avif" alt="Appel vidéo avec Mei, 25 ans" />
                <span className="shot-name">Mei, 25</span>
              </div>
            </div>
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
          <a className="btn-dark" href="#">
            Lire d&apos;autres histoires
          </a>
        </div>
        <div className="testi-photo">
          <div className="ph" style={{ background: "linear-gradient(160deg,#999,#555)" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/profiles/te.avif" alt="Un couple réuni, portrait en noir et blanc" />
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const columns = [
    {
      title: "La plateforme",
      links: ["Femmes en ligne", "Messages & lettres", "Chat vidéo", "Cadeaux virtuels", "Tarifs & crédits"],
    },
    {
      title: "Vous êtes une femme ?",
      links: ["Déposer ma candidature", "Comment être vérifiée", "Charte des membres", "Questions fréquentes"],
    },
    {
      title: "Aide & sécurité",
      links: ["Vérification des profils", "Lutte anti-arnaque", "Conseils de rencontre", "Nous contacter"],
    },
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
                  <li key={l}>
                    <a href="#">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="fbottom">
          <div className="flegal">
            {["Confidentialité", "Conditions", "Cookies", "Remboursement"].map((l) => (
              <a href="#" key={l}>
                {l}
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
