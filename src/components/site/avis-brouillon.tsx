import { identiteIncomplete } from "@/lib/societe";

/**
 * Bandeau affiché tant que les mentions obligatoires ne sont pas renseignées.
 *
 * Il disparaît tout seul dès que `src/lib/societe.ts` est complété. Sa raison
 * d'être : une page juridique incomplète mais silencieuse se fait prendre pour
 * une page valide — par le lecteur, et surtout par celui qui l'a publiée.
 */
export default function AvisBrouillon() {
  if (!identiteIncomplete()) return null;

  return (
    <p className="bo-message avertissement" style={{ marginBottom: "1.8rem" }}>
      <b>Document incomplet.</b> Les mentions d&apos;identification de
      l&apos;éditeur restent à renseigner dans <code>src/lib/societe.ts</code>, et
      l&apos;ensemble doit être relu par un juriste avant toute mise en vente.
    </p>
  );
}
