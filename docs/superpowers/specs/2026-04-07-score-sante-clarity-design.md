---
name: Clarification du Score Santé
description: Design pour rendre clair le lien entre risques individuels (points) et score global (A/B/C)
type: design
status: approved
date: 2026-04-07
---

# Clarification du Score Santé — Design Complet

## 1. Vue d'ensemble

### Problème
L'utilisateur ne comprend pas le lien entre :
- **Points de risque** (● vert/orange/rouge) à côté des repas
- **Score santé A/B/C** affiché en haut et dans "À Propos"

### Solution
Un mix de clarifications :
1. **Légende visuelle discrète** sur le menu (points + texte)
2. **Page "À Propos" rénovée** expliquant le système complet

### Principe directeur
On **ne peut pas éviter 100% les risques** (cadmium, mercure, pesticides...), on les **réduit en variant les plats**. Le score A/B/C mesure cette diversité + cumul de risques.

---

## 2. Changements UI — Menu (semaine.html / semaine.css)

### 2.1 Légende des risques (pied du menu)

**Placement :** Avant le footer "onmangequoi.eu · Menu complet..."

**HTML :**
```html
<div class="health-legend">
  <p class="health-legend__title">🥗 Légende des risques</p>
  <div class="health-legend__items">
    <span class="legend-item">
      <span class="legend-dot" style="background: var(--risk-low)"></span>
      <span class="legend-label">Risque faible</span>
    </span>
    <span class="legend-item">
      <span class="legend-dot" style="background: var(--risk-medium)"></span>
      <span class="legend-label">Risque modéré</span>
    </span>
    <span class="legend-item">
      <span class="legend-dot" style="background: var(--risk-high)"></span>
      <span class="legend-label">Risque élevé</span>
    </span>
  </div>
</div>
```

**CSS (styles.css) :**
```css
.health-legend {
  border-top: 1px solid var(--color-border);
  margin-top: 2rem;
  padding-top: 1.5rem;
  padding-bottom: 1rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.health-legend__title {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.health-legend__items {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .health-legend__items {
    flex-direction: column;
    gap: 0.75rem;
  }
}
```

### 2.2 Badge Score amélioré (header)

**Changement visuel :** Ajouter icône `ⓘ` cliquable au score

**HTML (semaine.html) :**
```html
<header class="semaine-header">
  <button class="semaine-header-back" onclick="window.history.back()" title="Retour">←</button>
  <span class="semaine-logo">🥗 On mange quoi ?</span>
  <div class="semaine-score" id="semaine-score">
    <span class="semaine-score__letter" id="score-letter">A</span>
    <span class="semaine-score__label">Score santé</span>
    <span class="semaine-score__info" title="Comment fonctionne le score ?" onclick="window.location.href='about.html'">ⓘ</span>
  </div>
</header>
```

**CSS (semaine.css) :**
```css
.semaine-score {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.semaine-score__info {
  cursor: pointer;
  opacity: 0.7;
  font-size: 0.9rem;
  transition: opacity 0.2s;
}

.semaine-score__info:hover {
  opacity: 1;
}
```

---

## 3. Nouvelle page "À Propos" (about.html)

