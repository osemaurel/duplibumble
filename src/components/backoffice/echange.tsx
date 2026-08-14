"use client";

import { createContext, useContext, useMemo, useOptimistic } from "react";

import type { MessageAffiche } from "./fil-messages";

/**
 * Partage l'état d'un envoi en cours entre le fil et la barre de saisie.
 *
 * Ces deux blocs sont voisins, pas imbriqués : sans ce point commun, la barre
 * de saisie n'aurait aucun moyen de faire apparaître le message dans le fil
 * avant que le serveur ait répondu. Or c'est précisément ce qu'on veut — le
 * message doit se poser à l'instant du clic, comme dans n'importe quelle
 * messagerie, et non deux secondes plus tard.
 *
 * `useOptimistic` se charge du retrait : React abandonne l'état optimiste dès
 * que l'action est terminée et que le rendu qui en découle est appliqué. À ce
 * moment-là le vrai message est déjà dans le fil, arrivé par l'abonnement.
 * Aucun nettoyage manuel, donc aucun risque de doublon qui s'installe.
 */
const VIDE: MessageAffiche[] = [];

type Contexte = {
  enAttente: MessageAffiche[];
  deposer: (message: MessageAffiche) => void;
};

const ContexteEchange = createContext<Contexte | null>(null);

export function useEchange() {
  return useContext(ContexteEchange);
}

export default function Echange({ children }: { children: React.ReactNode }) {
  const [enAttente, deposer] = useOptimistic<MessageAffiche[], MessageAffiche>(
    VIDE,
    (actuels, message) => [...actuels, message],
  );

  const valeur = useMemo(() => ({ enAttente, deposer }), [enAttente, deposer]);

  return <ContexteEchange.Provider value={valeur}>{children}</ContexteEchange.Provider>;
}
