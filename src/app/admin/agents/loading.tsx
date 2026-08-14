import { TableauFantome, TitreFantome } from "@/components/backoffice/squelette";

export default function Chargement() {
  return (
    <>
      <TitreFantome />
      <TableauFantome lignes={8} />
    </>
  );
}
