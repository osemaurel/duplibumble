import Link from "next/link";

import { requireMember } from "@/lib/auth";
import { lireBareme, lirePaliers } from "@/lib/credits";

import Paliers from "./paliers";
import { createClient } from "@/lib/supabase/server";

import { seDeconnecter } from "../actions";

const MOTIF: Record<string, string> = {
  purchase: "Rechargement",
  message: "Message envoyé",
  photo: "Photo envoyée",
  video_minute: "Minute de vidéo",
  gift: "Cadeau",
  refund: "Remboursement",
  bonus: "Crédits offerts",
  adjustment: "Ajustement",
};

export default async function Compte() {
  const session = await requireMember();
  const supabase = await createClient();

  const [{ data: solde }, { data: mouvements }, bareme, paliers] = await Promise.all([
    supabase
      .from("credit_balances")
      .select("balance")
      .eq("member_id", session.userId)
      .maybeSingle(),
    supabase
      .from("credit_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    lireBareme(supabase),
    lirePaliers(supabase),
  ]);

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Mon compte</h1>
          <p className="bo-sous-titre">
            {session.profile.display_name ?? session.email}
          </p>
        </div>
      </div>

      <div className="bo-grille bo-grille-2">
        <section className="bo-carte bo-carte-p">
          <span className="bo-aide">Crédits disponibles</span>
          <p
            style={{
              marginTop: "0.4rem",
              fontSize: "3rem",
              fontWeight: 700,
              letterSpacing: "-0.045em",
              lineHeight: 1,
              color: "var(--brand)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {solde?.balance ?? 0}
          </p>
          <ul className="mb-bareme">
            <li>
              <span>Message envoyé</span>
              <b>
                {bareme.message} crédit{bareme.message > 1 ? "s" : ""}
              </b>
            </li>
            <li>
              <span>Photo envoyée</span>
              <b>{bareme.photo} crédits</b>
            </li>
            <li>
              <span>Message reçu</span>
              <b className="offert">gratuit</b>
            </li>
          </ul>

          <p className="bo-aide" style={{ marginTop: "0.9rem" }}>
            Un message resté sans réponse pendant {bareme.jours_remboursement} jours vous est
            remboursé automatiquement.
          </p>

          <a href="#recharger" className="bo-btn" style={{ marginTop: "1.3rem" }}>
            Recharger mon compte
          </a>
        </section>

        <section className="bo-carte bo-carte-p">
          <h2 className="bo-h2">Votre compte</h2>
          <dl className="bo-defs" style={{ marginTop: "1.1rem" }}>
            <div>
              <dt>Prénom</dt>
              <dd>{session.profile.display_name ?? "—"}</dd>
            </div>
            <div>
              <dt>Adresse e-mail</dt>
              <dd style={{ wordBreak: "break-all" }}>{session.email}</dd>
            </div>
          </dl>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "1.5rem" }}>
            <Link href="/profils" className="bo-btn fantome">
              Parcourir les profils
            </Link>
            <form action={seDeconnecter}>
              <button type="submit" className="bo-btn fantome">
                Se déconnecter
              </button>
            </form>
          </div>
        </section>
      </div>

      <Paliers paliers={paliers} membreId={session.userId} email={session.email ?? ""} />

      <div className="bo-carte" style={{ marginTop: "1.6rem" }}>
        <div className="bo-carte-titre">
          <h2 className="bo-h2">Relevé de crédits</h2>
        </div>

        {!mouvements?.length ? (
          <p style={{ padding: "2rem 1.6rem", color: "var(--ink-2)" }}>
            Aucun mouvement pour le moment.
          </p>
        ) : (
          <div className="bo-table-enveloppe">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Motif</th>
                  <th style={{ textAlign: "right" }}>Crédits</th>
                </tr>
              </thead>
              <tbody>
                {mouvements.map((mouvement) => (
                  <tr key={mouvement.id}>
                    <td>
                      {new Date(mouvement.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <span className="fort">{MOTIF[mouvement.reason] ?? mouvement.reason}</span>
                      {mouvement.note && <span className="discret">{mouvement.note}</span>}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color: mouvement.amount > 0 ? "var(--vert)" : "var(--ink-2)",
                      }}
                    >
                      {mouvement.amount > 0 ? `+${mouvement.amount}` : mouvement.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
