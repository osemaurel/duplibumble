"use client";

import { useActionState } from "react";

import { ajusterCredits } from "../../actions";

/**
 * Ajustement manuel du solde.
 *
 * Le sens est un choix explicite plutôt qu'un signe à taper. Un « -50 » saisi
 * là où on voulait « +50 » ne se rattrape pas : le membre a perdu ses crédits
 * avant que quiconque s'en aperçoive.
 *
 * Le motif est obligatoire, et il part dans le relevé que le membre consulte.
 */
export default function Ajustement({
  membreId,
  solde,
}: {
  membreId: string;
  solde: number;
}) {
  const [resultat, action, enCours] = useActionState(ajusterCredits, null);

  return (
    <form action={action} className="bo-carte bo-carte-p">
      <h2 className="bo-h2">Ajuster le solde</h2>
      <p className="bo-aide" style={{ marginTop: "0.4rem" }}>
        Le mouvement s&apos;inscrit au relevé du membre, daté et motivé. Solde actuel&nbsp;:{" "}
        {solde} crédit{solde > 1 ? "s" : ""}.
      </p>

      <input type="hidden" name="membre_id" value={membreId} />

      {resultat && (
        <p
          className={`bo-message ${resultat.ok ? "succes" : "erreur"}`}
          style={{ marginTop: "1rem" }}
        >
          {resultat.message}
        </p>
      )}

      <div className="bo-grille bo-grille-2" style={{ marginTop: "1.1rem" }}>
        <div className="bo-champ">
          <label htmlFor="sens">Sens</label>
          <select id="sens" name="sens" defaultValue="ajouter">
            <option value="ajouter">Ajouter des crédits</option>
            <option value="retirer">Retirer des crédits</option>
          </select>
        </div>

        <div className="bo-champ">
          <label htmlFor="montant">Montant</label>
          <input id="montant" name="montant" type="number" min={1} step={1} required />
        </div>
      </div>

      <div className="bo-champ" style={{ marginTop: "0.9rem" }}>
        <label htmlFor="motif">Motif</label>
        <input
          id="motif"
          name="motif"
          type="text"
          required
          maxLength={160}
          placeholder="Geste commercial, incident technique, remboursement hors ligne…"
        />
      </div>

      <button type="submit" className="bo-btn" disabled={enCours} style={{ marginTop: "1.1rem" }}>
        {enCours ? "Enregistrement…" : "Enregistrer l'ajustement"}
      </button>
    </form>
  );
}
