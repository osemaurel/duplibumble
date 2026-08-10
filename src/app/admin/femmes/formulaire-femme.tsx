"use client";

import { useActionState } from "react";

import { creerFemme } from "../actions";

type Option = { id: string; code: string; agency_name: string };

export default function FormulaireFemme({ agents }: { agents: Option[] }) {
  const [resultat, action, enCours] = useActionState(creerFemme, null);

  return (
    <details className="rounded-2xl bg-white border border-[#E9E7E1] p-6 group">
      <summary className="cursor-pointer font-semibold tracking-normal text-[#2E2D29] list-none flex items-center justify-between">
        <span>Créer une fiche</span>
        <span className="text-sm font-normal text-[#9A968D] group-open:hidden">Ouvrir</span>
      </summary>

      <p className="mt-2 text-sm text-[#6B6A64]">
        Créez le minimum, puis laissez l&apos;agent compléter depuis son espace. La fiche part en
        brouillon : elle n&apos;est visible de personne tant que vous ne l&apos;avez pas publiée.
      </p>

      {resultat && (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            resultat.ok ? "bg-[#E8F6EF] text-[#1B7A54] font-medium" : "bg-[#FDECEF] text-[#B8324B]"
          }`}
        >
          {resultat.message}
        </p>
      )}

      <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-[#2E2D29] mb-1.5">
            Code femme <span className="text-[#E0314B]">*</span>
          </label>
          <input
            id="code"
            name="code"
            required
            placeholder="PAL-0001"
            className="w-full rounded-xl border border-[#E9E7E1] px-4 py-2.5 outline-none focus:border-[#E0314B]"
          />
        </div>

        <div>
          <label htmlFor="agent_id" className="block text-sm font-medium text-[#2E2D29] mb-1.5">
            Agent mandaté
          </label>
          <select
            id="agent_id"
            name="agent_id"
            defaultValue=""
            className="w-full rounded-xl border border-[#E9E7E1] px-4 py-2.5 outline-none focus:border-[#E0314B]"
          >
            <option value="">À attribuer plus tard</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.code} — {agent.agency_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="display_name"
            className="block text-sm font-medium text-[#2E2D29] mb-1.5"
          >
            Prénom affiché <span className="text-[#E0314B]">*</span>
          </label>
          <input
            id="display_name"
            name="display_name"
            required
            placeholder="Amina"
            className="w-full rounded-xl border border-[#E9E7E1] px-4 py-2.5 outline-none focus:border-[#E0314B]"
          />
        </div>

        <div>
          <label htmlFor="legal_name" className="block text-sm font-medium text-[#2E2D29] mb-1.5">
            Nom légal complet <span className="text-[#E0314B]">*</span>
          </label>
          <input
            id="legal_name"
            name="legal_name"
            required
            placeholder="Amina Diallo Traoré"
            className="w-full rounded-xl border border-[#E9E7E1] px-4 py-2.5 outline-none focus:border-[#E0314B]"
          />
          <p className="mt-1 text-xs text-[#9A968D]">Interne. Jamais affiché publiquement.</p>
        </div>

        <div>
          <label htmlFor="birth_date" className="block text-sm font-medium text-[#2E2D29] mb-1.5">
            Date de naissance <span className="text-[#E0314B]">*</span>
          </label>
          <input
            id="birth_date"
            name="birth_date"
            type="date"
            required
            className="w-full rounded-xl border border-[#E9E7E1] px-4 py-2.5 outline-none focus:border-[#E0314B]"
          />
          <p className="mt-1 text-xs text-[#9A968D]">
            Interne. Seul l&apos;âge, recalculé, sera public.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="display_city"
              className="block text-sm font-medium text-[#2E2D29] mb-1.5"
            >
              Ville affichée
            </label>
            <input
              id="display_city"
              name="display_city"
              placeholder="Abidjan"
              className="w-full rounded-xl border border-[#E9E7E1] px-4 py-2.5 outline-none focus:border-[#E0314B]"
            />
          </div>
          <div>
            <label
              htmlFor="display_country"
              className="block text-sm font-medium text-[#2E2D29] mb-1.5"
            >
              Pays affiché
            </label>
            <input
              id="display_country"
              name="display_country"
              placeholder="Côte d'Ivoire"
              className="w-full rounded-xl border border-[#E9E7E1] px-4 py-2.5 outline-none focus:border-[#E0314B]"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={enCours}
            className="rounded-xl bg-[#E0314B] text-white font-semibold px-6 py-3 hover:bg-[#C42741] transition-colors disabled:opacity-60"
          >
            {enCours ? "Création…" : "Créer la fiche"}
          </button>
        </div>
      </form>
    </details>
  );
}
