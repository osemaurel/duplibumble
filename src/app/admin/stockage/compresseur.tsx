"use client";

import { useRef, useState } from "react";

import { compresserPhotos } from "../actions";

/**
 * Lance la recompression, lot après lot, jusqu'au bout.
 *
 * Un bouton par lot aurait demandé une quarantaine de clics. L'enchaînement
 * se fait donc ici, dans le navigateur : chaque appel traite une douzaine de
 * photos et rend la main, et c'est cette boucle qui redemande le suivant.
 * L'avantage sur une seule longue tâche serveur est qu'elle ne peut pas être
 * coupée en vol — au pire un lot échoue, les précédents sont acquis.
 *
 * Un onglet fermé au milieu n'abîme rien : ce qui est traité est inscrit en
 * base, et la reprise repart d'où l'on s'était arrêté.
 */

const Mo = (octets: number) => `${(octets / 1024 / 1024).toFixed(1)} Mo`;

export default function Compresseur({ restantesInitiales }: { restantesInitiales: number }) {
  const [enCours, setEnCours] = useState(false);
  const [restantes, setRestantes] = useState(restantesInitiales);
  const [traitees, setTraitees] = useState(0);
  const [avant, setAvant] = useState(0);
  const [apres, setApres] = useState(0);
  const [echecs, setEchecs] = useState<string[]>([]);
  const arret = useRef(false);

  async function lancer() {
    setEnCours(true);
    arret.current = false;
    setEchecs([]);

    while (!arret.current) {
      let lot;
      try {
        lot = await compresserPhotos();
      } catch (erreur) {
        setEchecs((liste) => [...liste, `Lot interrompu : ${(erreur as Error).message}`]);
        break;
      }

      setRestantes(lot.restantes);
      setTraitees((n) => n + lot.traitees);
      setAvant((n) => n + lot.octetsAvant);
      setApres((n) => n + lot.octetsApres);
      if (lot.echecs.length) setEchecs((liste) => [...liste, ...lot.echecs]);

      // Aucune photo traitée alors qu'il en reste : elles échouent toutes, et
      // insister ne ferait que tourner en rond.
      if (lot.restantes === 0 || lot.traitees === 0) break;
    }

    setEnCours(false);
  }

  const gagne = avant - apres;

  return (
    <div style={{ marginTop: "1.6rem" }}>
      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="bo-btn"
          onClick={() => void lancer()}
          disabled={enCours || restantes === 0}
        >
          {restantes === 0
            ? "Tout est à jour"
            : enCours
              ? `Traitement… ${restantes} restantes`
              : `Réduire les ${restantes} photos`}
        </button>

        {enCours && (
          <button
            type="button"
            className="bo-btn fantome"
            onClick={() => {
              arret.current = true;
            }}
          >
            Arrêter après ce lot
          </button>
        )}
      </div>

      {traitees > 0 && (
        <p className="bo-message succes" style={{ marginTop: "1rem" }}>
          {traitees} photo{traitees > 1 ? "s" : ""} traitée{traitees > 1 ? "s" : ""} —{" "}
          {Mo(avant)} ramenés à {Mo(apres)}, soit {Mo(gagne)} libérés
          {avant > 0 && ` (${Math.round((gagne / avant) * 100)} %)`}.
          {restantes > 0 && ` Il en reste ${restantes}.`}
        </p>
      )}

      {echecs.length > 0 && (
        <div className="bo-message erreur" style={{ marginTop: "1rem" }}>
          <b>
            {echecs.length} photo{echecs.length > 1 ? "s" : ""} non traitée
            {echecs.length > 1 ? "s" : ""} :
          </b>
          <ul style={{ marginTop: "0.5rem", paddingLeft: "1.1rem" }}>
            {echecs.slice(0, 10).map((echec) => (
              <li key={echec}>{echec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
