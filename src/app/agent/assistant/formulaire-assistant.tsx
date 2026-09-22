"use client";

import { useActionState } from "react";

import { enregistrerCleIA, oublierCleIA, reglerAssistant } from "../actions";

/**
 * Réglages de l'assistant.
 *
 * La clé n'est jamais réaffichée, pas même à celui qui l'a posée : on n'en
 * montre que les quatre derniers caractères, assez pour reconnaître la sienne
 * parmi plusieurs. La remontrer n'aiderait personne et suffirait à la faire
 * fuir par une capture d'écran ou un regard par-dessus l'épaule.
 */
export default function FormulaireAssistant({
  empreinte,
  modele,
  consignes,
  actif,
  verifieeLe,
}: {
  empreinte: string | null;
  modele: string;
  consignes: string;
  actif: boolean;
  verifieeLe: string | null;
}) {
  const [resultatCle, enregistrer, enregistrement] = useActionState(enregistrerCleIA, null);
  const [resultatReglages, regler, enCours] = useActionState(reglerAssistant, null);

  return (
    <>
      <form action={enregistrer} className="bo-carte bo-carte-p">
        <h2 className="bo-h2">Votre clé OpenAI</h2>

        {empreinte ? (
          <p className="bo-aide" style={{ marginTop: "0.5rem" }}>
            Une clé se terminant par <b>…{empreinte}</b> est enregistrée
            {verifieeLe
              ? `, vérifiée le ${new Date(verifieeLe).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}`
              : ""}
            . Pour la remplacer, collez la nouvelle ci-dessous.
          </p>
        ) : (
          <p className="bo-aide" style={{ marginTop: "0.5rem" }}>
            À créer sur platform.openai.com, dans « API keys ». Elle est chiffrée avant
            d&apos;être enregistrée et ne vous sera plus jamais réaffichée.
          </p>
        )}

        {resultatCle && (
          <p
            className={`bo-message ${resultatCle.ok ? "succes" : "erreur"}`}
            style={{ marginTop: "1rem" }}
          >
            {resultatCle.message}
          </p>
        )}

        <div className="bo-champ" style={{ marginTop: "1.1rem" }}>
          <label htmlFor="cle">Clé d&apos;API</label>
          <input
            id="cle"
            name="cle"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-…"
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem", marginTop: "1.1rem" }}>
          <button type="submit" className="bo-btn" disabled={enregistrement}>
            {enregistrement ? "Vérification auprès d'OpenAI…" : "Enregistrer et vérifier"}
          </button>

          {empreinte && (
            <button type="submit" formAction={oublierCleIA} className="bo-btn fantome">
              Oublier ma clé
            </button>
          )}
        </div>
      </form>

      <form action={regler} className="bo-carte bo-carte-p" style={{ marginTop: "1.5rem" }}>
        <h2 className="bo-h2">Réglages</h2>

        {resultatReglages && (
          <p
            className={`bo-message ${resultatReglages.ok ? "succes" : "erreur"}`}
            style={{ marginTop: "1rem" }}
          >
            {resultatReglages.message}
          </p>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "1.1rem",
            fontSize: "0.9rem",
          }}
        >
          <input type="checkbox" name="actif" defaultChecked={actif} />
          Laisser l&apos;assistant répondre dans mes conversations
        </label>
        <p className="bo-aide" style={{ marginTop: "0.4rem" }}>
          {actif
            ? "Actif : l'assistant répond de lui-même aux messages restés sans réponse, dans toutes vos conversations. Chaque conversation peut être exclue depuis son propre réglage."
            : "Inactif : aucun message ne part automatiquement. Enregistrer une clé réactive l'assistant."}
        </p>

        <div className="bo-champ" style={{ marginTop: "1.1rem" }}>
          <label htmlFor="modele">Modèle</label>
          <input id="modele" name="modele" type="text" defaultValue={modele} spellCheck={false} />
          <p className="bo-aide" style={{ marginTop: "0.4rem" }}>
            Le nom exact tel qu&apos;OpenAI le publie. Un modèle léger suffit largement pour
            quelques phrases, et coûte bien moins cher.
          </p>
        </div>

        <div className="bo-champ" style={{ marginTop: "1.1rem" }}>
          <label htmlFor="consignes">Consignes de votre agence</label>
          <textarea
            id="consignes"
            name="consignes"
            rows={4}
            defaultValue={consignes}
            placeholder="Tutoiement, réponses courtes, ne jamais évoquer la politique…"
          />
          <p className="bo-aide" style={{ marginTop: "0.4rem" }}>
            Elles s&apos;ajoutent aux règles de la plateforme, qui restent prioritaires :
            aucune coordonnée, aucune demande d&apos;argent, aucun rendez-vous promis.
          </p>
        </div>

        <button type="submit" className="bo-btn" disabled={enCours} style={{ marginTop: "1.1rem" }}>
          {enCours ? "Enregistrement…" : "Enregistrer les réglages"}
        </button>
      </form>
    </>
  );
}
