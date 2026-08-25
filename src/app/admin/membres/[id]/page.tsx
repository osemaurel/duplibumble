import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/backoffice/ui";
import { emailsDesMembres } from "@/lib/membres";
import { createClient } from "@/lib/supabase/server";

import Ajustement from "./ajustement";

const MOTIF: Record<string, string> = {
  purchase: "Rechargement",
  message: "Message envoyé",
  photo: "Photo envoyée",
  video_minute: "Minute de vidéo",
  gift: "Cadeau",
  refund: "Remboursement",
  bonus: "Crédits offerts",
  adjustment: "Ajustement manuel",
};

export default async function FicheMembre({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: membre }, { data: solde }, { data: mouvements }, { data: conversations }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, role, display_name, country, locale, created_at")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("credit_balances").select("balance").eq("member_id", id).maybeSingle(),
      supabase
        .from("credit_transactions")
        .select("*")
        .eq("member_id", id)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("conversations").select("id").eq("member_id", id),
    ]);

  if (!membre || membre.role !== "member") notFound();

  const email = (await emailsDesMembres([membre.id])).get(membre.id);
  const journal = mouvements ?? [];
  const recu = journal.filter((m) => m.amount > 0).reduce((t, m) => t + m.amount, 0);
  const depense = journal.filter((m) => m.amount < 0).reduce((t, m) => t - m.amount, 0);

  return (
    <div>
      <Link href="/admin/membres" className="bo-retour">
        ← Tous les membres
      </Link>

      <div className="bo-entete">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Avatar nom={membre.display_name ?? "?"} />
          <div>
            <h1 className="bo-titre">{membre.display_name ?? "Sans prénom"}</h1>
            <p className="bo-sous-titre">{email ?? "adresse indisponible"}</p>
          </div>
        </div>
      </div>

      <div className="bo-grille bo-grille-2">
        <section className="bo-carte bo-carte-p">
          <span className="bo-aide">Solde actuel</span>
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

          <dl className="bo-defs" style={{ marginTop: "1.2rem" }}>
            <div>
              <dt>Crédits reçus</dt>
              <dd>{recu}</dd>
            </div>
            <div>
              <dt>Crédits dépensés</dt>
              <dd>{depense}</dd>
            </div>
            <div>
              <dt>Conversations</dt>
              <dd>{conversations?.length ?? 0}</dd>
            </div>
            <div>
              <dt>Pays</dt>
              <dd>{membre.country ?? "—"}</dd>
            </div>
            <div>
              <dt>Inscrit le</dt>
              <dd>
                {new Date(membre.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </section>

        <Ajustement membreId={membre.id} solde={solde?.balance ?? 0} />
      </div>

      <div className="bo-carte" style={{ marginTop: "1.6rem" }}>
        <div className="bo-carte-titre">
          <h2 className="bo-h2">Relevé de crédits</h2>
        </div>

        {!journal.length ? (
          <p style={{ padding: "2rem 1.6rem", color: "var(--ink-2)" }}>
            Aucun mouvement pour ce membre.
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
                {journal.map((mouvement) => (
                  <tr key={mouvement.id}>
                    <td>
                      {new Date(mouvement.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <span className="fort">
                        {MOTIF[mouvement.reason] ?? mouvement.reason}
                      </span>
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
