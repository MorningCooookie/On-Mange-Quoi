/**
 * Preference Substitution Module
 * Automatically substitutes meals that violate user preferences with safe alternatives
 * PREMIUM FEATURE — requires subscription
 */

const PreferenceSubstitution = {
  allMeals: [],
  substitutions: {}, // { "meal-id": { original: {...}, substitute: {...} } }
  substitutionHistory: {}, // Cache: { "user-id": [{ mealId, substituteId, usedDate }, ...] }

  // Initialize — load meal database
  async init() {
    try {
      const res = await fetch('/data/meals.json');
      if (!res.ok) throw new Error(`Failed to load meals: ${res.status}`);
      this.allMeals = await res.json();
      console.log(`✅ PreferenceSubstitution initialized with ${this.allMeals.length} meals`);
    } catch (err) {
      console.error('❌ Failed to load meals database:', err);
    }
  },

  /**
   * Load recent substitution history for a user (last 14 days)
   * @param {string} userId - Supabase user ID
   * @returns {Array} Array of recent substitutions
   */
  async loadSubstitutionHistory(userId) {
    if (!userId || !window.supabaseClient) return [];

    try {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { data, error } = await window.supabaseClient
        .from('substitution_history')
        .select('*')
        .eq('user_id', userId)
        .gte('used_date', twoWeeksAgo.toISOString().split('T')[0])
        .order('used_date', { ascending: false });

      if (error) {
        console.warn('⚠️ Could not load substitution history:', error.message);
        return [];
      }

      this.substitutionHistory[userId] = data || [];
      return this.substitutionHistory[userId];
    } catch (err) {
      console.error('❌ Error loading substitution history:', err);
      return [];
    }
  },

  /**
   * Save a substitution to history
   * @param {string} userId - Supabase user ID
   * @param {string} mealId - Original meal ID
   * @param {string} substituteId - Substitute meal ID
   */
  async saveSubstitutionHistory(userId, mealId, substituteId) {
    if (!userId || !window.supabaseClient) return false;

    try {
      const { error } = await window.supabaseClient
        .from('substitution_history')
        .insert({
          user_id: userId,
          meal_id: mealId,
          substitute_id: substituteId,
          used_date: new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.warn('⚠️ Could not save substitution history:', error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error('❌ Error saving substitution history:', err);
      return false;
    }
  },

  /**
   * Check if a meal is safe for the user's preferences
   * Uses PreferenceManager.isDishSafe internally
   */
  isMealSafe(mealName, preferences) {
    if (!preferences || (!preferences.allergies?.length && !preferences.restrictions?.length && !preferences.dislikes?.length)) {
      return true; // No restrictions
    }
    return PreferenceManager.isDishSafe(mealName, [], preferences);
  },

  /**
   * Find best matching alternative for a meal
   * Based on category, ingredients, absence of conflicts, and history rotation
   * @param {Object} originalMeal - Original meal object
   * @param {Object} userPreferences - User dietary preferences
   * @param {Array} recentHistory - Recent substitution history for this meal
   * @returns {Object} Best alternative meal
   */
  findBestAlternative(originalMeal, userPreferences, recentHistory = []) {
    if (!this.allMeals || this.allMeals.length === 0) {
      console.warn('❌ Meal database not loaded');
      return null;
    }

    // Filter candidates: same category, safe for preferences
    const candidates = this.allMeals.filter(meal => {
      // Skip the original meal
      if (meal.id === originalMeal.id) return false;

      // Same meal category
      if (meal.category !== originalMeal.category) return false;

      // Must be safe for user preferences
      if (!this.isMealSafe(meal.name, userPreferences)) return false;

      return true;
    });

    if (candidates.length === 0) {
      console.warn(`⚠️ No safe alternative found for "${originalMeal.name}"`);
      return null;
    }

    // Score candidates based on similarity + history rotation
    const scored = candidates.map(meal => {
      let score = this.scoreMealMatch(originalMeal, meal);

      // Apply history-based deprioritization
      const wasRecentlyUsed = recentHistory?.some(h => h.substitute_id === meal.id);
      if (wasRecentlyUsed) {
        // Penalize recently-used substitutes (reduce score by 20%)
        score *= 0.8;
        console.log(`  └─ "${meal.name}" deprioritized (used recently): ${score.toFixed(2)}`);
      } else if (recentHistory?.length > 0) {
        // Boost score for alternatives not recently used (add 5%)
        score *= 1.05;
      }

      return {
        ...meal,
        score,
        wasRecent: wasRecentlyUsed
      };
    });

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    // Return the best match (now considering history)
    return scored[0];
  },

  /**
   * Score similarity between two meals (0-1)
   * Factors: kid-friendliness match (0.3), difficulty similarity (0.3), ingredient overlap (0.4)
   */
  scoreMealMatch(original, candidate) {
    let score = 0;

    // Kid-friendliness match (0.3) — prefer to keep meal type consistent
    if (original.kidFriendly === candidate.kidFriendly) {
      score += 0.3;
    } else if (candidate.kidFriendly) {
      // If original was kid-friendly but we can't find alternative, prefer kid-friendly
      score += 0.15;
    }

    // Difficulty similarity (0.3) — keep prep time reasonable
    const difficultyMap = { 'very-easy': 1, 'easy': 2, 'medium': 3, 'hard': 4 };
    const origDiff = difficultyMap[original.difficulty] || 2;
    const candDiff = difficultyMap[candidate.difficulty] || 2;
    const diffDelta = Math.abs(origDiff - candDiff);
    score += Math.max(0, 0.3 - (diffDelta * 0.1)); // Penalize very different difficulty

    // Ingredient overlap (0.4) — prefer similar ingredients
    if (original.ingredients && candidate.ingredients) {
      const origSet = new Set(original.ingredients);
      const candSet = new Set(candidate.ingredients);
      const overlap = [...origSet].filter(i => candSet.has(i)).length;
      const maxLen = Math.max(origSet.size, candSet.size);
      score += (overlap / (maxLen || 1)) * 0.4;
    } else {
      score += 0.2; // Partial credit if no ingredient data
    }

    return Math.min(1, score); // Cap at 1.0
  },

  /**
   * Apply preference substitution to a complete menu
   * Returns: { menu: modified menu, alerts: array of alerts, substitutionCount }
   */
  async applySubstitutions(menu, profileId) {
    if (!menu || !menu.days) {
      console.warn('Invalid menu structure');
      return { menu, alerts: [], substitutionCount: 0 };
    }

    // Get user preferences
    const preferences = PreferenceManager.getPreferences(profileId);
    if (!preferences || (!preferences.allergies?.length && !preferences.restrictions?.length && !preferences.dislikes?.length)) {
      // No preferences set — return menu as-is
      return { menu, alerts: [], substitutionCount: 0 };
    }

    // Load recent substitution history for meal rotation (Option 2)
    let substitutionHistoryByMeal = {};
    if (profileId && window.supabaseClient) {
      const userHistory = await this.loadSubstitutionHistory(profileId);
      // Group history by meal_id for easier lookup
      userHistory.forEach(record => {
        if (!substitutionHistoryByMeal[record.meal_id]) {
          substitutionHistoryByMeal[record.meal_id] = [];
        }
        substitutionHistoryByMeal[record.meal_id].push(record);
      });
    }

    const alerts = [];
    let substitutionCount = 0;
    const modifiedMenu = JSON.parse(JSON.stringify(menu)); // Deep copy

    // Iterate through each day's meals
    modifiedMenu.days.forEach(day => {
      ['breakfast', 'lunch', 'snack', 'dinner'].forEach(mealType => {
        const meal = day.meals?.[mealType];
        if (!meal) return;

        // Check if meal is safe
        if (!this.isMealSafe(meal.name, preferences)) {
          console.warn(`⚠️ "${meal.name}" violates preferences`);

          // Find original meal object from database
          const originalMealDb = this.allMeals.find(m => m.name === meal.name);
          if (!originalMealDb) {
            alerts.push({
              type: 'error',
              mealType,
              day: day.label,
              message: `"${meal.name}" violates your preferences but no database entry found. Keeping original.`
            });
            return;
          }

          // Find best alternative with history rotation (Option 1 + 2)
          const recentHistory = substitutionHistoryByMeal[originalMealDb.id] || [];
          const alternative = this.findBestAlternative(originalMealDb, preferences, recentHistory);

          if (alternative) {
            // Store substitution details
            this.substitutions[originalMealDb.id] = {
              original: meal.name,
              substitute: alternative.name,
              day: day.label,
              mealType
            };

            // Replace meal in menu
            day.meals[mealType] = {
              name: alternative.name,
              icon: alternative.icon,
              riskLevel: alternative.riskLevel,
              riskType: alternative.riskType,
              prepTime: String(alternative.prepTime),
              isSeasonal: alternative.isSeasonal,
              note: `✨ Substitut sûr pour vos préférences. Originalement: "${meal.name}"`
            };

            alerts.push({
              type: 'substitution',
              mealType,
              day: day.label,
              original: meal.name,
              substitute: alternative.name,
              message: `"${meal.name}" → "${alternative.name}"`
            });

            // Save substitution to history (Option 1)
            if (profileId && window.supabaseClient) {
              this.saveSubstitutionHistory(profileId, originalMealDb.id, alternative.id).catch(err =>
                console.warn('⚠️ Could not save to history:', err)
              );
            }

            substitutionCount++;
            console.log(`✅ Substituted ${meal.name} → ${alternative.name}`);
          } else {
            alerts.push({
              type: 'conflict',
              mealType,
              day: day.label,
              meal: meal.name,
              message: `"${meal.name}" violates your preferences and no safe alternative found. Please adjust preferences or choose a different meal.`
            });
            console.warn(`❌ No safe alternative for "${meal.name}"`);
          }
        }
      });
    });

    return { menu: modifiedMenu, alerts, substitutionCount };
  },

  /**
   * Display substitution alerts to user
   */
  displayAlerts(alerts) {
    if (!alerts || alerts.length === 0) return;

    alerts.forEach(alert => {
      if (alert.type === 'substitution') {
        showToast(
          `${alert.day} - ${alert.mealType}`,
          `✅ ${alert.original} → ${alert.substitute}`,
          'success'
        );
      } else if (alert.type === 'conflict') {
        showToast(
          `${alert.day} - ${alert.mealType}`,
          `⚠️ Conflit: ${alert.meal}`,
          'warning'
        );
      } else if (alert.type === 'error') {
        showToast('Erreur', alert.message, 'error');
      }
    });
  }
};

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PreferenceSubstitution.init());
} else {
  PreferenceSubstitution.init();
}
