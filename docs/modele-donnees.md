# Modèle de données Palab

Ce document fige le modèle avant la création du schéma Supabase. Il traduit la
réalité juridique du projet : **les femmes sont représentées par des agents
mandatés**, et c'est l'agent qui administre les profils et les conversations au
nom des femmes de son portefeuille.

## Les rôles

| Rôle | Qui | Ce qu'il fait |
|---|---|---|
| `member` | L'homme inscrit | Parcourt les profils, achète des crédits, écrit |
| `agent` | Le représentant légal d'un lot de femmes | Gère les fiches de ses femmes, reçoit et répond à tous leurs messages |
| `admin` | L'équipe Palab | Crée les agents, leur attribue les femmes, valide fiches et photos, modère |
| `lady` | La femme elle-même | Accès direct à sa fiche et à ses conversations — **prévu plus tard**, pas dans la première version |

L'agent n'usurpe pas l'identité de la femme : le mandat signé l'autorise à
échanger en son nom. Chaque message conserve donc deux informations
distinctes — la femme au nom de qui il part, et l'agent qui l'a écrit.

## Les tables

### `profiles`
Un enregistrement par compte authentifié, quel que soit le rôle. Clé étrangère
vers `auth.users`. Porte `role`, `display_name`, `locale`, `created_at`.

### `agents`
Le dossier du représentant : raison sociale, responsable, e-mail de connexion,
téléphone, pays, ville, langues de l'équipe, contrat cadre signé et sa date,
notes internes, `status` (`active` / `suspended`).

### `ladies`
La fiche d'une femme. `agent_id` référence son agent — c'est l'attribution que
l'administrateur fait depuis son interface, et elle est modifiable (un
portefeuille peut changer de main).

Champs **internes**, jamais exposés publiquement : nom légal, date de naissance,
nationalité, pays et ville de résidence, e-mail, téléphone, type et numéro de
pièce d'identité, mandat signé et sa date, consentement à la publication des
photos, notes.

Champs **publics** : prénom affiché, ville et pays affichés, langues et niveaux,
situation, enfants, profession, niveau d'études, taille, poids, yeux, cheveux,
religion, tabac, alcool, centres d'intérêt, type de relation recherchée, âge
recherché (min / max), disposition à déménager, accroche, présentation, texte
« ce que je recherche ».

L'âge affiché est calculé depuis la date de naissance, jamais saisi : il ne peut
donc pas se périmer.

`status` suit le cycle de vie : `draft` → `pending_review` → `published`, avec
`rejected` et `suspended` comme sorties possibles.

### `lady_photos`
Une ligne par photo : `lady_id`, chemin dans le Storage, `position` (1 = photo
principale), légende, `status` de modération. Les photos sont validées une par
une côté admin.

### `conversations`
Une conversation lie un `member_id` et un `lady_id`. Une seule par couple.

### `messages`
`conversation_id`, `sender_role` (`member` ou `lady`), `body`, pièces jointes,
`read_at`. Et surtout `authored_by` : l'agent qui a effectivement rédigé le
message quand `sender_role = 'lady'`. C'est la trace qui permet à
l'administration de savoir qui a écrit quoi, et de mesurer l'activité de chaque
agent.

### `credit_balances`, `credit_transactions`, `purchases`
Le solde du membre, le journal des débits (message envoyé, minute de vidéo,
cadeau) et les achats. Un débit référence toujours le message ou l'appel qui l'a
provoqué, pour que chaque ligne soit justifiable.

### `applications`
Les candidatures spontanées, si vous en ouvrez le dépôt. Dans le fonctionnement
décrit, l'entrée normale se fait par un agent, pas par une candidature directe.

### `reports`
Signalements émis par les membres, traités côté admin.

## Sécurité (RLS)

- Un membre ne lit que ses propres conversations et son propre solde.
- Un agent ne lit que les femmes dont il est le `agent_id`, et les conversations
  de ces femmes-là. Il ne voit rien du portefeuille d'un autre agent.
- L'admin voit tout.
- Les champs internes des `ladies` ne sont jamais servis à un membre : la
  galerie publique lit une vue qui n'expose que les colonnes publiques des fiches
  `published`.

## Collecte des dossiers

Le fichier `palab-dossier-collecte.xlsx` de ce dossier est le format d'entrée :
un onglet Agents, un onglet Femmes, un onglet Photos, et les listes de valeurs
autorisées. Ses colonnes correspondent une à une aux champs décrits ci-dessus,
ce qui rend l'import direct.

## À faire au moment des paiements

Les processeurs de paiement demandent que le fonctionnement par agents mandatés
soit décrit dans les conditions générales publiques. À prévoir avant de brancher
Stripe.
