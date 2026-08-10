import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Connexion | Palab" };

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ suivant?: string; erreur?: string }>;
}) {
  const { suivant = "/admin", erreur } = await searchParams;

  async function seConnecter(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim();
    const motDePasse = String(formData.get("motDePasse") ?? "");
    const destination = String(formData.get("suivant") ?? "/admin");

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    });

    if (error) {
      redirect(
        `/connexion?suivant=${encodeURIComponent(destination)}&erreur=${encodeURIComponent(
          "Identifiants incorrects.",
        )}`,
      );
    }

    redirect(destination);
  }

  return (
    <main className="min-h-screen bg-[#F6F4F1] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <Link href="/" className="text-2xl font-bold text-[#E0314B] tracking-tight">
          Palab
        </Link>
        <h1 className="mt-6 text-xl font-semibold tracking-normal text-[#2E2D29]">
          Connexion à votre espace
        </h1>
        <p className="mt-2 text-sm text-[#6B6A64]">
          Réservé à l&apos;administration et aux agents mandatés.
        </p>

        {erreur && (
          <p className="mt-5 rounded-xl bg-[#FDECEF] text-[#B8324B] text-sm px-4 py-3">
            {erreur}
          </p>
        )}

        <form action={seConnecter} className="mt-6 space-y-4">
          <input type="hidden" name="suivant" value={suivant} />

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#2E2D29] mb-1.5">
              Adresse e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-[#E9E7E1] px-4 py-3 text-[#2E2D29] outline-none focus:border-[#E0314B]"
            />
          </div>

          <div>
            <label
              htmlFor="motDePasse"
              className="block text-sm font-medium text-[#2E2D29] mb-1.5"
            >
              Mot de passe
            </label>
            <input
              id="motDePasse"
              name="motDePasse"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-[#E9E7E1] px-4 py-3 text-[#2E2D29] outline-none focus:border-[#E0314B]"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[#E0314B] text-white font-semibold py-3 hover:bg-[#C42741] transition-colors"
          >
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );
}
