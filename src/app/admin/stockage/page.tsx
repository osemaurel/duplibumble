import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import Compresseur from "./compresseur";

export const metadata = { title: "Stockage | Palab" };

/** Chaque lot télécharge, réencode et renvoie une douzaine de photos. */
export const maxDuration = 60;

export default async function Stockage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ count: total }, { count: restantes }] = await Promise.all([
    supabase.from("lady_photos").select("*", { count: "exact", head: true }),
    supabase
      .from("lady_photos")
      .select("*", { count: "exact", head: true })
      .is("compresse_le", null),
  ]);

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Stockage des photos</h1>
          <p className="bo-sous-titre">
            Réduire les photos déposées avant que la réduction automatique n&apos;existe.
          </p>
        </div>
      </div>

      <section className="bo-carte bo-carte-p">
        <h2 className="bo-h2">Pourquoi</h2>
        <p className="mb-texte" style={{ marginTop: "0.6rem" }}>
          Les photos envoyées avant la mise à jour étaient conservées telles que l&apos;appareil
          les avait produites — souvent trois à cinq mégaoctets. Le site n&apos;en affiche jamais
          plus de 1280 pixels de large, soit une cinquantaine de kilooctets. On stockait donc
          une soixantaine de fois ce qu&apos;on montre, et le quota du projet a fini par céder.
        </p>
        <p className="mb-texte" style={{ marginTop: "0.8rem" }}>
          Les nouvelles photos sont réduites dans le navigateur au moment de l&apos;envoi. Ce
          bouton s&apos;occupe du passif. Rien n&apos;est perdu de ce qui s&apos;affiche :
          chaque photo est ramenée à 1600 pixels, ce qui reste au-dessus de la plus grande
          taille servie.
        </p>

        <dl className="bo-defs c2" style={{ marginTop: "1.4rem" }}>
          <div>
            <dt>Photos au total</dt>
            <dd>{total ?? 0}</dd>
          </div>
          <div>
            <dt>Restant à traiter</dt>
            <dd>{restantes ?? 0}</dd>
          </div>
        </dl>

        <Compresseur restantesInitiales={restantes ?? 0} />
      </section>
    </div>
  );
}
