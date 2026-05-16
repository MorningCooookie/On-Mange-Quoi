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

## Design System — Sources de vérité

Les valeurs concrètes (couleurs hex, noms de fonts, radius, scale d'espacement)
**ne sont pas dans ce fichier**. Elles évoluent et y être listées créerait de
la dérive entre ce qui est documenté et ce qui est en production.

| Source | Pour | Statut |
|---|---|---|
| `styles.css` `:root` (lignes ~26-180, ~200-260) | Tokens CSS en vigueur (couleurs, fonts, espacement, radius) | **Source de vérité technique** |
| `DESIGN.md` | Philosophie, rationale, décisions de design, scale typo | Référence éditoriale (peut décaler de la prod — vérifier la dernière mise à jour) |
| `<head>` des HTML | Fonts réellement chargées via Google Fonts | À cross-check avec `styles.css` |

### Règles invariantes (ne dépendent pas des valeurs)

1. **Jamais de hex hardcodé** dans `styles.css` ou inline HTML — toujours utiliser les variables CSS définies dans `:root`.
2. **Grille d'espacement 8px** — utiliser uniquement les tokens `--s-*` ou les multiples de 0.5rem.
3. **Contraste WCAG AA minimum** sur tout texte (4.5:1 normal, 3:1 large).
4. **Responsive obligatoire** : tester à 375px (mobile) et 1280px (desktop).
5. **Pas d'ajout de font ni de couleur principale** sans mettre à jour `DESIGN.md` et `styles.css` `:root` dans la même PR.

### Checklist avant livraison UI

1. Lire le `:root` de `styles.css` pour récupérer le token exact à utiliser
2. Si le composant existe déjà dans `DESIGN.md`, suivre la spec ; sinon, l'ajouter
3. Tester en mobile (375px) et en desktop (1280px)
4. Vérifier le contraste WCAG AA
5. Aucun hex hardcodé, aucun rem hors grille 8px

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
4. Vérifier visuellement dans le navigateur
5. S'assurer qu'aucun autre comportement n'est cassé

## Swarm (si tâches complexes multi-fichiers)

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
npx @claude-flow/cli@latest memory search --query "pattern"
```
Documentation : https://github.com/ruvnet/claude-flow
