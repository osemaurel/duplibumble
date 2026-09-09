import BarreOnglets from "@/components/membre/barre-onglets";
import EnteteMembre, { resumeMembre } from "@/components/membre/entete-membre";
import { requireMember } from "@/lib/auth";

import "../backoffice.css";

export const metadata = { title: "Mon espace | Palab" };

export default async function MembreLayout({ children }: { children: React.ReactNode }) {
  const session = await requireMember();
  const { nonLus } = await resumeMembre(session.userId);

  return (
    <div className="bo">
      <EnteteMembre membreId={session.userId} />

      <main className="bo-main mb-contenu" style={{ maxWidth: 1100, marginInline: "auto" }}>
        {children}
      </main>

      <BarreOnglets nonLus={nonLus} />
    </div>
  );
}
