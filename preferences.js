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
    'Dairy',
    'Gluten',
    'Eggs',
    'Peanuts',
    'Tree nuts',
    'Shellfish',
    'Sesame',
    'Sulfites'
  ],

  RESTRICTIONS: [
    'Végétalien',
    'Végétarien',
    'Cachère',
    'Halal',
    'Faible en sel',
    'Faible en sucre'
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
    console.log('savePreferences: checking inputs', { profileId, userId, hasSupabase: !!window.supabaseClient });

    if (!profileId || !userId || !window.supabaseClient) {
      console.error('❌ Missing required fields: profileId=' + profileId + ', userId=' + userId + ', supabaseClient=' + !!window.supabaseClient);
      showToast('Erreur', 'Données manquantes. Reconnectez-vous et réessayez.', 'error');
      return false;
    }

    try {
      console.log('📤 Deleting existing preferences...');

      // Delete any existing preference record for this profile/user pair first
      await window.supabaseClient
        .from('preferences')
        .delete()
        .eq('profile_id', profileId)
        .eq('user_id', userId);

      console.log('📤 Inserting fresh preferences...');

      // Now insert fresh
      const { data, error } = await window.supabaseClient
        .from('preferences')
        .insert({
          profile_id: profileId,
          user_id: userId,
          allergies: allergies || [],
          restrictions: restrictions || [],
          dislikes: dislikes || []
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('Error details:', { code: error.code, message: error.message, details: error.details });
        showToast('Erreur Supabase', 'Code: ' + error.code + ' - ' + error.message, 'error');
        return false;
      }

      console.log('✅ Data saved:', data);
      this.preferences[profileId] = data;
      showToast('Succès', 'Préférences mises à jour.', 'success');
      return true;
    } catch (err) {
      console.error('❌ Catch block - Preference save error:', err.message);
      showToast('Erreur', 'Erreur: ' + err.message, 'error');
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

    if (restrictionLower === 'végétalien') {
      // Vegan = no animal products
      return dishText.includes('meat') ||
             dishText.includes('fish') ||
             dishText.includes('dairy') ||
             dishText.includes('egg') ||
             dishText.includes('butter') ||
             dishText.includes('cheese') ||
             dishText.includes('honey');
    }

    if (restrictionLower === 'végétarien') {
      // Vegetarian = no meat/fish
      return dishText.includes('meat') || dishText.includes('fish');
    }

    if (restrictionLower === 'gluten') {
      // Check for common gluten sources
      return dishText.includes('wheat') ||
             dishText.includes('gluten') ||
             dishText.includes('bread') ||
             dishText.includes('pasta') ||
             dishText.includes('flour');
    }

    if (restrictionLower === 'cachère') {
      // Simplified: certain animals not allowed
      return dishText.includes('pork') || dishText.includes('shellfish');
    }

    if (restrictionLower === 'halal') {
      // Simplified: pork not allowed, no alcohol
      return dishText.includes('pork') || dishText.includes('alcohol');
    }

    if (restrictionLower === 'faible en sel') {
      // This would require nutritional data; skip for now
      return false;
    }

    if (restrictionLower === 'faible en sucre') {
      // This would require nutritional data; skip for now
      return false;
    }

    return false;
  },

  // Get preference tags for display (e.g., "🏥 Sans lactose")
  getPreferenceTags(preferences) {
    if (!preferences || (!preferences.allergies?.length && !preferences.restrictions?.length)) {
      return [];
    }

    const tags = [];

    if (preferences.restrictions?.includes('Végétalien')) tags.push('🌱 Végétalien');
    if (preferences.restrictions?.includes('Végétarien')) tags.push('🥬 Végétarien');
    if (preferences.allergies?.includes('Gluten')) tags.push('🚫 Sans gluten');
    if (preferences.allergies?.includes('Produits laitiers')) tags.push('🏥 Sans lactose');

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

          <div class="modal-body" style="padding: 1.5rem; background: #FAFAFA;">
            <!-- Allergies Section -->
            <fieldset style="margin-bottom: 1.75rem; border: none;">
              <legend style="font-weight: 700; margin-bottom: 1rem; color: #1B4332; font-size: 0.95rem;">Allergies et intolérances</legend>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
    `;

    // Allergies checkboxes
    this.ALLERGIES.forEach(allergen => {
      const isChecked = prefs.allergies?.includes(allergen) ? 'checked' : '';
      html += `
        <label style="display: flex; align-items: center; cursor: pointer; padding: 0.5rem; border-radius: 6px; transition: background 0.15s ease;">
          <input type="checkbox" name="allergy" value="${allergen}" ${isChecked}
                 data-profile-id="${profileId}" data-user-id="${userId}"
                 style="margin-right: 0.75rem; width: 18px; height: 18px; cursor: pointer; accent-color: #1B4332;">
          <span style="font-size: 0.9rem; color: #333;">${allergen}</span>
        </label>
      `;
    });

    html += `
              </div>
            </fieldset>

            <!-- Restrictions Section -->
            <fieldset style="margin-bottom: 1.75rem; border: none;">
              <legend style="font-weight: 700; margin-bottom: 1rem; color: #1B4332; font-size: 0.95rem;">Régimes alimentaires</legend>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
    `;

    // Restrictions checkboxes
    this.RESTRICTIONS.forEach(restriction => {
      const isChecked = prefs.restrictions?.includes(restriction) ? 'checked' : '';
      html += `
        <label style="display: flex; align-items: center; cursor: pointer; padding: 0.5rem; border-radius: 6px; transition: background 0.15s ease;">
          <input type="checkbox" name="restriction" value="${restriction}" ${isChecked}
                 data-profile-id="${profileId}" data-user-id="${userId}"
                 style="margin-right: 0.75rem; width: 18px; height: 18px; cursor: pointer; accent-color: #1B4332;">
          <span style="font-size: 0.9rem; color: #333;">${restriction}</span>
        </label>
      `;
    });

    html += `
              </div>
            </fieldset>

            <!-- Dislikes Section -->
            <fieldset style="margin-bottom: 1.75rem; border: none;">
              <legend style="font-weight: 700; margin-bottom: 1rem; color: #1B4332; font-size: 0.95rem;">Ingrédients à éviter (optionnel)</legend>
              <input type="text" id="dislikes-${profileId}"
                     placeholder="coriandre, champignons, etc. (séparés par des virgules)"
                     value="${(prefs.dislikes || []).join(', ')}"
                     style="width: 100%; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 6px; font-family: inherit;">
            </fieldset>

            <!-- Save Button -->
            <button onclick="PreferenceManager.saveFromModal('${profileId}')"
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
  async saveFromModal(profileId) {
    const userId = ProfileManager.userId;
    console.log('saveFromModal called: profileId=' + profileId + ', userId=' + userId);

    if (!userId) {
      console.error('❌ userId is null or undefined. ProfileManager.userId =', ProfileManager.userId);
      showToast('Erreur', 'Session expirée. Reconnectez-vous.', 'error');
      return;
    }

    const allergies = Array.from(
      document.querySelectorAll(`input[name="allergy"][data-profile-id="${profileId}"]:checked`)
    ).map(el => el.value);

    const restrictions = Array.from(
      document.querySelectorAll(`input[name="restriction"][data-profile-id="${profileId}"]:checked`)
    ).map(el => el.value);

    const dislikesText = document.getElementById(`dislikes-${profileId}`)?.value || '';
    const dislikes = dislikesText.split(',').map(d => d.trim()).filter(d => d.length > 0);

    console.log('Saving preferences:', { profileId, userId, allergies, restrictions, dislikes });
    const success = await this.savePreferences(profileId, userId, allergies, restrictions, dislikes);

    if (success) {
      console.log('✅ Preferences saved successfully');
      const modalEl = document.getElementById(`preference-modal-${profileId}`);
      if (modalEl) modalEl.style.display = 'none';
      // Refresh menu if currently viewing
      if (typeof renderAll === 'function') {
        renderAll();
      } else if (typeof renderMenu === 'function') {
        renderMenu();
      }
    } else {
      console.error('❌ Failed to save preferences');
    }
  }
};

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PreferenceManager.init());
} else {
  PreferenceManager.init();
}
