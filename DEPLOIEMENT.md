# Mettre Table Saine en ligne — Guide pas à pas

Le repo git est prêt et le premier commit est fait. Il reste 3 étapes à faire toi-même (5-10 minutes).

---

## Étape 1 — Créer le repo sur GitHub

1. Va sur **[github.com](https://github.com)** et connecte-toi (ou crée un compte si tu n'en as pas)
2. Clique sur le **"+"** en haut à droite → **"New repository"**
3. Remplis comme ça :
   - **Repository name** : `tablesaine`
   - **Visibility** : Public ✅ (obligatoire pour GitHub Pages gratuit)
   - **Ne coche rien** (pas de README, pas de .gitignore — on les a déjà)
4. Clique **"Create repository"**

GitHub va t'afficher une page avec des instructions. Tu en auras besoin à l'étape 2.

---

## Étape 2 — Pousser le code depuis ton Terminal

Ouvre le **Terminal** sur ton Mac et colle ces 3 commandes **une par une** :

```bash
cd ~/Documents/01_PROJECTS/Cowork\ OS/TableSaine
```

```bash
git remote add origin https://github.com/TON_USERNAME/tablesaine.git
```
⚠️ Remplace `TON_USERNAME` par ton nom d'utilisateur GitHub (visible en haut à droite sur GitHub)

```bash
git push -u origin main
```

GitHub va te demander ton identifiant + un **token** (pas ton mot de passe). Pour créer le token :
- Va sur GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- "Generate new token" → coche `repo` → génère → copie-le
- Utilise-le comme mot de passe dans le Terminal

---

## Étape 3 — Activer GitHub Pages

1. Sur ton repo GitHub (`github.com/TON_USERNAME/tablesaine`), clique sur **Settings**
2. Dans le menu gauche, clique **"Pages"**
3. Sous "Branch", sélectionne **`main`** et le dossier **`/ (root)`**
4. Clique **Save**

⏳ Attends 1-2 minutes, puis ton site sera en ligne à :
```
https://TON_USERNAME.github.io/tablesaine
```

---

## C'est en ligne ✅

Tu peux partager cette URL avec ta famille. Le site se chargera directement avec le menu de la semaine.

---

## Pour mettre à jour le site chaque semaine

Une fois que la tâche automatique du lundi ajoute un nouveau fichier JSON dans `data/menus/`, tu fais depuis le Terminal :

```bash
cd ~/Documents/01_PROJECTS/Cowork\ OS/TableSaine
git add data/menus/
git commit -m "Menu semaine du [date]"
git push
```

GitHub Pages se met à jour automatiquement en 1-2 minutes.

---

> 💡 **Astuce** : installe [GitHub Desktop](https://desktop.github.com/) si tu préfères une interface visuelle plutôt que le Terminal pour les mises à jour.