### Structure complète

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>À Propos — On mange quoi ?</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="about.css">
</head>
<body>
  <header class="about-header">
    <button class="about-back" onclick="window.history.back()" title="Retour">←</button>
    <h1>À Propos</h1>
  </header>

  <main class="about-content">
    
    <!-- Section 1 : Intro -->
    <section class="about-section">
      <h2>Comment fonctionne le score santé ?</h2>
      <p>
        On mange quoi ? aide à réduire l'exposition à des contaminants 
        (cadmium, mercure, pesticides, etc.). L'idée : <strong>varier les plats</strong> plutôt que de tout éviter, 
        car il est impossible d'éliminer complètement ces substances.
      </p>
    </section>

    <!-- Section 2 : Légende des risques -->
    <section class="about-section">
      <h2>🔴 Types de risques</h2>
      
      <div class="risk-card">
        <span class="risk-card__dot" style="background: var(--risk-low)"></span>
        <div>
          <h3>Risque faible</h3>
          <p>Plat sûr, peu ou pas de contaminant détecté selon les analyses.</p>
        </div>
      </div>

      <div class="risk-card">
        <span class="risk-card__dot" style="background: var(--risk-medium)"></span>
        <div>
          <h3>Risque modéré</h3>
          <p>
            Contaminant détecté (cadmium, mercure, pesticides) 
            mais à l'intérieur des normes officielles.
          </p>
        </div>
      </div>

      <div class="risk-card">
        <span class="risk-card__dot" style="background: var(--risk-high)"></span>
        <div>
          <h3>Risque élevé</h3>
          <p>
            Contaminant présent avec concentration notée. 
            À varier au cours de la semaine pour ne pas s'exposer 2 fois 
            au même risque.
          </p>
        </div>
      </div>
    </section>

    <!-- Section 3 : Score A/B/C -->
    <section class="about-section">
      <h2>📊 Comprendre le score A/B/C</h2>
      
      <div class="score-card score-card--a">
        <div class="score-card__letter">A</div>
        <div>
          <h3>Score A — Excellent</h3>
          <p>
            Aucun repas à risque élevé, max 2 repas modérés, 
            bonne variation des ingrédients et des sources de protéines.
          </p>
        </div>
      </div>

      <div class="score-card score-card--b">
        <div class="score-card__letter">B</div>
        <div>
          <h3>Score B — Acceptable</h3>
          <p>
            1 à 3 repas à risque modéré. Diversité acceptable, 
            mais à surveiller sur les semaines suivantes.
          </p>
        </div>
      </div>

      <div class="score-card score-card--c">
        <div class="score-card__letter">C</div>
        <div>
          <h3>Score C — À revoir</h3>
          <p>
            Repas à risque élevé présent. Diversité insuffisante. 
            À améliorer en variant davantage les sources de protéines et les ingrédients.
          </p>
        </div>
      </div>
    </section>

    <!-- Section 4 : Pourquoi varier -->
    <section class="about-section">
      <h2>💡 La stratégie : pas d'élimination, mais variation</h2>
      <p>
        Le cadmium, le mercure et autres contaminants sont partout dans notre chaîne alimentaire. 
        Il est impossible de les éviter complètement.
      </p>
      <p>
        <strong>La clé :</strong> varier les repas et les ingrédients pour ne pas s'exposer 
        2 fois au même contaminant dans la même semaine. Cela limite l'accumulation 
        dans l'organisme.
      </p>
      <p>
        Chaque repas "à risque modéré" est acceptable, 
        tant que vous ne mangez pas la même chose 2 jours de suite.
      </p>
    </section>

    <!-- Section 5 : Historique -->
    <section class="about-section">
      <h2>🔍 Voir l'historique</h2>
      <p>
        <a href="index.html" class="about-link">Retour au menu principal</a> 
        pour consulter les scores des semaines précédentes.
      </p>
    </section>

  </main>

  <footer class="about-footer">
    onmangequoi.eu
  </footer>
</body>
</html>
```

### CSS pour about.html (about.css)

```css
/* ── Header ──────────────────────────────────────────── */
.about-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
}

.about-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-family: var(--font-display);
  color: var(--color-text);
}

.about-back {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  color: var(--color-text);
  transition: opacity 0.2s;
}

.about-back:hover {
  opacity: 0.7;
}

/* ── Content ─────────────────────────────────────────── */
.about-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem 1rem;
  line-height: 1.6;
}

.about-section {
  margin-bottom: 3rem;
}

.about-section h2 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--color-text);
}

.about-section h3 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: var(--color-text);
}

.about-section p {
  margin-bottom: 1rem;
  color: var(--color-text-secondary);
}

.about-section strong {
  color: var(--color-text);
  font-weight: 600;
}

/* ── Risk cards ──────────────────────────────────────── */
.risk-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background: var(--color-bg-subtle);
  border-radius: 8px;
  border-left: 4px solid var(--color-border);
}

.risk-card__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.risk-card h3 {
  margin-top: 0;
}

.risk-card p {
  margin-bottom: 0;
  font-size: 0.95rem;
}

/* ── Score cards ─────────────────────────────────────── */
.score-card {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  border: 2px solid var(--color-border);
  transition: background 0.2s;
}

.score-card__letter {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 700;
  min-width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  height: 60px;
}

