# Plan — Supabase Security & Performance Fix
Date : 2026-04-08 | Branch : main | Source : Supabase email alert + Advisor screenshots

---

## Contexte

Alerte Supabase reçue pour le projet "On Mange Quoi" (pozhsrnsezklfyqjoues). Après audit via les screenshots des Advisors Supabase, **3 problèmes distincts** ont été identifiés.

---

## Problème 1 — RLS désactivé sur `substitution_history` ⚠️ CRITIQUE

**Source :** Email d'alerte Supabase (`rls_disabled_in_public`)

La table `substitution_history` n'apparaît pas dans le Performance Advisor (qui liste les tables avec RLS activé). Elle n'est donc soit pas encore créée, soit créée sans RLS.

**Impact :** N'importe qui avec l'URL du projet peut lire/modifier/supprimer tout l'historique des substitutions de tous les utilisateurs.

**Fix — SQL à exécuter dans le SQL Editor :**

```sql
-- Étape 1 : Vérifier si la table existe et son état RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Si `substitution_history` est listée avec `rowsecurity = false` :

```sql
-- Activer RLS
ALTER TABLE public.substitution_history ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : chaque utilisateur voit uniquement son historique
CREATE POLICY "Users see own substitution history"
  ON public.substitution_history FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- Politique INSERT
CREATE POLICY "Users insert own substitution history"
  ON public.substitution_history FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Politique DELETE
CREATE POLICY "Users delete own substitution history"
  ON public.substitution_history FOR DELETE
  USING ((SELECT auth.uid()) = user_id);
```

Si la table n'existe pas encore : voir `docs/SUBSTITUTION_HISTORY.md` pour le CREATE TABLE complet (en remplaçant `auth.uid()` par `(SELECT auth.uid())` dans les policies).

---

## Problème 2 — Policies RLS lentes sur 5 tables ⚠️ PERFORMANCE (17 warnings)

**Source :** Performance Advisor → "Auth RLS Initialization Plan" (17 warnings)

**Tables affectées :** `profiles`, `subscriptions`, `preferences`, `user_preferences`, `recipes`

**Pourquoi c'est lent :** Les policies actuelles appellent `auth.uid()` directement dans la clause USING. Postgres appelle cette fonction **pour chaque ligne** de la table vérifiée. Avec 1000 lignes, c'est 1000 appels au lieu de 1.

**Fix :** Remplacer `auth.uid()` par `(SELECT auth.uid())` dans toutes les policies. Ce changement force Postgres à traiter la valeur comme stable et à la calculer une seule fois.

**SQL — supprimer et recréer les policies pour chaque table :**

```sql
-- ============================================
-- PROFILES — recréer les policies (SELECT auth.uid())
-- ============================================
DROP POLICY IF EXISTS "Users can read own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profiles" ON public.profiles;

CREATE POLICY "Users can read own profiles"
  ON public.profiles FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own profiles"
  ON public.profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own profiles"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own profiles"
  ON public.profiles FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;

CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- PREFERENCES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.preferences;

CREATE POLICY "Users can view their own preferences"
  ON public.preferences FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.preferences FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.preferences FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON public.preferences FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- USER_PREFERENCES
-- ============================================
DROP POLICY IF EXISTS "Users can access own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users access own user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users insert own user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users update own user_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users delete own user_preferences" ON public.user_preferences;

CREATE POLICY "Users access own user_preferences"
  ON public.user_preferences FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users insert own user_preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users update own user_preferences"
  ON public.user_preferences FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users delete own user_preferences"
  ON public.user_preferences FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- RECIPES (nouvelle table découverte dans les screenshots)
