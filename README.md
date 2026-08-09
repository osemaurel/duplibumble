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

## Déploiement

Déployé sur **Vercel**. Aucune variable d'environnement n'est requise à ce stade ; le framework est détecté automatiquement.

## Note

Maquette de démonstration : les profils affichés sont fictifs et les photos générées par IA. Ils seront remplacés par de véritables membres ayant donné leur consentement.
