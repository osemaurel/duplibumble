import Link from "next/link";

export default function SignupCta() {
  return (
    <section className="dl" id="inscription">
      <div className="wrap">
        <h2>Créez votre compte et écrivez-lui aujourd&apos;hui</h2>
        <p>
          L&apos;inscription prend deux minutes et ne coûte rien. Vous ne payez que la
          communication, à l&apos;unité, sans abonnement forcé.
        </p>
        <div className="stores">
          <Link className="store" href="/inscription" style={{ padding: "1rem 2rem", borderRadius: 16 }}>
            <span>
              <b style={{ fontSize: "1.05rem" }}>Je crée mon compte gratuitement</b>
            </span>
          </Link>
          <Link
            className="store"
            href="/profils"
            style={{
              padding: "1rem 2rem",
              borderRadius: 16,
              background: "transparent",
              border: "2px solid var(--ink)",
              color: "var(--ink)",
            }}
          >
            <span>
              <b style={{ fontSize: "1.05rem" }}>Parcourir les profils</b>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
