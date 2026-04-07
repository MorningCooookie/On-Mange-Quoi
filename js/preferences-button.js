/**
 * Preferences Button Controller
 * Shows/hides "Fix preferences" button and triggers modal when preferences exist
 *
 * PREMIUM FEATURE — requires user authentication and saved preferences
 */

class PreferencesButton {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.btn = document.getElementById('fix-preferences-btn');
    if (!this.btn) {
      console.warn('Fix preferences button not found in DOM');
      return;
    }

    this.currentUser = null;
    this.userPreferences = null;
    this.currentMeals = [];
    this.allMeals = [];

    this.btn.addEventListener('click', () => this.handleClick());
  }

  /**
   * Set current user (called after login)
   */
  setCurrentUser(user) {
    this.currentUser = user;
  }

  /**
   * Load all meals for substitution matching
   */
  async loadMeals() {
    if (this.allMeals.length > 0) return; // Already loaded

    try {
      const res = await fetch('/data/meals.json');
      if (!res.ok) throw new Error(`Failed to load meals: ${res.status}`);
      this.allMeals = await res.json();
      console.log(`✅ Loaded ${this.allMeals.length} meals for substitution`);
    } catch (err) {
      console.warn('Could not load meals database:', err);
    }
  }

  /**
   * Update button visibility and conflict count
   * Called when menu is loaded or preferences change
   */
  async updateButton(meals, userPreferences) {
    this.currentMeals = meals || [];
    this.userPreferences = userPreferences;

    // Hide button if feature flag is disabled
    if (!window.FEATURE_FLAGS || !window.FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED) {
      this.btn.style.display = 'none';
      return;
    }

    // Hide button if user not logged in, has no preferences, or no meals
    if (!this.currentUser || !userPreferences || !meals || meals.length === 0) {
      this.btn.style.display = 'none';
      return;
    }

    // Check for conflicts using PreferenceSubstitution
    if (!window.PreferenceSubstitution) {
      console.warn('PreferenceSubstitution module not available');
      this.btn.style.display = 'none';
      return;
    }

    // Count meals that violate preferences
    let conflictCount = 0;
    meals.forEach(meal => {
      if (!PreferenceSubstitution.isMealSafe(meal.name, userPreferences)) {
        conflictCount++;
      }
    });

    if (conflictCount === 0) {
      this.btn.style.display = 'none';
      return;
    }

    // Show button with conflict count badge
    this.btn.style.display = 'inline-block';
    this.btn.classList.add('has-conflicts');
    this.btn.setAttribute('data-conflict-count', conflictCount);
    this.btn.textContent = `⚠️ Fix preferences (${conflictCount})`;

    console.log(`🔔 Found ${conflictCount} meal(s) with preference conflicts`);
  }

  /**
   * Handle button click — show substitution modal
   */
  async handleClick() {
    if (!this.currentMeals.length || !this.userPreferences) {
      console.warn('Cannot open modal: missing meals or preferences');
      return;
    }

    // Ensure meals are loaded for substitution
    await this.loadMeals();

    // Open modal via PreferenceSubstitution (already exists)
    if (window.PreferenceSubstitution && window.PreferenceSubstitution.allMeals.length > 0) {
      console.log('Opening preference substitution modal...');
      // The modal will be triggered by app.js after applying substitutions
      window.dispatchEvent(new CustomEvent('open-substitution-modal', {
        detail: { meals: this.currentMeals, preferences: this.userPreferences }
      }));
    } else {
      showToast('Erreur', 'Base de données des repas indisponible', 'error');
    }
  }
}

// Export for use in app.js
if (typeof window !== 'undefined') {
  window.PreferencesButton = PreferencesButton;
}
