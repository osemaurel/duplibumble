import { createClient } from "@/lib/supabase/server";

import FormulairePrix from "./formulaire";

export default async function Paliers() {
  const supabase = await createClient();
  // `lirePaliers` ne renvoie que les paliers actifs ; ici on veut tout voir,
  // y compris ce qui a été retiré de la vente.
  const { data: paliers } = await supabase
    .from("paliers_credits")
    .select("*")
    .order("ordre");

  const enVente = (paliers ?? []).filter((p) => p.paddle_price_id).length;

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Paliers de recharge</h1>
          <p className="bo-sous-titre">
            {enVente
              ? `${enVente} palier${enVente > 1 ? "s" : ""} sur ${paliers?.length ?? 0} rattaché${enVente > 1 ? "s" : ""} à un prix Paddle.`
              : "Aucun palier n'est rattaché à un prix Paddle : le paiement est fermé."}
          </p>
        </div>
      </div>

      <FormulairePrix paliers={paliers ?? []} />
    </div>
  );
}
