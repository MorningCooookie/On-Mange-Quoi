# Plan — Corrections onmangequoi.eu
Date : 2026-04-05 | Branch : main

---

## Problèmes à corriger (par priorité)

### 🔴 Tâche 1 — Calcul dynamique de la date du menu (`app.js`)

**Problème :** La ligne `fetch('/data/menus/2026-03-30.json')` est hardcodée. Le menu ne changera jamais automatiquement.

**Fix :**
1. Écrire une fonction `getCurrentMenuMonday()` qui calcule le lundi de la semaine en cours
2. Remplacer le fetch hardcodé par `fetch(\`/data/menus/${getCurrentMenuMonday()}.json\`)`
3. Ajouter un fallback : si le fichier de la semaine courante n'existe pas (404), essayer la semaine précédente et afficher un bandeau "Prochain menu à venir"

```js
function getCurrentMenuMonday() {
  const d = new Date();
  const day = d.getDay(); // 0=dim, 1=lun, ...
  const diff = (day === 0 ? -6 : 1 - day); // recule au lundi
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10); // "2026-04-06"
}
```

**Fichier :** `app.js` (chercher `fetch('/data/menus/`)

---

### 🔴 Tâche 2 — Budget quick view affiche "—" (`app.js`)

**Problème :** `.budget-quick-view` n'est pas mis à jour quand le budget est calculé. Le panneau principal (144,25 €) est correct mais la toolbar courses affiche "—".

**Fix :**
1. Trouver la fonction `renderBudget()` ou équivalent dans app.js
2. Ajouter la mise à jour de `.budget-amount` (dans `.budget-quick-view`) au même endroit où `budget-total-amount` est mis à jour
3. Format : même valeur que `.budget-total-amount`

**Fichier :** `app.js` (chercher `budget-total-amount`)

---

### 🟠 Tâche 3 — Créer le menu de la semaine du 6 avril (`data/menus/`)

**Problème :** `data/menus/2026-04-06.json` n'existe pas. Dès dimanche soir/lundi matin, le site tombera en erreur si la tâche 1 est déployée.

**Fix :**
1. Créer `data/menus/2026-04-06.json` avec la même structure que `2026-03-30.json`
2. Mettre à jour `data/history.json` pour inclure la semaine du 30 mars comme entrée archivée

**Structure requise :**
```json
{
  "weekStart": "2026-04-06",
  "weekEnd": "2026-04-12",
  "healthScore": "A",
  "healthScoreHighlights": [...],
  "days": [...],
  "shoppingList": [...],
  "healthAlerts": [...]
}
```

**Fichiers :** `data/menus/2026-04-06.json` (nouveau), `data/history.json` (mise à jour)

---

### 🟠 Tâche 4 — Label "ENSEIGNE" dupliqué dans la toolbar (`index.html` + `styles.css`)

**Problème :** Le sélecteur d'enseigne dans la toolbar courses affiche "ENSEIGNE" deux fois l'un en dessous de l'autre.

**Fix :**
1. Inspecter le HTML de `.shopping-toolbar` pour trouver les deux occurrences de "ENSEIGNE"
2. Supprimer ou masquer le doublon (probablement un `.toolbar-section-label` redondant)

**Fichier :** `index.html` (chercher `ENSEIGNE`)

---

### 🟡 Tâche 5 — Feedback sur la page Recettes sans connexion (`recettes.html`)

**Problème :** Cliquer "Générer une recette" sans être connecté ne fait rien — pas de message d'erreur, pas de prompt de connexion.

**Fix :**
1. Dans le handler du bouton "Générer une recette", vérifier la session Supabase
2. Si pas de session : afficher un message inline "Connecte-toi pour générer une recette" avec lien vers la connexion
3. Ne pas bloquer le formulaire — juste un message sous le bouton

**Fichier :** `recettes.html` ou son script associé

---

### 🟡 Tâche 6 — Nettoyage du DOM (`index.html`)

**Problème :** Code mort dans le DOM — écran `#error-screen` (serveur local) et lien `table-saine-preview.html` cachés mais présents.

**Fix :**
1. Supprimer le bloc `#error-screen` de `index.html` — inutile sur le site live
2. Supprimer le lien vers `table-saine-preview.html` de l'écran d'erreur

**Fichier :** `index.html`

---

## Ordre d'exécution recommandé

1. **Tâche 1** (date dynamique) — critique, bloque le site dès lundi
2. **Tâche 3** (menu 6 avril) — à faire avant dimanche soir
3. **Tâche 2** (budget quick view) — bug UX visible
4. **Tâche 4** (label dupliqué) — cosmétique rapide
5. **Tâche 6** (nettoyage DOM) — cosmétique, 5 min
6. **Tâche 5** (feedback recettes) — amélioration UX

---

## Fichiers impactés

| Fichier | Tâches |
|---------|--------|
| `app.js` | 1, 2 |
| `data/menus/2026-04-06.json` | 3 (nouveau) |
| `data/history.json` | 3 |
| `index.html` | 4, 6 |
| `recettes.html` | 5 |
