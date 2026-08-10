import Link from "next/link";

import { requireAdmin } from "@/lib/auth";

import { seDeconnecter } from "./actions";

export const metadata = { title: "Administration | Palab" };

const LIENS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/femmes", label: "Femmes" },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/signalements", label: "Signalements" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#F6F4F1]">
      <header className="bg-white border-b border-[#E9E7E1]">
        <div className="mx-auto max-w-[1400px] px-6 h-16 flex items-center gap-8">
          <Link href="/admin" className="text-xl font-bold text-[#E0314B] tracking-tight">
            Palab
          </Link>
          <span className="text-xs uppercase tracking-wider text-[#9A968D] font-semibold">
            Administration
          </span>

          <nav className="ml-auto flex items-center gap-1">
            {LIENS.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className="px-3 py-2 rounded-lg text-sm font-medium text-[#4C4B45] hover:bg-[#F6F4F1]"
              >
                {lien.label}
              </Link>
            ))}
          </nav>

          <form action={seDeconnecter}>
            <button
              type="submit"
              className="text-sm font-medium text-[#9A968D] hover:text-[#E0314B]"
            >
              {session.email} · Déconnexion
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
    </div>
  );
}
