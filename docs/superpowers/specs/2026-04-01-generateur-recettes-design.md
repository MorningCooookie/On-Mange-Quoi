# Spec : Générateur de recettes — TableSaine
Date : 2026-04-01

## Objectif
Intégrer un générateur de recettes IA dans TableSaine, accessible depuis un bouton dédié dans la navigation. Le générateur respecte toutes les contraintes santé du site (anti-cadmium, mercure, pesticides, élevage) et propose deux modes : Thermomix et cuisine classique.

## Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `recettes.html` | Nouveau — page générateur |
| `netlify/functions/generate-recipe.js` | Nouveau — proxy Claude API |
| `netlify.toml` | Nouveau — config Netlify Functions |
| `package.json` | Nouveau — dépendance @anthropic-ai/sdk |
| `index.html` | Modifié — ajout lien nav desktop + mobile |

## Page `recettes.html`

Même header/footer que `index.html`. Contenu :
1. **Textarea** — "J'ai dans mon frigo…" (l'utilisateur liste les ingrédients)
2. **Toggle mode** — Thermomix / Cuisine classique (pill buttons)
3. **Toggle profil** — Famille / Couple / Solo (reprend `config.json`)
4. **Bouton** — "Générer une recette" → appel `/.netlify/functions/generate-recipe`
5. **Zone résultat** — carte avec ingrédients + étapes + astuce famille

## Netlify Function `generate-recipe.js`

- Méthode POST, body `{ ingredients, mode, profile }`
- Clé API via `process.env.ANTHROPIC_API_KEY` — à ajouter dans les variables d'env du **site Netlify TableSaine** (Site settings → Environment variables), séparément du projet Thermomix
- Modèle : `claude-haiku-4-5-20251001` (rapide, peu coûteux)
- Deux system prompts selon `mode` :
  - **thermomix** : temp °C / vitesse / durée à chaque étape
  - **classique** : cuisson standard, même structure

## Contraintes communes aux deux prompts

- Famille Jordan O'Shea : 4 personnes (2 adultes + 2 enfants), sans porc, pas épicé
- Couple : 2 adultes, idem sans porc/épicé
- Solo : 1 personne, idem
- Anti-cadmium : limiter pommes de terre, pain blanc, céréales industrielles
- Anti-mercure : pas de thon, max 2× saumon/mois
- Pesticides : fruits bio recommandés (fraises, raisins, pêches)
- Privilégier légumineuses, poissons blancs, volaille, légumes colorés

## Format de sortie attendu

```
### 🍽️ [Nom du plat]
*Pour X personnes · Y min · [Thermomix / Cuisine classique]*

**Ingrédients**
- ...

**Préparation**
1. ...  [→ temp/vitesse/durée si Thermomix]

**💡 Astuce famille** : ...
```

## Intégration navigation

- Nav desktop (`index.html`) : lien `🍳 Recettes` après `Fiche mémo`
- Barre mobile : icône `🍳 Recettes` en 5e position
