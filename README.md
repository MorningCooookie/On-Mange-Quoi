# 🥗 On mange quoi ?

Site web statique familial — menus hebdomadaires sains avec liste de courses, budget par enseigne, score santé, mode frigo vide et fiche mémo partageable.

---

## Structure des fichiers

```
/
├── index.html              ← Page principale
├── fiche.html              ← Fiche mémo partageable (imprimable / Web Share API)
├── styles.css              ← Styles (mobile-first, pas de dépendances)
├── app.js                  ← Logique (Vanilla JS, fetch JSON)
├── data/
│   ├── config.json         ← Enseignes, profils, date de mise à jour des prix
│   ├── history.json        ← Historique des semaines
│   └── menus/
│       └── 2026-03-30.json ← Menu 7 jours × 4 repas
└── table-saine-preview.html ← Version standalone (sans serveur)
```

---

## Lancer en local

Ce site utilise `fetch()` pour charger les fichiers JSON — il requiert un serveur HTTP local :

```bash
# Python 3
cd /chemin/vers/le/dossier
python3 -m http.server 8000
# → http://localhost:8000

# Node.js (npx)
npx serve .
# → http://localhost:3000
```

> **Version sans serveur** : ouvrez `table-saine-preview.html` directement dans le navigateur — toutes les données sont embarquées.

---

## Déployer sur GitHub Pages

1. Créez un dépôt GitHub public
2. Poussez ce dossier à la racine
3. Dans les réglages du dépôt → *Pages* → Source : **main branch / root**
4. Votre site sera disponible sur `https://votre-pseudo.github.io/nom-du-repo/`

```bash
git init
git add .
git commit -m "Initial commit — On mange quoi ?"
git remote add origin https://github.com/VOTRE_PSEUDO/NOM_REPO.git
git push -u origin main
```

---

## Ajouter un nouveau menu

1. Créez `data/menus/YYYY-MM-DD.json` en suivant le format existant
2. Ajoutez une entrée dans `data/history.json` pointant vers ce fichier
3. Dans `app.js`, mettez à jour l'URL fetch dans `loadData()` :
   ```js
   fetch('data/menus/2026-04-06.json')
   ```

### Format d'un repas

```json
{
  "name": "Sardines grillées, haricots verts, riz basmati",
  "icon": "🥗",
  "riskLevel": "low",
  "riskType": null,
  "prepTime": "20",
  "isSeasonal": false,
  "note": "Sardines fraîches ou en boîte — faible teneur en mercure"
}
```

- `riskLevel` : `"low"` | `"medium"` | `"high"`
- `riskType` : `null` | `"cadmium"` | `"mercury"` | `"pesticides"` | `"elevage"`
- `prepTime` : durée en minutes (string)
- `isSeasonal` : badge 🌸☀️🍂❄️ affiché si `true`

### Score santé

| Score | Critères |
|-------|---------|
| **A** | 0 repas `high`, max 2 `medium`, diversité protéines, ≥ 1 légumineuse |
| **B** | 1–3 repas `medium`, rotation respectée |
| **C** | Repas `high` présents ou rotation non respectée |

---

## Modifier les prix

Éditez `data/config.json` → chaque item du menu JSON a `price_discount`, `price_standard`, `price_bio`.
Mettez à jour `pricesLastUpdated` au format `YYYY-MM-DD` — l'indicateur de fraîcheur s'affiche automatiquement.

---

## Mode Frigo vide

- Bouton **🧊 Frigo vide** dans la section courses
- Mode **OFF** : cases à cocher classiques (articles achetés)
- Mode **ON** : cochez les articles déjà dans votre frigo → soustraits du total en temps réel
- L'état est sauvegardé dans `localStorage` (clé `omq_fridge_items`)
- "Réinitialiser" efface toutes les cases frigo

---

## Fiche mémo partageable

`fiche.html` est une page autonome listant les aliments à limiter et à privilégier pour les 4 contaminants (cadmium, mercure, pesticides, élevage).

- **Imprimer** : `window.print()` → format A5 paysage, conçu pour être plastifié sur le frigo
- **Partager** : Web Share API natif (iOS, Android) — fallback copie du lien

---

## Imprimer le planning frigo

Bouton **🖨️ Coller sur le frigo** dans la section Score santé → impression A4 paysage avec les 7 jours × 4 repas en grandes colonnes lisibles à distance.

---

## Sources scientifiques

- [ANSES](https://www.anses.fr) — Agence nationale de sécurité sanitaire
- [EFSA](https://www.efsa.europa.eu) — Autorité européenne de sécurité des aliments
- [Générations Futures](https://www.generations-futures.fr) — Rapports pesticides
- [INRAE](https://inrae.fr) — Institut national de recherche pour l'agriculture
- [BLOOM](https://bloomassociation.org) — Association de protection des océans

---

## Licence

Usage personnel et familial. Données nutritionnelles à titre indicatif — consultez un professionnel de santé pour des besoins spécifiques.
