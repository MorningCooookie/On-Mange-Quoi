/**
 * Substitution Handler
 * Manages the modal UI for selecting meal substitutes and applies them to the menu
 *
 * Flow:
 * 1. User clicks "Fix preferences" button
 * 2. Modal opens showing conflicting meals and alternatives
 * 3. User selects substitutes (or accepts auto-suggestions)
 * 4. User confirms → saves to DB and updates menu display
 */

class SubstitutionHandler {
  constructor() {
    this.currentMeals = [];
    this.userPreferences = null;
    this.userProfile = null;
    this.selections = {}; // { "original-meal-name": "substitute-meal-name" }
    this.alternatives = {}; // { "original-meal-name": [alternatives...] }

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for modal open event from PreferencesButton
    window.addEventListener('open-substitution-modal', (e) => {
      this.handleModalOpen(e.detail);
    });
  }

  /**
   * Handle modal open event
   */
  async handleModalOpen(detail) {
    this.currentMeals = detail.meals || [];
    this.userPreferences = detail.preferences;

    // Get current user profile ID from app state
    if (!window.app || !window.app.state || !window.app.state.supabaseProfileId) {
      console.warn('No user profile found in app state');
      showToast('Erreur', 'Profil utilisateur non trouvé', 'error');
      return;
    }

    this.userProfile = { id: window.app.state.supabaseProfileId };
    console.log(`🔄 Opening substitution modal for ${this.currentMeals.length} meals`);
    await this.renderModal();
  }

  /**
   * Render the substitution modal
   */
  async renderModal() {
    // Find conflicts and build alternatives list
    const conflicts = [];
    this.selections = {};
    this.alternatives = {};

    for (const meal of this.currentMeals) {
      // Skip meals that are safe
      if (PreferenceSubstitution.isMealSafe(meal.name, this.userPreferences)) {
        continue;
      }

      // This meal conflicts with preferences
      console.log(`⚠️ Conflict found: ${meal.name}`);
      const mealDb = PreferenceSubstitution.allMeals.find(m => m.name === meal.name);

      if (!mealDb) {
        console.warn(`Could not find ${meal.name} in database`);
        continue;
      }

      // Find alternatives for this meal
      const recentHistory = await PreferenceSubstitution.loadSubstitutionHistory(this.userProfile.id);
      const mealHistory = recentHistory.filter(h => h.meal_id === mealDb.id);
      const bestAlternative = PreferenceSubstitution.findBestAlternative(mealDb, this.userPreferences, mealHistory);

      // Get all possible alternatives for this meal (for manual selection)
      const allAlternatives = PreferenceSubstitution.allMeals.filter(m => {
        if (m.id === mealDb.id) return false; // Skip original
        if (m.category !== mealDb.category) return false; // Same category only
        if (!PreferenceSubstitution.isMealSafe(m.name, this.userPreferences)) return false;
        return true;
      });

      conflicts.push({
        original: meal.name,
        originalDb: mealDb,
        suggested: bestAlternative,
        allAlternatives: allAlternatives.slice(0, 5) // Top 5 alternatives
      });

      // Initialize selection to the suggested alternative
      this.selections[meal.name] = bestAlternative ? bestAlternative.name : null;
      this.alternatives[meal.name] = allAlternatives;
    }

    if (conflicts.length === 0) {
      showToast('ℹ️', 'Tous les repas correspondent à vos préférences!', 'info');
      return;
    }

    // Create and show modal
    this.showConflictsModal(conflicts);
  }

  /**
   * Render conflicts modal with selection UI
   */
  showConflictsModal(conflicts) {
    // Create modal HTML
    const modalHtml = `
      <div id="substitution-modal" class="modal-overlay">
        <div class="modal-content substitution-modal">
          <div class="modal-header">
            <h2>⚠️ Repas en conflit</h2>
            <button class="modal-close" id="close-modal">×</button>
          </div>

          <div class="modal-body">
            <p class="modal-intro">Ces repas ne correspondent pas à vos préférences. Sélectionnez un substitut ou gardez l'original:</p>

            <div id="conflicts-list" class="conflicts-list">
              ${conflicts.map((conflict, idx) => this.renderConflictItem(conflict, idx)).join('')}
            </div>
          </div>

          <div class="modal-footer">
            <button id="cancel-modal" class="btn btn-secondary">Annuler</button>
            <button id="apply-substitutions" class="btn btn-primary">Appliquer</button>
          </div>
        </div>
      </div>
    `;

    // Insert modal into DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Setup event handlers
    document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
    document.getElementById('cancel-modal').addEventListener('click', () => this.closeModal());
    document.getElementById('apply-substitutions').addEventListener('click', () => this.applySelections());

    // Setup selection handlers
    conflicts.forEach((conflict, idx) => {
      const selectElement = document.getElementById(`select-${idx}`);
      if (selectElement) {
        selectElement.addEventListener('change', (e) => {
          this.selections[conflict.original] = e.target.value || null;
        });
      }
    });

    console.log(`📋 Rendered modal with ${conflicts.length} conflicts`);
  }

