import { GalerieFantome, TitreFantome } from "@/components/backoffice/squelette";

export default function Chargement() {
  return (
    <main className="bo-main" style={{ maxWidth: 1400, marginInline: "auto" }}>
      <TitreFantome />
      <GalerieFantome cartes={8} />
    </main>
  );
}
