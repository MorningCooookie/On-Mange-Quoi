# Claude Code Configuration — TableSaine / onmangequoi.eu

## Règles fondamentales

- Faire exactement ce qui est demandé — rien de plus, rien de moins
- NEVER create files unless absolutely necessary — always prefer editing an existing file
- NEVER create documentation (*.md) or README files unless explicitly requested
- NEVER save working files or tests to the root folder
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- Pas d'over-engineering — toujours la solution la plus simple qui fonctionne
- Ne pas ajouter de gestion d'erreur pour des scénarios qui n'arrivent pas

## Organisation des fichiers

- Root : `index.html`, `app.js`, `styles.css`, `auth.js`, `profiles.js`, `preferences.js`, `recettes.html`, `fiche.html`
- `data/` — fichiers JSON (config, history)
- `data/menus/` — un fichier par semaine au format `YYYY-MM-DD.json` (lundi de la semaine)
- `docs/` — documentation et markdown uniquement
- NEVER save anything else to the root folder

## Design System — Règles strictes

**Référence :** `DESIGN.md` — toujours consulter avant toute modification UI.

### Palette de couleurs (ne jamais hardcoder les hex)
- `--color-primary` : Forest Green `#2D7A3C`
- `--color-secondary` : Warm Coral `#E07A5F`
- `--color-background` : Cream `#FAFAF9`
- `--color-text` : Dark Gray `#1F1F1F`

### Typographie
- Lexend : titres et display
- DM Sans : corps de texte
- IBM Plex Mono : données chiffrées (prix, scores)
- Pas de substitution sans revue design

### Espacement et composants
- Grille 8px — utiliser `1rem`, `1.5rem`, `2rem`, `3rem`, `4rem` uniquement
- Border radius boutons : 12px systématiquement
- Hover sur desktop : `translateY(-2px)` + shadow
- Dark mode obligatoire — utiliser les CSS variables de `:root`

### Checklist UI avant livraison
1. Consulter `DESIGN.md` pour le composant concerné
2. CSS variables partout — jamais de hex hardcodé
3. Tester en light ET dark mode
4. Valider contraste WCAG AA minimum
5. Vérifier le responsive sur mobile (375px) et desktop (1280px)
6. Ajouter tout nouveau composant dans `DESIGN.md`

## Architecture

- Vanilla HTML/CSS/JS — pas de framework, pas de build step
- Fichiers sous 500 lignes — découper si nécessaire
- Pas de dépendances npm inutiles
- Validation des inputs aux frontières (formulaires, fetch, localStorage)
- Données : fichiers JSON statiques dans `data/` chargés via `fetch()`

### Structure d'un fichier menu (`data/menus/YYYY-MM-DD.json`)
```json
{
  "weekStart": "YYYY-MM-DD",
  "weekEnd": "YYYY-MM-DD",
  "healthScore": "A",
  "healthScoreHighlights": ["..."],
  "days": [{ "name": "Lundi", "meals": [...] }],
  "shoppingList": [{ "category": "...", "items": [...] }],
  "healthAlerts": []
}
```

## Sécurité

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit `.env` files or any file containing secrets
- Always validate user input at system boundaries
- Always sanitize file paths to prevent directory traversal

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Vanilla JS, HTML5, CSS3 |
| Auth & DB | Supabase (CDN client) |
| Paiement | Stripe.js v3 |
| Analytics | Plausible |
| Déploiement | Netlify static — pas de build step |
| Données | JSON statiques dans `data/` |

## Concurrence — bonne pratique

- Grouper les opérations indépendantes dans un seul message (reads, writes, bash)
- Utiliser les agents en parallèle quand les tâches sont indépendantes

## Décisions design

Toutes les décisions design sont loggées dans `DESIGN.md` sous "Design Decisions Log".
Rationale et trade-offs documentés là-bas.

## Anti-patterns à éviter

- Ne pas utiliser `innerHTML` pour insérer du contenu utilisateur non échappé
- Ne pas accumuler des event listeners sans les nettoyer
- Ne pas faire des `fetch()` successifs qui pourraient être parallèles
- Ne pas dupliquer la logique de rendu — si `renderX()` existe, l'utiliser
- Ne pas laisser des `console.log` de debug dans le code livré
- Ne pas introduire de magic numbers — utiliser les CSS variables et les constantes nommées

## Workflow pour chaque fix

1. Lire le fichier concerné avant de toucher quoi que ce soit
2. Identifier la cause racine — ne pas patcher le symptôme
3. Faire le changement minimal qui résout le problème
4. Vérifier visuellement dans le navigateur (light + dark si UI)
5. S'assurer qu'aucun autre comportement n'est cassé

## Swarm (si tâches complexes multi-fichiers)

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
npx @claude-flow/cli@latest memory search --query "pattern"
```
Documentation : https://github.com/ruvnet/claude-flow