  /**
   * Render a single conflict item in the modal
   */
  renderConflictItem(conflict, index) {
    const suggested = conflict.suggested;
    const alternatives = conflict.allAlternatives || [];

    return `
      <div class="conflict-item">
        <div class="conflict-original">
          <strong>${conflict.original}</strong>
          <span class="conflict-badge">❌</span>
        </div>

        <div class="conflict-select">
          <label for="select-${index}">Choisir un substitut:</label>
          <select id="select-${index}" class="substitution-select">
            <option value="">-- Garder l'original --</option>
            ${suggested ? `<option value="${suggested.name}" selected>✨ ${suggested.name} (suggéré)</option>` : ''}
            ${alternatives.filter(m => !suggested || m.id !== suggested.id).map(alt =>
              `<option value="${alt.name}">${alt.name}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    `;
  }

  /**
   * Apply user selections: save to DB and update menu
   */
  async applySelections() {
    const userId = this.userProfile.id;
    let appliedCount = 0;

    console.log('💾 Saving substitution selections...');

    // Save each selection to database
    for (const [originalName, selectedName] of Object.entries(this.selections)) {
      if (!selectedName || selectedName === originalName) continue; // Skip if no change

      const originalDb = PreferenceSubstitution.allMeals.find(m => m.name === originalName);
      const selectedDb = PreferenceSubstitution.allMeals.find(m => m.name === selectedName);

      if (!originalDb || !selectedDb) {
        console.warn(`Could not find meal in database: ${originalName} → ${selectedName}`);
        continue;
      }

      // Save to substitution_history table
      const saved = await PreferenceSubstitution.saveSubstitutionHistory(userId, originalDb.id, selectedDb.id);
      if (saved) {
        appliedCount++;
      }
    }

    console.log(`✅ Saved ${appliedCount} substitutions`);

    // Now update the menu display with the selections
    this.updateMenuDisplay();

    // Show confirmation toast
    showToast('✅', `${appliedCount} repas substitué${appliedCount > 1 ? 's' : ''}`, 'success');

    this.closeModal();

    // Refresh menu to show substitutions
    if (window.app && window.app.state) {
      await window.app.renderMenu();
    }
  }

  /**
   * Update the current menu display with selected substitutes
   */
  updateMenuDisplay() {
    if (!window.app || !window.app.state || !window.app.state.menuData) {
      console.warn('App state not available for menu update');
      return;
    }

    const menu = window.app.state.menuData;
    let updateCount = 0;

    // Apply selections to the menu structure
    menu.days?.forEach(day => {
      ['breakfast', 'lunch', 'snack', 'dinner', 'dejeuner', 'diner', 'gouter'].forEach(mealType => {
        const meal = day.meals?.[mealType];
        if (!meal) return;

        // Check if this meal has a selected substitute
        const selectedSubstitute = this.selections[meal.name];
        if (selectedSubstitute && selectedSubstitute !== meal.name) {
          const substituteDb = PreferenceSubstitution.allMeals.find(m => m.name === selectedSubstitute);
          if (substituteDb) {
            day.meals[mealType] = {
              name: substituteDb.name,
              icon: substituteDb.icon,
              riskLevel: substituteDb.riskLevel,
              riskType: substituteDb.riskType,
              prepTime: String(substituteDb.prepTime),
              isSeasonal: substituteDb.isSeasonal,
              note: `✨ Substitut pour vos préférences. Originalement: "${meal.name}"`
            };
            updateCount++;
          }
        }
      });
    });

    console.log(`🔄 Updated ${updateCount} meals in menu display`);
  }

  /**
   * Close the modal
   */
  closeModal() {
    const modal = document.getElementById('substitution-modal');
    if (modal) {
      modal.remove();
      console.log('✅ Modal closed');
    }
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.substitutionHandler = new SubstitutionHandler();
    console.log('✅ SubstitutionHandler initialized');
  });
} else {
  window.substitutionHandler = new SubstitutionHandler();
  console.log('✅ SubstitutionHandler initialized');
}
