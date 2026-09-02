import "server-only";

import { Environment, Paddle } from "@paddle/paddle-node-sdk";

/**
 * Accès serveur à Paddle.
 *
 * `server-only` fait échouer la compilation si ce fichier venait à être tiré
 * dans un composant client : la clé d'API ne peut donc pas fuir vers le
 * navigateur. Le jeton public, lui, passe par `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
 * et n'ouvre rien d'autre que le tunnel de paiement.
 */

/** Bac à sable par défaut : passer en production doit être un geste délibéré. */
export function environnementPaddle() {
  return process.env.PADDLE_ENV === "production"
    ? Environment.production
    : Environment.sandbox;
}

export function paddleConfigure() {
  return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_WEBHOOK_SECRET);
}

export function clientPaddle() {
  const cle = process.env.PADDLE_API_KEY;
  if (!cle) throw new Error("PADDLE_API_KEY absente : le paiement n'est pas configuré.");
  return new Paddle(cle, { environment: environnementPaddle() });
}
