# Prompt Claude Code — Corrections design + mobile + UX
> À coller dans Claude Code sur le projet existant onmangequoiii.netlify.app
> Version : mars 2026 — redesign visuel + fixes mobile + refonte UX

---

## CONTEXTE

Le site "On mange quoi ?" existe déjà et fonctionne. Ce prompt applique un ensemble de corrections groupées en 3 axes : redesign visuel, fixes mobile, et ajustements UX. Ne pas repartir de zéro — modifier les fichiers existants (`index.html`, `styles.css`, `app.js`) et créer un nouveau fichier `semaine.html`.

---

## AXE 1 — REDESIGN VISUEL

### 1.1 Typographie — remplacer system-ui par Fraunces + Work Sans

Dans `index.html` (et `fiche.html`), ajouter dans le `<head>` :

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

Dans `styles.css`, mettre à jour les variables de police :

```css
:root {
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Work Sans', system-ui, sans-serif;
}
```

Appliquer `font-family: var(--font-display)` sur :
- Le logo/titre "On mange quoi ?" dans le header
- Tous les titres de section (`h2`)
- Les noms de jours dans les cartes (`.day-name`)
- Les chiffres du budget (`.budget-total`, `.stat-val`)
- Le score santé (lettre A/B/C)

Appliquer `font-family: var(--font-body)` sur tout le reste (body, nav, badges, boutons, liste de courses).

---

### 1.2 Score santé — supprimer le bloc hero, intégrer en badge inline

**Supprimer entièrement** la section score santé qui occupe un bloc dédié en haut de page.

**Remplacer** par un badge pill compact intégré dans le header de section "Menu de la semaine", sur la même ligne que le titre et la date :

```html
<div class="section-header">
  <div class="section-header__left">
    <h2 class="section-title">Menu de la semaine</h2>
    <span class="section-date">30 mars – 5 avril 2026</span>
    <span class="score-badge score-badge--a">
      <span class="score-badge__letter">A</span>
      Score santé
    </span>
  </div>
  <button class="btn-semaine" id="btn-vue-semaine">Partager le menu</button>
</div>

<div class="score-highlights" id="score-highlights">
  <!-- généré par app.js depuis healthScoreHighlights -->
</div>
```

CSS pour le badge :

```css
.score-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.65rem 0.2rem 0.4rem;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 600;
  vertical-align: middle;
  position: relative;
  top: -1px;
}

.score-badge--a { background: #1B4332; color: #fff; }
.score-badge--b { background: #1E3A5F; color: #fff; }
.score-badge--c { background: #92400E; color: #fff; }

.score-badge__letter {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: #52B788;
  line-height: 1;
}

.score-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
}

.score-highlight-chip {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6B6560;
  padding: 0.2rem 0.65rem;
  background: #F0EAE0;
  border-radius: 999px;
}

.score-highlight-chip::before {
  content: '✓ ';
  color: #52B788;
  font-weight: 700;
}
```

Dans `app.js`, adapter `renderHealthScore()` pour écrire dans ces nouveaux éléments au lieu de l'ancien bloc hero.

---

### 1.3 Supprimer "Faites un screenshot pour partager"

Retirer complètement ce texte/élément du DOM et du JS. Ne pas le remplacer.

---

### 1.4 Header — boutons profil en pills textuelles

Remplacer les boutons profil (emoji-only) par des pills avec label court :

```html
<button class="profile-pill" data-profile="famille_jeunes_enfants">Famille</button>
<button class="profile-pill" data-profile="famille_ados">Ados</button>
<button class="profile-pill" data-profile="couple">Couple</button>
<button class="profile-pill" data-profile="solo">Solo</button>
```

CSS :

```css
.profile-pill {
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  border: 1.5px solid rgba(255,255,255,0.25);
  background: transparent;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: all 150ms;
}

.profile-pill:hover {
  border-color: rgba(255,255,255,0.6);
  color: #fff;
}

.profile-pill.is-active {
  background: #fff;
  color: #1B4332;
  border-color: transparent;
}
```

Même traitement sur le bottom bar mobile — remplacer les emojis par le même label texte + une icône optionnelle au-dessus (petite, 18px).

---

### 1.5 Noms des jours en Fraunces

Dans `.day-header`, le nom du jour doit utiliser `var(--font-display)` avec `font-weight: 600`. Légère amélioration visuelle, pas de changement de structure.

---

### 1.6 Conteneur centré avec max-width

Envelopper tout le contenu principal dans un conteneur à largeur maximale :

```css
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}
```

Appliquer cette classe au `<main>` ou au wrapper principal dans le DOM.

---

## AXE 2 — FIXES MOBILE

### 2.1 Atterrissage toujours en haut de page

En tout début de `app.js`, avant toute autre logique :

```js
if (window.location.hash) {
  history.replaceState(null, null, ' ');
}
window.scrollTo(0, 0);
```

---

### 2.2 Bottom bar mobile — labels lisibles

Sur mobile (`max-width: 639px`), les boutons profil du bottom bar affichent actuellement des emojis incompréhensibles. Les remplacer par :

```html
<button class="bottom-profile-btn" data-profile="famille_jeunes_enfants">
  <span class="bottom-profile-icon">👨‍👩‍👧‍👦</span>
  <span class="bottom-profile-label">Famille</span>
</button>
<button class="bottom-profile-btn" data-profile="famille_ados">
  <span class="bottom-profile-icon">🧑‍🤝‍🧑</span>
  <span class="bottom-profile-label">Ados</span>
</button>
<button class="bottom-profile-btn" data-profile="couple">
  <span class="bottom-profile-icon">👫</span>
  <span class="bottom-profile-label">Couple</span>
</button>
<button class="bottom-profile-btn" data-profile="solo">
  <span class="bottom-profile-icon">🧑</span>
  <span class="bottom-profile-label">Solo</span>
</button>
```

