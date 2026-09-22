import { requireAgent } from "@/lib/auth";
import { chiffrementDisponible } from "@/lib/chiffrement";
import { createAdminClient } from "@/lib/supabase/admin";

import FormulaireAssistant from "./formulaire-assistant";

export const metadata = { title: "Assistant de rédaction | Palab" };

export default async function Assistant() {
  const { agent } = await requireAgent();

  // Clé de service, limitée à l'agent authentifié : `agent_ia` n'ouvre sa
  // lecture à personne d'autre que l'administration, et la colonne chiffrée ne
  // doit pas pouvoir sortir par le client.
  const admin = createAdminClient();
  const { data: reglages } = await admin
    .from("agent_ia")
    .select("empreinte, modele, consignes, actif, verifiee_le")
    .eq("agent_id", agent.id)
    .maybeSingle();

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Assistant de rédaction</h1>
          <p className="bo-sous-titre">
            Un modèle de langage vous propose des brouillons de réponse, à partir de la fiche
            de la femme et du fil de la conversation. Facultatif, et désactivé tant que vous
            n&apos;y touchez pas.
          </p>
        </div>
      </div>

      <section className="bo-carte bo-carte-p">
        <h2 className="bo-h2">Ce que cela implique</h2>
        <ul className="bo-liste-points" style={{ marginTop: "0.9rem" }}>
          <li>
            <b>C&apos;est votre clé et votre abonnement.</b> Palab ne fournit pas d&apos;accès
            à OpenAI et ne paie pas votre consommation : elle vous est facturée directement
            par OpenAI, à l&apos;usage.
          </li>
          <li>
            <b>Rien ne part sans vous.</b> L&apos;assistant écrit un brouillon dans votre barre
            de réponse. Vous le lisez, le corrigez, et décidez de l&apos;envoyer — ou non.
          </li>
          <li>
            <b>Ce qui est transmis à OpenAI</b> se limite à la fiche publique de la femme et
            aux vingt derniers messages de la conversation. Le dossier interne — identité
            légale, pièce, coordonnées — n&apos;en sort jamais.
          </li>
          <li>
            <b>Vous restez l&apos;auteur.</b> Un message envoyé reste signé de votre mandat.
            L&apos;administration voit seulement, en plus, qu&apos;un modèle a tenu la plume.
          </li>
        </ul>
      </section>

      {!chiffrementDisponible() ? (
        <p className="bo-message erreur">
          Le coffre à secrets n&apos;est pas configuré sur ce serveur : aucune clé ne peut y
          être mise à l&apos;abri, et l&apos;enregistrement est donc refusé. Signalez-le à
          l&apos;administration.
        </p>
      ) : (
        <FormulaireAssistant
          empreinte={reglages?.empreinte ?? null}
          modele={reglages?.modele ?? "gpt-4o-mini"}
          consignes={reglages?.consignes ?? ""}
          actif={reglages?.actif ?? false}
          verifieeLe={reglages?.verifiee_le ?? null}
        />
      )}
    </div>
  );
}
