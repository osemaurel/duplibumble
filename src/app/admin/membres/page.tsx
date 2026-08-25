import Link from "next/link";

import { Avatar, EtatVide, IconeMembres } from "@/components/backoffice/ui";
import { emailsDesMembres } from "@/lib/membres";
import { createClient } from "@/lib/supabase/server";

export default async function Membres() {
  const supabase = await createClient();

  const [{ data: membres }, { data: soldes }, { data: mouvements }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, country, created_at")
      .eq("role", "member")
      .order("created_at", { ascending: false }),
    supabase.from("credit_balances").select("member_id, balance"),
    supabase.from("credit_transactions").select("member_id, amount, reason"),
  ]);

  const liste = membres ?? [];
  const soldeParMembre = new Map((soldes ?? []).map((s) => [s.member_id, s.balance]));
  const emails = await emailsDesMembres(liste.map((m) => m.id));

  // Dépensé et rechargé se lisent dans le journal : c'est le contexte dont on a
  // besoin avant de toucher à un solde.
  const compte = new Map<string, { depense: number; recu: number }>();
  for (const mouvement of mouvements ?? []) {
    const c = compte.get(mouvement.member_id) ?? { depense: 0, recu: 0 };
    if (mouvement.amount < 0) c.depense += -mouvement.amount;
    else c.recu += mouvement.amount;
    compte.set(mouvement.member_id, c);
  }

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Membres</h1>
          <p className="bo-sous-titre">
            Ouvrez une fiche pour consulter le relevé et ajuster le solde à la main.
          </p>
        </div>
      </div>

      <div className="bo-carte">
        {!liste.length ? (
          <EtatVide
            icone={IconeMembres}
            titre="Aucun membre inscrit"
            texte="Les comptes créés depuis la page d'inscription apparaîtront ici."
          />
        ) : (
          <div className="bo-table-enveloppe">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Pays</th>
                  <th style={{ textAlign: "right" }}>Solde</th>
                  <th style={{ textAlign: "right" }}>Reçu</th>
                  <th style={{ textAlign: "right" }}>Dépensé</th>
                  <th>Inscrit le</th>
                  <th style={{ textAlign: "right" }}>Fiche</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((membre) => {
                  const c = compte.get(membre.id) ?? { depense: 0, recu: 0 };
                  const solde = soldeParMembre.get(membre.id) ?? 0;

                  return (
                    <tr key={membre.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                          <Avatar nom={membre.display_name ?? "?"} petit />
                          <div>
                            <Link href={`/admin/membres/${membre.id}`} className="lien">
                              {membre.display_name ?? "Sans prénom"}
                            </Link>
                            <span className="discret">{emails.get(membre.id) ?? "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td>{membre.country ?? "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {solde}
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-3)" }}>
                        {c.recu}
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-3)" }}>
                        {c.depense}
                      </td>
                      <td>
                        {new Date(membre.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/admin/membres/${membre.id}`}
                          className="bo-btn fantome petit"
                        >
                          Ouvrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