CSS :

```css
.bottom-profile-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  border: 1.5px solid transparent;
  background: transparent;
  cursor: pointer;
  min-width: 60px;
  min-height: 52px;
}

.bottom-profile-icon { font-size: 18px; line-height: 1; }

.bottom-profile-label {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
}

.bottom-profile-btn.is-active {
  background: rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.3);
}

.bottom-profile-btn.is-active .bottom-profile-label {
  color: #fff;
}
```

---

### 2.3 Hint de swipe sur la grille des jours

Ajouter une ligne discrète sous le header de section, visible uniquement sur mobile :

```html
<p class="swipe-hint" aria-hidden="true">← Glisse pour voir les 7 jours →</p>
```

```css
.swipe-hint {
  display: none;
  font-size: 0.72rem;
  color: #9E9891;
  text-align: center;
  margin-bottom: 0.75rem;
}

@media (max-width: 639px) {
  .swipe-hint { display: block; }
}
```

Masquer après le premier scroll horizontal (JS) :

```js
document.querySelector('.week-grid')?.addEventListener('scroll', () => {
  const hint = document.querySelector('.swipe-hint');
  if (hint) hint.style.display = 'none';
}, { once: true });
```

---

### 2.4 Budget Solo — masquer la ligne "par personne" redondante

Quand le profil Solo est actif (`persons === 1`), masquer l'élément `.stat--per-person` dans le panneau budget (puisque "par personne" = le total, l'info est inutile).

```js
document.querySelector('.stat--per-person').style.display =
  profile.persons === 1 ? 'none' : '';
```

---

### 2.5 Padding bas de page sur mobile

```css
@media (max-width: 639px) {
  main, .app-container {
    padding-bottom: 160px; /* espace pour bottom bar */
  }
}
```

---

## AXE 3 — NOUVELLE PAGE "VUE SEMAINE" (semaine.html)

### 3.1 Créer le fichier semaine.html

Page HTML autonome. Accessible via `semaine.html?week=2026-03-30`. Lue depuis le même JSON menu que `index.html`.

**Objectif :** une vue épurée du menu de la semaine, pensée pour être screenshottée et partagée par WhatsApp, SMS ou Instagram. Pas de budget, pas d'alertes — juste les repas.

**Structure de la page :**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Menu — On mange quoi ?</title>
  <!-- mêmes fonts Fraunces + Work Sans -->
  <link rel="stylesheet" href="semaine.css">
</head>
<body>
  <header class="semaine-header">
    <span class="semaine-logo">On mange quoi ?</span>
    <span class="semaine-score" id="semaine-score"><!-- score A/B/C --></span>
  </header>

  <div class="semaine-date" id="semaine-date"><!-- semaine du XX au XX --></div>

  <div class="semaine-grid" id="semaine-grid">
    <!-- 7 cartes générées par JS -->
  </div>

  <footer class="semaine-footer">
    onmangequoiii.netlify.app · Menu complet, liste de courses et budget sur le site
  </footer>

  <div class="semaine-actions">
    <button onclick="window.history.back()">← Retour</button>
    <button onclick="navigator.share ? navigator.share({url: location.href}) : navigator.clipboard.writeText(location.href)">
      Partager ce lien
    </button>
  </div>

  <script src="semaine.js"></script>
</body>
</html>
```

**Design de semaine.css :**
- Fond blanc `#FFFFFF`
- Padding généreux, centré, `max-width: 480px` (pensé pour mobile en premier)
- Chaque carte de jour : fond `#FAF7F2`, border-radius 10px, padding 12px
- En-tête de carte : jour en Fraunces 1rem bold, fond `#1B4332`, couleur blanche
- Chaque repas : une ligne — icône repas + nom du repas en 0.85rem
- Séparateur léger entre repas
- Aucun badge de prix, aucune alerte, aucun temps de préparation
- Le footer avec l'URL du site en 0.7rem gris clair

**Logique de semaine.js :**
- Lire le paramètre `?week=` dans l'URL
- Si absent, charger `history.json` pour trouver la semaine la plus récente
- Fetcher `data/menus/YYYY-MM-DD.json`
- Générer les 7 cartes de jours dans `#semaine-grid`
- Afficher le score dans `#semaine-score` et la date dans `#semaine-date`

---

### 3.2 Connecter le bouton "Partager le menu" dans index.html

Dans `app.js`, le bouton `#btn-vue-semaine` doit ouvrir `semaine.html?week=YYYY-MM-DD` dans un nouvel onglet :

```js
document.getElementById('btn-vue-semaine')?.addEventListener('click', () => {
  const week = currentMenuData?.weekStart || '';
  window.open(`semaine.html?week=${week}`, '_blank');
});
```

---

## CRITÈRES DE VALIDATION

- Les fonts Fraunces et Work Sans chargent correctement (vérifier en coupant le réseau → doit fallback proprement sur Georgia/system-ui)
- Le score santé n'est plus un bloc — il est inline dans le titre de section
- Les boutons profil affichent un texte lisible sur desktop ET mobile
- En mobile, l'URL avec `#hash` scrolle bien en haut au chargement
- `semaine.html` s'ouvre, charge le menu du JSON, affiche les 7 jours proprement
- Le bouton "Partager ce lien" fonctionne (Web Share API sur mobile, clipboard sur desktop)
- Aucune régression sur les features existantes (frigo vide, budget, historique, fiche mémo)
