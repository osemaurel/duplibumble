# Palab

Plateforme de rencontres internationales : des hommes du monde entier échangent avec des femmes dont chaque profil est vérifié, un par un, par l'équipe Palab.

Ce dépôt contient l'application Next.js (App Router). L'étape en cours est la landing publique ; la base de données, les espaces membre / admin / agent arrivent ensuite.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (installé ; la landing utilise encore la feuille de styles portée depuis la maquette)
- Police **Outfit** auto-hébergée (`public/fonts/outfit.woff2`) — aucune dépendance externe au runtime
- Photos en **AVIF** servies depuis `public/profiles/`

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de production
npm run start    # sert le build
npm run lint
```

## Structure

```
src/
  app/
    layout.tsx          métadonnées, viewport, thème
    page.tsx            assemblage de la landing
    globals.css         feuille de styles complète (tokens, responsive, animations)
  components/site/
    header.tsx          en-tête collant + menu burger (< 900 px)
    hero-fan.tsx        carrousel en éventail (7 cartes desktop / 5 tablette / 3 mobile)
    gallery.tsx         filtres + grille de profils
    signup-modal.tsx    contexte d'inscription + modale
    signup-cta.tsx      bandeau d'appel à l'action final
    static-sections.tsx mission, vérification, communication, témoignage, footer
  lib/
    profiles.ts         données de démonstration (forme calquée sur la future table `ladies`)
public/
  fonts/, profiles/
legacy/
  index.html            maquette d'origine en un seul fichier, conservée comme référence
```

## Points d'attention

- **Mobile first** : aucun débordement horizontal à 390 / 768 / 1440 px ; le nombre de cartes de l'éventail s'adapte à la largeur.
- Le défilement automatique du hero se met en pause au survol et se désactive avec `prefers-reduced-motion`.
- `src/lib/profiles.ts` est volontairement typé comme la future table Supabase `ladies` : le passage aux données réelles se fera sans toucher aux composants.

## Base de données

Projet Supabase `palab` (référence `lwkhkhyqhkubtthmvfkx`, région `eu-west-3`). Le schéma vit
dans `supabase/migrations/`, en SQL numéroté et rejouable.

```bash
npx supabase link --project-ref lwkhkhyqhkubtthmvfkx
npx supabase db push        # applique les migrations en attente
npx supabase gen types typescript --project-id lwkhkhyqhkubtthmvfkx > src/lib/supabase/types.ts
```

Trois clients selon le contexte, dans `src/lib/supabase/` :

| Fichier | Usage | RLS |
|---|---|---|
| `client.ts` | navigateur | appliqué |
| `server.ts` | composants serveur, actions, route handlers | appliqué |
| `admin.ts` | webhooks, imports, tâches d'administration | **contourné** |

`admin.ts` importe `server-only` : toute tentative de l'utiliser depuis un composant client
casse la compilation, la clé de service ne peut donc pas fuir vers le navigateur.

Le modèle et les règles d'accès sont décrits dans `docs/modele-donnees.md`.

## Espaces

| Route | Accès | Contenu |
|---|---|---|
| `/` | public | landing et galerie |
| `/connexion` | public | authentification par e-mail et mot de passe |
| `/admin` | rôle `admin` | tableau de bord, femmes, agents, signalements |

`src/proxy.ts` rafraîchit la session à chaque requête et renvoie vers `/connexion` si un espace
privé est demandé sans session. Le rôle, lui, n'est jamais lu dans le jeton : `requireAdmin()`
le relit dans la table à chaque rendu, pour qu'une rétrogradation prenne effet immédiatement.

Les actions serveur commencent toutes par `requireAdmin()`. Ce n'est pas redondant avec le
RLS : la création d'un agent passe par la clé de service, qui l'ignore.

### Premier administrateur

Un compte ne peut pas se promouvoir lui-même — le trigger `profiles_guard_role` l'interdit.
Le premier administrateur se pose donc en SQL, depuis le SQL Editor de Supabase :

```sql
update public.profiles set role = 'admin'
 where id = (select id from auth.users where email = 'vous@exemple.com');
```

## Déploiement

Déployé sur **Vercel**. Copiez `.env.example` en `.env.local` pour le développement, et
reportez les mêmes variables dans Vercel pour la production.

## Note

Maquette de démonstration : les profils affichés sont fictifs et les photos générées par IA. Ils seront remplacés par de véritables membres ayant donné leur consentement.
