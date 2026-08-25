import Link from "next/link";
import { redirect } from "next/navigation";

import { REPLI, lireBareme } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import "../backoffice.css";

export const metadata = {
  title: "Créer un compte | Palab",
  description:
    "Rejoignez Palab pour écrire aux femmes dont chaque profil est vérifié par notre équipe.",
};

export default async function Inscription({
  searchParams,
}: {
  searchParams: Promise<{ suivant?: string; erreur?: string }>;
}) {
  const { suivant = "/membre", erreur } = await searchParams;

  async function creerCompte(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const motDePasse = String(formData.get("motDePasse") ?? "");
    const prenom = String(formData.get("prenom") ?? "").trim();
    const destination = String(formData.get("suivant") ?? "/membre");

    const echec = (message: string) =>
      redirect(
        `/inscription?suivant=${encodeURIComponent(destination)}&erreur=${encodeURIComponent(
          message,
        )}`,
      );

    if (motDePasse.length < 8) {
      echec("Le mot de passe doit faire au moins 8 caractères.");
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { data: { display_name: prenom } },
    });

    if (error) {
      echec(
        error.code === "user_already_exists" || error.status === 422
          ? "Un compte existe déjà avec cette adresse. Connectez-vous."
          : `Inscription refusée : ${error.message}`,
      );
    }

    if (data.user) {
      // Les crédits de bienvenue passent par la clé de service : le journal
      // n'est ouvert en écriture à personne, sinon un membre pourrait s'en
      // accorder lui-même.
      const bareme = await lireBareme(supabase);
      const admin = createAdminClient();
      await admin.from("credit_transactions").insert({
        member_id: data.user.id,
        amount: bareme.bonus_bienvenue,
        reason: "bonus",
        note: "Crédits offerts à l'inscription",
      });
    }

    // Sans session, la confirmation par e-mail est active sur le projet.
    if (!data.session) {
      redirect(
        `/connexion?erreur=${encodeURIComponent(
          "Compte créé. Confirmez votre adresse e-mail, puis connectez-vous.",
        )}`,
      );
    }

    redirect(destination);
  }

  return (
    <div className="bo" style={{ display: "grid", gridTemplateColumns: "1fr" }}>
      <div className="cx">
        <section className="cx-recit">
          <Link href="/" className="cx-mark">
            Palab
          </Link>

          <div className="cx-recit-corps">
            <h1>
              Écrivez-lui
              <br />
              dès aujourd&apos;hui.
            </h1>
            <p>
              Chaque profil féminin est vérifié un par un par notre équipe. Vous recevez{" "}
              {REPLI.bonus_bienvenue} crédits à l&apos;inscription : de quoi engager la conversation
              sans rien dépenser.
            </p>
          </div>

          <p className="cx-pied">Réservé aux personnes majeures.</p>
        </section>

        <section className="cx-form">
          <div className="cx-boite">
            <h2>Créer mon compte</h2>
            <p className="cx-intro">Deux minutes, et vous pouvez écrire.</p>

            {erreur && (
              <p className="bo-message erreur" style={{ marginTop: "1.3rem" }}>
                {erreur}
              </p>
            )}

            <form
              action={creerCompte}
              style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }}
            >
              <input type="hidden" name="suivant" value={suivant} />

              <div className="bo-champ">
                <label htmlFor="prenom">Prénom</label>
                <input id="prenom" name="prenom" required autoComplete="given-name" />
              </div>

              <div className="bo-champ">
                <label htmlFor="email">Adresse e-mail</label>
                <input id="email" name="email" type="email" required autoComplete="email" />
              </div>

              <div className="bo-champ">
                <label htmlFor="motDePasse">Mot de passe</label>
                <input
                  id="motDePasse"
                  name="motDePasse"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <p className="bo-aide">Huit caractères au minimum.</p>
              </div>

              <button type="submit" className="bo-btn" style={{ marginTop: "0.35rem" }}>
                Créer mon compte
              </button>
            </form>

            <p className="cx-retour">
              Déjà inscrit ? <Link href="/connexion">Se connecter</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