-- ============================================
-- Vérifier d'abord les policies existantes :
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'recipes';
-- Puis adapter selon le schéma (public lecture ? ou privé ?)
```

⚠️ **Note sur `recipes` :** Cette table n'est pas utilisée directement dans le code frontend actuel (aucun `.from('recipes')` trouvé). Vérifier dans le SQL Editor quelles policies existent déjà avant de les modifier.

---

## Problème 3 — Leaked Password Protection désactivé ⚠️ SÉCURITÉ (low priority)

**Source :** Security Advisor → "Leaked Password Protection Disabled"

**Pourquoi ça compte :** Quand activé, Supabase vérifie automatiquement les nouveaux mots de passe contre la base haveibeenpwned.com. Si un utilisateur essaie d'utiliser un mot de passe déjà compromis dans une autre fuite, il est rejeté.

**Fix — dans les paramètres Supabase Auth :**
1. Aller sur https://supabase.com/dashboard/project/pozhsrnsezklfyqjoues/auth/providers
2. Scroll jusqu'à **Password security** ou **Email provider settings**
3. Activer **"Check against HaveIBeenPwned"** (ou formulation similaire)
4. Sauvegarder

Aucun SQL requis.

---

## Ordre d'exécution recommandé

| Priorité | Problème | Durée | Impact |
|----------|----------|-------|--------|
| 🔴 1 | Activer RLS sur `substitution_history` | 5 min | Ferme la faille de sécurité |
| 🟠 2 | Recréer policies avec `(SELECT auth.uid())` | 10 min | Élimine 17 warnings de perf |
| 🟡 3 | Activer Leaked Password Protection | 2 min | Sécurité Auth améliorée |

**Durée totale : ~20 min**

---

## Vérification finale

Après application de tous les fixes :

```sql
-- Vérifier l'état RLS de toutes les tables publiques
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Toutes les lignes doivent afficher `rowsecurity = true`.

Ensuite relancer le linter dans Performance Advisor (bouton "Rerun linter") — les 17 warnings doivent disparaître.

---

## Tests manuels à faire après le fix

- [ ] Connexion / déconnexion fonctionne
- [ ] Profil visible après connexion
- [ ] Préférences alimentaires se chargent
- [ ] Préférences alimentaires se sauvegardent
- [ ] Historique substitutions accessible (si feature activée)
- [ ] Statut abonnement lisible dans les Netlify functions (tester via Stripe checkout)

---

## Fichiers modifiés

Aucun fichier code modifié — tous les fixes sont dans le Supabase Dashboard (SQL Editor + Auth Settings).

<!-- /autoplan restore point: /Users/kevinjordan/.gstack/projects/MorningCooookie-On-Mange-Quoi/main-autoplan-restore-20260408-153845.md -->

---

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|---------|
| 1 | CEO | `CREATE POLICY IF NOT EXISTS` → DROP + CREATE | Mechanical | P5 (explicit) | Postgres 15 doesn't support IF NOT EXISTS for policies; DROP IF EXISTS + CREATE is compatible and explicit | IF NOT EXISTS syntax (PG17+) |
| 2 | CEO | Add `recipes` table note (verify first) | Mechanical | P3 (pragmatic) | Table found in screenshots but not in codebase — policy type unknown, must audit before modifying | Blindly recreating policies |
| 3 | CEO | Include `(SELECT auth.uid())` in ALL new policies | Mechanical | P1 (completeness) | Fixes both Problem 1 and Problem 2 in one pass; the correct pattern regardless of performance concern | `auth.uid()` (legacy pattern) |
| 4 | CEO | Add Leaked Password Protection as Problem 3 | Mechanical | P1 (completeness) | Visible in screenshots — costs 2 min to fix, should not be deferred | Deferring to separate plan |
| 5 | CEO | Skip `preferences` profile_id/user_id concern | Taste | P3 (pragmatic) | App is already live with existing policies working — existing RLS is correct, client query adds `profile_id` as an extra filter but RLS gate is on `user_id` | Blocking the fix to audit app code |
| 6 | Eng | No code changes | Mechanical | P5 (explicit) | All fixes are SQL-only; Netlify functions use service_role (bypasses RLS); client code works with existing policies | Modifying app queries |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | auto (autoplan) | Scope & strategy | 1 | issues_open | 3 issues found: RLS on substitution_history, slow policies on 5 tables, leaked pwd protection |
| Claude Subagent (CEO) | auto (autoplan) | Independent voice | 1 | clean | Flagged preferences query pattern (auto-resolved), identified subscriptions write risk |
| Codex Review | — | Independent 2nd opinion | 0 | skipped | Codex not available |
| Design Review | — | UI/UX gaps | 0 | skipped | No UI scope |
| Eng Review | auto (autoplan) | Architecture & tests | 1 | clean | No code changes; SQL-only fix; service_role bypass confirmed |

**VERDICT:** PLAN UPDATED — 3 security/performance issues identified. Original plan was too narrow (1 table). Plan now covers all 3 issues with exact SQL to run.
