import { Barre } from "@/components/backoffice/squelette";

export default function Chargement() {
  return (
    <main className="bo-main" style={{ maxWidth: 1200, marginInline: "auto" }}>
      <div className="mb-profil-detail" aria-hidden="true" style={{ marginTop: "1.4rem" }}>
        <div>
          <span className="bo-sq" style={{ width: "100%", aspectRatio: "3 / 4", height: "auto", borderRadius: "var(--r-lg)" }} />
        </div>
        <div className="bo-sq-titre">
          <Barre largeur="12rem" hauteur="1.9rem" />
          <Barre largeur="8rem" hauteur="0.95rem" />
          <Barre largeur="100%" hauteur="0.9rem" />
          <Barre largeur="92%" hauteur="0.9rem" />
          <Barre largeur="70%" hauteur="0.9rem" />
          <Barre largeur="11rem" hauteur="2.6rem" />
        </div>
      </div>
    </main>
  );
}
