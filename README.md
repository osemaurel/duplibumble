# duplibumble

Reproduction de la page d'accueil de **bumble.com/fr** en un seul fichier HTML autonome — réalisée comme démonstration technique de Claude Code.

## Contenu

- `index.html` — la page complète : HTML, CSS et JS inline, aucune dépendance externe.

## Fonctionnalités

- Header blanc sticky avec navigation, CTA jaune « Rejoignez Bumble » et menu mobile (burger)
- Hero photo pleine largeur « Faites le premier pas » avec séparateur festonné (scallop) signature
- Bandeau de statistiques sur fond jaune
- Trois tuiles photo : Bumble Date, BFF et Bizz
- Section « Comment ça marche » avec le principe des 24 h
- Carrousel de témoignages photo (auto-play + navigation manuelle)
- Section « Le Buzz » (blog) avec cartes d'articles
- Bandeau de téléchargement sombre avec badges App Store / Google Play (SVG)
- Footer clair avec colonnes de liens, réseaux sociaux et sélecteur de langue
- Typographie arrondie type Bumble (Poppins via Google Fonts)
- Photos lifestyle générées par IA (personnes fictives), servies depuis un CDN avec fallback dégradé
- Entièrement responsive (desktop, tablette, mobile)

## Utilisation

Ouvrir `index.html` dans un navigateur, ou :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Note

Reproduction non officielle réalisée à des fins de démonstration et d'apprentissage. Aucune affiliation avec Bumble Inc. Les visuels sont recréés en CSS/SVG et les textes réécrits ; aucun asset original n'est utilisé.
