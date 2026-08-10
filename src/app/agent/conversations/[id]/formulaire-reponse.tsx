"use client";

import { useActionState, useEffect, useRef } from "react";

import { repondre } from "../../actions";

export default function FormulaireReponse({
  conversationId,
  prenom,
}: {
  conversationId: string;
  prenom: string;
}) {
  const [resultat, action, enCours] = useActionState(repondre, null);
  const champ = useRef<HTMLTextAreaElement>(null);

  // Vider le champ une fois le message parti, pour ne pas risquer de le
  // renvoyer deux fois.
  useEffect(() => {
    if (resultat?.ok && champ.current) champ.current.value = "";
  }, [resultat]);

  return (
    <form action={action} className="border-t border-[#E9E7E1] bg-white p-4">
      <input type="hidden" name="conversation_id" value={conversationId} />

      {resultat && !resultat.ok && (
        <p className="mb-3 rounded-xl bg-[#FDECEF] px-4 py-2.5 text-sm text-[#B8324B]">
          {resultat.message}
        </p>
      )}

      <textarea
        ref={champ}
        name="corps"
        rows={3}
        required
        placeholder={`Répondre au nom de ${prenom}…`}
        className="w-full resize-y rounded-xl border border-[#E9E7E1] px-4 py-3 text-[#2E2D29] outline-none focus:border-[#E0314B]"
      />

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-xs text-[#9A968D]">
          Envoyé au nom de {prenom}. Votre code d&apos;agent reste attaché au message.
        </p>
        <button
          type="submit"
          disabled={enCours}
          className="shrink-0 rounded-xl bg-[#E0314B] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C42741] disabled:opacity-60"
        >
          {enCours ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </form>
  );
}
