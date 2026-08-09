# Modèle de données Palab

Ce document décrit le schéma tel qu'il est appliqué. Il traduit la
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

## État

Le schéma est appliqué sur le projet Supabase `palab` (`lwkhkhyqhkubtthmvfkx`, `eu-west-3`).
Les migrations sont dans `supabase/migrations/`, de `0001` à `0008`.

Le cloisonnement a été vérifié sur des données de test — deux agents concurrents, un membre,
un visiteur anonyme — puis ces données ont été supprimées. Les résultats figurent plus bas.

## Les tables

### `profiles`
Un enregistrement par compte authentifié, quel que soit le rôle. Clé étrangère
vers `auth.users`. Porte `role`, `display_name`, `locale`, `created_at`.

### `agents`
Le dossier du représentant : raison sociale, responsable, e-mail de connexion,
téléphone, pays, ville, langues de l'équipe, contrat cadre signé et sa date,
notes internes, `status` (`active` / `suspended`).

### `ladies`
La fiche publique d'une femme, et **rien d'autre** : prénom affiché, ville et
pays affichés, langues et niveaux, situation, enfants, profession, niveau
d'études, taille, poids, yeux, cheveux, religion, tabac, alcool, centres
d'intérêt, type de relation recherchée, âge recherché (min / max), disposition à
déménager, accroche, présentation, texte « ce que je recherche ».

`agent_id` référence son agent — c'est l'attribution que l'administrateur fait
depuis son interface, et elle est modifiable (un portefeuille peut changer de
main).

`status` suit le cycle de vie : `draft` → `pending_review` → `published`, avec
`rejected` et `suspended` comme sorties possibles.

### `lady_private`
Tout le confidentiel, dans une table à part liée une pour une : nom légal, date
de naissance, nationalité, pays et ville de résidence, e-mail, téléphone, type
et numéro de pièce d'identité, chemins des justificatifs, mandat signé et sa
date, consentement à la publication des photos, notes internes.

Cette séparation n'est pas cosmétique : elle permet d'ouvrir `ladies` en lecture
publique sans qu'aucune politique mal écrite ne puisse un jour laisser filtrer
une donnée d'identité. Ce qui n'est pas dans la table n'a pas à être filtré.

L'âge affiché vit dans `ladies`, mais n'est jamais saisi : un trigger le
recalcule depuis `lady_private.birth_date`. On affiche donc l'âge sans publier
la date de naissance, et il ne peut pas se périmer.

### `lady_photos`
Une ligne par photo : `lady_id`, chemin dans le Storage, `position` (1 = photo
principale), légende, `status` de modération. Les photos sont validées une par
une côté admin.

### `conversations`
Une conversation lie un `member_id` et un `lady_id`. Une seule par couple.

### `messages`
`conversation_id`, `sender` (`member` ou `lady`), `body`, pièce jointe,
`read_at`. Et surtout `authored_by_agent_id` : l'agent qui a effectivement
rédigé le message quand `sender = 'lady'`. C'est la trace qui permet à
l'administration de savoir qui a écrit quoi, et de mesurer l'activité de chaque
agent.

La règle d'auteur est vérifiée à l'insertion par un trigger, non par une
contrainte permanente. La différence compte : une contrainte permanente se
retourne contre nous le jour où un compte est supprimé, puisque la référence à
l'auteur passe alors à NULL et fait échouer la suppression — y compris une
demande légitime d'effacement. Un agent qui quitte la plateforme laisse donc ses
messages en place, simplement sans signature.

### `credit_balances`, `credit_transactions`, `purchases`
Le solde du membre, le journal des débits (message envoyé, minute de vidéo,
cadeau) et les achats. Un débit référence toujours le message ou l'appel qui l'a
provoqué, pour que chaque ligne soit justifiable.

### `reports`
Signalements émis par les membres, traités côté admin.

Il n'y a pas de table de candidatures spontanées : dans le fonctionnement
retenu, une femme entre par son agent, jamais en déposant un dossier elle-même.

