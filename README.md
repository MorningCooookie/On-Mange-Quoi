# Table Saine 🥗

Site web statique familial affichant des menus hebdomadaires anti-cadmium avec liste de courses et budget par enseigne.

---

## Lancer le site en local

Le site utilise `fetch()` pour charger les fichiers JSON, ce qui nécessite un serveur HTTP (même minimal) :

```bash
# Python 3
python3 -m http.server 8080

# Node.js (si installé)
npx serve .

# PHP
php -S localhost:8080
```

Puis ouvrir `http://localhost:8080` dans le navigateur.

> **Attention :** ouvrir `index.html` directement via `file://` bloque les requêtes fetch sur certains navigateurs (Chrome notamment). Firefox l'autorise souvent.

---

## Déployer sur GitHub Pages

1. Créer un dépôt GitHub (ex. `table-saine`)
2. Pousser tous les fichiers à la racine du dépôt
3. Dans les Settings du dépôt → Pages → Source : `main` / `root`
4. Le site sera disponible sur `https://votre-pseudo.github.io/table-saine/`

---

## Ajouter un nouveau menu

### 1. Créer le fichier JSON du menu

Dupliquer `data/menus/2026-03-30.json` et le renommer avec la date du lundi de la semaine :

```
data/menus/2026-04-06.json
```

Modifier les champs :
- `weekStart` et `weekEnd`
- `days[]` : 7 jours × 4 repas
- `shoppingList[]` : items par catégorie avec prix
- `cadmiumAlerts.news[]` : actualités de la semaine

### 2. Mettre à jour history.json

Ajouter une entrée **en tête de liste** dans `data/history.json` :

```json
{
  "weekStart": "2026-04-06",
  "weekEnd": "2026-04-12",
  "file": "data/menus/2026-04-06.json",
  "label": "Semaine du 6 avril 2026",
  "highlights": [
    "Plat vedette 1",
    "Plat vedette 2",
    "Plat vedette 3"
  ]
}
```

Le site charge automatiquement le premier menu de la liste comme menu en cours.

---

## Structure des données

### `data/config.json`

Contient deux objets :

- **`stores`** : les 3 types d'enseignes (discount, standard, bio) avec leur multiplicateur de prix
- **`profiles`** : les 4 profils familiaux avec leur multiplicateur de quantité

### `data/menus/YYYY-MM-DD.json`

Structure d'un menu hebdomadaire :

```json
{
  "weekStart": "YYYY-MM-DD",
  "weekEnd": "YYYY-MM-DD",
  "profile": "famille_jeunes_enfants",
  "days": [ /* 7 jours */ ],
  "shoppingList": [ /* catégories */ ],
  "cadmiumAlerts": { "news": [] }
}
```

#### Niveaux de risque cadmium (`cadmiumRisk`)

| Valeur | Couleur | Exemples |
|--------|---------|----------|
| `low` | Vert | Fruits, légumes frais, viandes blanches, poissons blancs |
| `medium` | Jaune | Chocolat noir, céréales complètes artisanales |
| `high` | Rouge | Abats, crustacés, céréales industrielles |

#### Prix dans `shoppingList`

Chaque item doit avoir 3 prix de base (pour 4 personnes, profil famille) :

```json
{
  "name": "Haricots verts",
  "qty": "500g",
  "price_discount": 1.20,
  "price_standard": 1.60,
  "price_bio": 2.80
}
```

L'app applique automatiquement le multiplicateur de profil (0.32 pour solo, 0.6 pour couple, 1.0 pour famille enfants, 1.15 pour famille ados).

---

## Modifier les prix de référence

Éditer `data/config.json` → section `stores` → ajuster les `multiplier` si les écarts de prix entre enseignes changent.

Pour ajuster les prix de base des articles, éditer directement les fichiers JSON de menus (`price_discount`, `price_standard`, `price_bio`).

---

## Règles anti-cadmium appliquées aux menus

- **Max 2×** pâtes industrielles par semaine
- **Max 3-4×** pommes de terre
- **Légumineuses 4-5×/semaine** (lentilles, pois chiches, haricots)
- **Poisson 2-3×/semaine** (poissons blancs préférés)
- **Pas de céréales industrielles** au petit-déjeuner (flocons d'avoine nature OK)
- **Fruit frais** au goûter chaque jour
- **Chocolat noir** : occasionnel (teneur en cadmium modérée)

Sources : ANSES, EFSA, INRAE.