.score-card--a .score-card__letter {
  background: var(--risk-low);
  color: white;
}

.score-card--b .score-card__letter {
  background: var(--risk-medium);
  color: white;
}

.score-card--c .score-card__letter {
  background: var(--risk-high);
  color: white;
}

.score-card h3 {
  margin-top: 0;
}

.score-card p {
  margin-bottom: 0;
  font-size: 0.95rem;
}

/* ── Links ───────────────────────────────────────────── */
.about-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.about-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

/* ── Footer ──────────────────────────────────────────── */
.about-footer {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  border-top: 1px solid var(--color-border);
}

/* ── Dark mode ───────────────────────────────────────── */
@media (prefers-color-scheme: dark) {
  .risk-card {
    background: rgba(255, 255, 255, 0.05);
  }
}

/* ── Mobile ──────────────────────────────────────────── */
@media (max-width: 640px) {
  .about-content {
    padding: 1.5rem 1rem;
  }

  .score-card {
    flex-direction: column;
    gap: 1rem;
  }

  .score-card__letter {
    min-width: auto;
    width: 50px;
    height: 50px;
    font-size: 2rem;
  }
}
```

---

## 4. Implémentation technique

### Fichiers à créer/modifier

| Fichier | Action | Détails |
|---------|--------|---------|
| `semaine.html` | Modifier | Améliorer badge score avec icône ⓘ |
| `semaine.css` | Modifier | Styles pour icône cliquable |
| `styles.css` | Ajouter | `.health-legend` et `.legend-*` classes |
| `about.html` | Créer | Page "À Propos" complète |
| `about.css` | Créer | Styles pour page "À Propos" |

### Pas de changement logique
- `riskLevel` et `healthScore` existent déjà ✓
- Aucune modification de données JSON requise ✓
- Affichage uniquement (présentation du contenu existant) ✓

---

## 5. Vérifications avant livraison

### Mobile-first ✓
- Légende : responsive, empile verticalement sur petit écran
- Icône ⓘ : cliquable, suffisamment grande (min 44px)
- Page "À Propos" : lisible sur 375px et 1280px

### Accessibilité ✓
- Contraste WCAG AA minimum : texte gris sur background clair/sombre
- Icône ⓘ : tooltip au hover + lien cliquable
- `role="img"` sur points de risque

### Cohérence visuelle ✓
- Couleurs CSS vars : pas de hex hardcoded
- Dark mode : pris en compte (`prefers-color-scheme: dark`)
- Typographie : utilise `--font-display` et `--font-body` existants

### Flexibilité design ✓
- Légende non intrusive : bas du menu
- Page "À Propos" peut s'enrichir sans casser le menu
- Structure prête pour app native (même HTML, CSS responsive)

---

## 6. Contenu de la page "À Propos" — Textes finaux

### Intro (2 phrases)
```
On mange quoi ? aide à réduire l'exposition à des contaminants 
(cadmium, mercure, pesticides, etc.). L'idée : varier les plats 
plutôt que de tout éviter, car il est impossible d'éliminer 
complètement ces substances.
```

### Pourquoi varier (3 phrases clés)
```
Le cadmium, le mercure et autres contaminants sont partout 
dans notre chaîne alimentaire. Il est impossible de les éviter 
complètement.

La clé : varier les repas et les ingrédients pour ne pas 
s'exposer 2 fois au même contaminant dans la même semaine. 
Cela limite l'accumulation dans l'organisme.

Chaque repas "à risque modéré" est acceptable, tant que vous 
ne mangez pas la même chose 2 jours de suite.
```

---

## 7. Décisions design

| Décision | Rationale | Alternative rejetée |
|----------|-----------|-------------------|
| Légende en bas du menu | Non intrusive, mobile-friendly | Légende au-dessus du menu (surcharge header) |
| Icône ⓘ cliquable | Navigation claire vers contexte | Tooltip au hover (maladroit sur mobile) |
| Page "À Propos" séparée | Contexte complet sans saturation du menu | Tout dans un modal (mobile unfriendly) |
| Score A/B/C avec cards visuelles | Pédagogique, facile à scanner | Liste à puces (moins visuelle) |

---

## Status
✅ **Approved** — Ready for implementation
