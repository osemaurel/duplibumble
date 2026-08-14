import { ListeFantome, TitreFantome } from "@/components/backoffice/squelette";

export default function Chargement() {
  return (
    <>
      <TitreFantome />
      <ListeFantome lignes={7} />
    </>
  );
}
