import Link from "next/link";
import { redirect } from "next/navigation";

import { espaceDuRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import "../backoffice.css";

export const metadata = { title: "Connexion | Palab" };

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ suivant?: string; erreur?: string }>;
}) {
  const { suivant = "", erreur } = await searchParams;

  async function seConnecter(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim();
    const motDePasse = String(formData.get("motDePasse") ?? "");
    const demande = String(formData.get("suivant") ?? "");

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    });

    if (error) {
      // Un mot de passe erroné est une chose ; une panne du service
      // d'authentification en est une autre. Les confondre sous un même
      // message envoie chercher le problème là où il n'est pas.
      const identifiantsRefuses =
        error.code === "invalid_credentials" || error.status === 400;

      const message = identifiantsRefuses
        ? "Adresse ou mot de passe incorrect."
        : `Le service d'authentification a répondu : ${error.message}`;

      redirect(
        `/connexion?suivant=${encodeURIComponent(demande)}&erreur=${encodeURIComponent(
          message,
        )}`,
      );
    }

    // La destination dépend du rôle, pas de ce que l'URL demandait. Un agent
    // envoyé vers /admin en serait refoulé jusqu'à l'accueil, et conclurait
    // que sa connexion a échoué alors qu'elle a réussi.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profil } = user
      ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      : { data: null };

    const espace = espaceDuRole(profil?.role ?? "member");

    redirect(demande.startsWith(espace) && espace !== "/" ? demande : espace);
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
              Chaque profil est vérifié,
              <br />
              un par un.
            </h1>
            <p>
              L&apos;espace de travail des équipes Palab : validation des dossiers, gestion des
              portefeuilles et suivi des conversations.
            </p>
          </div>

          <p className="cx-pied">Réservé à l&apos;administration et aux agents mandatés.</p>
        </section>

        <section className="cx-form">
          <div className="cx-boite">
            <h2>Connexion</h2>
            <p className="cx-intro">Entrez les identifiants qui vous ont été transmis.</p>

            {erreur && (
              <p className="bo-message erreur" style={{ marginTop: "1.3rem" }}>
                {erreur}
              </p>
            )}

            <form action={seConnecter} style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }}>
              <input type="hidden" name="suivant" value={suivant} />

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
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="bo-btn" style={{ marginTop: "0.35rem" }}>
                Se connecter
              </button>
            </form>

            <p className="cx-retour">
              <Link href="/">← Retour au site</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
