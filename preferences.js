// ============================================
// PREFERENCES MANAGER — Dietary personalization
// ============================================
// Manages user dietary preferences (allergies, restrictions, dislikes)
// and filters menus accordingly

const PreferenceManager = {
  preferences: {},
  currentProfileId: null,

  // Fixed preference options (UI dropdowns)
  ALLERGIES: [
    'Peanuts',
    'Tree nuts',
    'Shellfish',
    'Fish',
    'Dairy',
    'Gluten',
    'Eggs',
    'Soy'
  ],

  RESTRICTIONS: [
    'Vegan',
    'Vegetarian',
    'Kosher',
    'Halal',
    'Low-sodium',
    'Low-sugar'
  ],

  // Initialize preference manager
  async init() {
    console.log('✅ PreferenceManager initialized');
  },

  // Load preferences for a profile
  async loadPreferences(profileId) {
    if (!profileId || !window.supabaseClient) {
      console.warn('Cannot load preferences: missing profileId or supabaseClient');
      return {};
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('preferences')
        .select('*')
        .eq('profile_id', profileId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found (normal for first time)
        console.warn('Error loading preferences:', error);
        return {};
      }

      this.preferences[profileId] = data || {
        allergies: [],
        restrictions: [],
        dislikes: []
      };

      return this.preferences[profileId];
    } catch (err) {
      console.error('Preference load error:', err);
      return {};
    }
  },

  // Save preferences for a profile
  async savePreferences(profileId, userId, allergies, restrictions, dislikes) {
    if (!profileId || !userId || !window.supabaseClient) {
      console.error('Missing required fields for savePreferences');
      return false;
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('preferences')
        .upsert({
          profile_id: profileId,
          user_id: userId,
          allergies: allergies || [],
          restrictions: restrictions || [],
          dislikes: dislikes || []
        }, { onConflict: 'profile_id' })
        .select()
        .single();

      if (error) {
        console.error('Error saving preferences:', error);
        showToast('Erreur', 'Impossible de sauvegarder les préférences.', 'error');
        return false;
      }

      this.preferences[profileId] = data;
      showToast('Succès', 'Préférences mises à jour.', 'success');
      return true;
    } catch (err) {
      console.error('Preference save error:', err);
      showToast('Erreur', 'Erreur lors de la sauvegarde.', 'error');
      return false;
    }
  },

  // Get preferences for a profile
  getPreferences(profileId) {
    return this.preferences[profileId] || {
      allergies: [],
      restrictions: [],
      dislikes: []
    };
  },

  // Check if a dish is safe for preferences
  isDishSafe(dishName, dishIngredients, preferences) {
    if (!preferences || (!preferences.allergies?.length && !preferences.restrictions?.length)) {
      return true; // No restrictions = all dishes safe
    }

    const dishText = `${dishName} ${(dishIngredients || []).join(' ')}`.toLowerCase();

    // Check allergies
    if (preferences.allergies?.length > 0) {
      for (const allergen of preferences.allergies) {
        if (dishText.includes(allergen.toLowerCase())) {
          return false;
        }
      }
    }

    // Check restrictions
    if (preferences.restrictions?.length > 0) {
      for (const restriction of preferences.restrictions) {
        if (this.breaksRestriction(dishText, restriction)) {
          return false;
        }
      }
    }

    // Check dislikes
    if (preferences.dislikes?.length > 0) {
      for (const dislike of preferences.dislikes) {
        if (dishText.includes(dislike.toLowerCase())) {
          return false;
        }
      }
    }

    return true;
  },

  // Helper: Check if dish breaks dietary restriction
  breaksRestriction(dishText, restriction) {
    const restrictionLower = restriction.toLowerCase();

    if (restrictionLower === 'vegan') {
      // Vegan = no animal products
      return dishText.includes('meat') ||
             dishText.includes('fish') ||
             dishText.includes('dairy') ||
             dishText.includes('egg') ||
             dishText.includes('butter') ||
             dishText.includes('cheese') ||
             dishText.includes('honey');
    }

    if (restrictionLower === 'vegetarian') {
      // Vegetarian = no meat/fish
      return dishText.includes('meat') || dishText.includes('fish');
    }

    if (restrictionLower === 'gluten-free') {
      // Check for common gluten sources
      return dishText.includes('wheat') ||
             dishText.includes('gluten') ||
             dishText.includes('bread') ||
             dishText.includes('pasta') ||
             dishText.includes('flour');
    }

    if (restrictionLower === 'kosher') {
      // Simplified: certain animals not allowed
      return dishText.includes('pork') || dishText.includes('shellfish');
    }

    if (restrictionLower === 'halal') {
      // Simplified: pork not allowed, no alcohol
      return dishText.includes('pork') || dishText.includes('alcohol');
    }

    if (restrictionLower === 'low-sodium') {
      // This would require nutritional data; skip for now
      return false;
    }

    if (restrictionLower === 'low-sugar') {
      // This would require nutritional data; skip for now
      return false;
    }

    return false;
  },

  // Get preference tags for display (e.g., "🏥 Dairy-free")
  getPreferenceTags(preferences) {
    if (!preferences || (!preferences.allergies?.length && !preferences.restrictions?.length)) {
      return [];
    }

    const tags = [];

    if (preferences.restrictions?.includes('Vegan')) tags.push('🌱 Vegan');
    if (preferences.restrictions?.includes('Vegetarian')) tags.push('🥬 Vegetarian');
    if (preferences.allergies?.includes('Gluten')) tags.push('🚫 Gluten-free');
    if (preferences.allergies?.includes('Dairy')) tags.push('🏥 Dairy-free');

    return tags;
  },

  // Render preference picker modal
  renderPreferenceModal(profileId, profileName, userId) {
    if (!profileId) return;

    const prefs = this.getPreferences(profileId);

    let html = `
      <div id="preference-modal-${profileId}" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h2>Préférences alimentaires — ${profileName}</h2>
            <button class="modal-close" onclick="document.getElementById('preference-modal-${profileId}').style.display='none'; return false;">✕</button>
          </div>

          <div class="modal-body" style="padding: 1.5rem;">
            <!-- Allergies Section -->
            <fieldset style="margin-bottom: 1.5rem; border: none;">
              <legend style="font-weight: 600; margin-bottom: 0.75rem; color: #1B4332;">Allergies</legend>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
    `;

    // Allergies checkboxes
    this.ALLERGIES.forEach(allergen => {
      const isChecked = prefs.allergies?.includes(allergen) ? 'checked' : '';
      html += `
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" name="allergy" value="${allergen}" ${isChecked}
                 data-profile-id="${profileId}" data-user-id="${userId}"
                 style="margin-right: 0.5rem;">
          <span>${allergen}</span>
        </label>
      `;
    });

    html += `
              </div>
            </fieldset>

            <!-- Restrictions Section -->
            <fieldset style="margin-bottom: 1.5rem; border: none;">
              <legend style="font-weight: 600; margin-bottom: 0.75rem; color: #1B4332;">Régimes alimentaires</legend>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
    `;

    // Restrictions checkboxes
    this.RESTRICTIONS.forEach(restriction => {
      const isChecked = prefs.restrictions?.includes(restriction) ? 'checked' : '';
      html += `
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" name="restriction" value="${restriction}" ${isChecked}
                 data-profile-id="${profileId}" data-user-id="${userId}"
                 style="margin-right: 0.5rem;">
          <span>${restriction}</span>
        </label>
      `;
    });

    html += `
              </div>
            </fieldset>

            <!-- Dislikes Section -->
            <fieldset style="margin-bottom: 1.5rem; border: none;">
              <legend style="font-weight: 600; margin-bottom: 0.75rem; color: #1B4332;">Ingrédients à éviter (optionnel)</legend>
              <input type="text" id="dislikes-${profileId}"
                     placeholder="cilantro, champignons, etc (séparés par des virgules)"
                     value="${(prefs.dislikes || []).join(', ')}"
                     style="width: 100%; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 6px; font-family: inherit;">
            </fieldset>

            <!-- Save Button -->
            <button onclick="PreferenceManager.saveFromModal('${profileId}', '${userId}')"
                    style="width: 100%; padding: 0.75rem; background: #1B4332; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    `;

    return html;
  },

  // Save preferences from modal (called by onclick handler)
  async saveFromModal(profileId, userId) {
    const allergies = Array.from(
      document.querySelectorAll(`input[name="allergy"][data-profile-id="${profileId}"]:checked`)
    ).map(el => el.value);

    const restrictions = Array.from(
      document.querySelectorAll(`input[name="restriction"][data-profile-id="${profileId}"]:checked`)
    ).map(el => el.value);

    const dislikesText = document.getElementById(`dislikes-${profileId}`)?.value || '';
    const dislikes = dislikesText.split(',').map(d => d.trim()).filter(d => d.length > 0);

    const success = await this.savePreferences(profileId, userId, allergies, restrictions, dislikes);

    if (success) {
      document.getElementById(`preference-modal-${profileId}`).style.display = 'none';
      // Refresh menu if currently viewing
      if (typeof renderAll === 'function') {
        renderAll();
      } else if (typeof renderMenu === 'function') {
        renderMenu();
      }
    }
  }
};

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PreferenceManager.init());
} else {
  PreferenceManager.init();
}
