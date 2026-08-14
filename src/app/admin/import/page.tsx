import { createClient } from "@/lib/supabase/server";

import FormulaireImport from "./formulaire-import";
import ImportPhotos from "./import-photos";

export const metadata = { title: "Import | Palab" };

export default async function Import() {
  const supabase = await createClient();

  const { data: femmes } = await supabase
    .from("ladies")
    .select("id, code, display_name")
    .order("code");

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Import d&apos;un dossier</h1>
          <p className="bo-sous-titre">
            Le classeur d&apos;abord, les photos ensuite : les photos se rattachent aux fiches
            par leur code, qui doit donc déjà exister.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1.4rem" }}>
        <FormulaireImport />
        <ImportPhotos femmes={femmes ?? []} />

        <section className="bo-carte bo-carte-p">
          <h2 className="bo-h2">Ce que fait l&apos;import</h2>
          <ol
            style={{
              listStyle: "none",
              display: "grid",
              gap: "0.7rem",
              marginTop: "1rem",
              fontSize: "0.92rem",
              color: "var(--ink-2)",
              lineHeight: 1.6,
            }}
          >
            <li>
              <b>Les codes font foi.</b> Une fiche dont le code existe déjà est mise à jour, pas
              dupliquée : vous pouvez corriger le classeur et réimporter autant de fois que
              nécessaire.
            </li>
            <li>
              <b>Rien n&apos;est publié.</b> Les fiches arrivent en brouillon. La publication
              reste un geste délibéré, fiche par fiche.
            </li>
            <li>
              <b>L&apos;agent doit exister.</b> Le code agent du classeur est rattaché s&apos;il
              correspond à un agent déjà créé. Sinon la fiche est importée sans agent, et le
              rapport vous le signale.
            </li>
            <li>
              <b>Les cellules de remplissage sont ignorées.</b> « N/A », « À compléter » ou un
              tiret valent absence de valeur — sans quoi ces mentions s&apos;afficheraient sur
              les profils publics.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