## Sécurité (RLS)

- Un membre ne lit que ses propres conversations et son propre solde.
- Un agent ne lit que les femmes dont il est le `agent_id`, et les conversations
  de ces femmes-là. Il ne voit rien du portefeuille d'un autre agent.
- L'admin voit tout.
- Le public ne lit que les fiches `published` et les photos `approved` — et rien
  de `lady_private`, qui n'a aucune politique de lecture publique.

Certaines règles ne s'expriment pas en RLS, qui raisonne par ligne et non par
colonne. Elles sont posées en triggers : seule l'administration peut publier une
fiche, valider une photo, réattribuer un portefeuille ou changer un rôle. Un
agent peut faire passer sa fiche de `draft` à `pending_review`, pas au-delà.

## Collecte des dossiers

Le fichier `palab-dossier-collecte.xlsx` de ce dossier est le format d'entrée :
un onglet Agents, un onglet Femmes, un onglet Photos, et les listes de valeurs
autorisées. Ses colonnes correspondent une à une aux champs décrits ci-dessus,
ce qui rend l'import direct.

## À faire au moment des paiements

Les processeurs de paiement demandent que le fonctionnement par agents mandatés
soit décrit dans les conditions générales publiques. À prévoir avant de brancher
Stripe.

## Vérification du cloisonnement

Deux agents concurrents (A et B), un membre et un visiteur anonyme, sur un jeu de données
comportant deux fiches publiées, une fiche en brouillon et deux conversations.

**Lecture** — nombre de lignes visibles par acteur :

| | fiches | dossiers privés | conversations | messages | profils |
|---|---|---|---|---|---|
| agent A | 2 | **1** | **1** | **2** | 2 |
| agent B | 3 | **2** | **1** | **1** | 2 |
| membre | 2 | **0** | 2 | 3 | 1 |
| anonyme | 2 | **0** | **0** | **0** | **0** |

Chaque agent ne voit que ses propres dossiers privés et ses propres conversations. L'agent B
voit trois fiches parce que la troisième est son propre brouillon. Les deux fiches visibles
par tous sont les fiches publiées : c'est la galerie publique, elle est censée l'être.

**Écriture** — tentatives interdites :

| Tentative | Résultat |
|---|---|
| l'agent A écrit dans une conversation de l'agent B | refusée |
| l'agent A signe un message au nom de l'agent B | refusée |
| l'agent B publie lui-même une fiche | refusée |
| l'agent B s'attribue une femme de l'agent A | aucune ligne touchée |
| l'agent B modifie le dossier privé d'une femme de A | aucune ligne touchée |
| l'agent A réécrit un message d'une conversation de B | aucune ligne touchée |
| un membre se promeut administrateur | refusée |
| un membre se crée des crédits | refusée |
| un membre écrit dans sa propre conversation | autorisée (attendu) |
| l'agent A modifie la fiche de sa propre femme | autorisée (attendu) |

Sur une écriture, deux issues valent refus : l'erreur explicite, et l'absence de ligne
touchée — la ligne visée était simplement invisible pour son auteur. Une sonde qui n'attend
qu'une exception conclut à tort qu'une modification a réussi ; ces cas ont donc été
recomptés en lignes affectées.

## Audit Supabase

L'audit de sécurité intégré ne remonte aucune erreur. Restent quatre avertissements, comptés
deux fois chacun (rôle anonyme et rôle connecté) : les fonctions `is_admin`,
`current_agent_id`, `agent_owns_lady` et `can_access_conversation` sont appelables via l'API.
C'est volontaire — une politique RLS s'évalue avec les droits de celui qui interroge, leur
retirer ce droit bloquerait tout accès. Chacune ne répond que sur l'appelant lui-même et ne
révèle donc rien sur autrui.

Toutes les autres fonctions ont perdu leur droit d'exécution, y compris celui hérité de
`PUBLIC` — c'est ce dernier qui compte : révoquer sur `anon` et `authenticated` seuls laisse
la fonction appelable.
