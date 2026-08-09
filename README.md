# duplibumble → Palab

Landing page d'une appli de rencontres fictive, **Palab**, en un seul fichier HTML autonome — réalisée comme démonstration technique de Claude Code. La mise en page s'inspire du design 2026 de bumble.com/fr, rebrandée avec un nom propre et une palette rouge passion.

## Contenu

- `index.html` — la page complète : HTML, CSS et JS inline.

## Fonctionnalités

- Header flottant : wordmark « Palab », navigation en pilule blanche centrée, sélecteur de langue, bouton « Se connecter »
- Hero rouge avec wordmark géant traversé par des cartes de profils qui se chevauchent
- Section mission avec collage photo et étiquettes verticales
- Carte « Member Circle » avec tampon circulaire animé en rotation
- Doubles cartes Palab Date / BFF avec mockups d'app et badges « ID verified »
- Témoignage en noir et blanc
- Bandeau de téléchargement et footer clair
- Typo Outfit (Google Fonts), palette rouge amour (#E0314B)
- Photos lifestyle générées par IA (personnes fictives), servies depuis un CDN avec fallback dégradé
- Entièrement responsive

## Utilisation

Ouvrir `index.html` dans un navigateur **connecté à internet** (photos CDN + police Google Fonts), ou :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Note

Site fictif de démonstration. Les photos sont générées par IA — les personnes n'existent pas.
