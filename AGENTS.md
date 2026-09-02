<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Intégration Paddle

Conventions à suivre pour tout code touchant au paiement.

### Documentation et SDK

- Vérifier la documentation courante via le serveur MCP `paddle-docs` **avant** de proposer du code. L'API et les SDK Paddle évoluent souvent : les connaissances d'entraînement ne suffisent pas.
- Ce projet est en Node/TypeScript : utiliser `@paddle/paddle-node-sdk`, et rien d'autre.

### Environnements

- Le développement se fait en bac à sable. Une clé de bac à sable contient `_sdbx` ; un jeton client de bac à sable commence par `test_`.
- Utiliser `paddle-sandbox` par défaut. N'appeler `paddle-live` que si la demande mentionne explicitement la production ou des données client réelles.
- Demander confirmation avant toute opération destructrice — modifier un prix, archiver un produit, annuler un abonnement — quel que soit l'environnement.
- Les clés d'API et les secrets de notification vivent dans les variables d'environnement. Jamais dans le dépôt, jamais en clair dans le code.

### Ce qui est propre à Palab

- **Les crédits sont des achats ponctuels, pas des abonnements.** Aucun code d'abonnement n'a de raison d'exister ici.
- **Le compte n'est crédité que par une notification vérifiée.** Jamais au retour du navigateur : cette adresse se fabrique, et un membre pourrait se créditer en la rejouant. Vérifier la signature avec `paddle.webhooks.unmarshal()` avant de lire quoi que ce soit de la charge utile.
- **Une notification peut arriver deux fois.** Le crédit doit être idempotent : rattacher le mouvement à l'identifiant de transaction Paddle et refuser un second passage sur le même identifiant.
- Les paliers vivent dans la table `paliers_credits`, prix TTC en centimes. L'identifiant de prix Paddle doit s'y rattacher — le montant ne se recopie pas dans le code.
- L'achat s'inscrit dans `purchases`, puis le crédit dans `credit_transactions` avec le motif `purchase`. C'est le déclencheur `apply_credit_transaction` qui reporte sur le solde ; ne jamais écrire `credit_balances` directement.
