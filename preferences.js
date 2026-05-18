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
    'Produits laitiers',
    'Gluten',
    'Œufs',
    'Arachides',
    'Fruits à coque',
    'Fruits de mer',
    'Sésame',
    'Sulfites'
  ],

  RESTRICTIONS: [
    'Végétalien',
    'Végétarien',
    // 'Cachère',  // temporairement masqué
    // 'Halal',   // temporairement masqué
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

  // Synonyms for generic food category terms — maps user input to specific ingredient names
  DISLIKE_SYNONYMS: {
    'poisson':   ['saumon', 'cabillaud', 'maquereau', 'sardine', 'thon', 'dorade', 'truite', 'lieu', 'merlan', 'bar', 'sole', 'hareng', 'anchois', 'tilapia', 'daurade', 'rouget'],
    'fish':      ['saumon', 'cabillaud', 'maquereau', 'sardine', 'thon', 'dorade', 'truite', 'lieu', 'merlan', 'bar', 'sole', 'hareng', 'anchois', 'poisson'],
    'viande':    ['boeuf', 'veau', 'porc', 'agneau', 'poulet', 'dinde', 'canard', 'lapin', 'gigot'],
    'meat':      ['boeuf', 'veau', 'porc', 'agneau', 'poulet', 'dinde', 'canard', 'lapin', 'gigot', 'viande'],
    'volaille':  ['poulet', 'dinde', 'canard', 'pintade'],
    'chicken':   ['poulet'],
    'porc':      ['jambon', 'lardons', 'bacon', 'saucisse', 'chorizo', 'pork'],
    'pork':      ['jambon', 'lardons', 'bacon', 'saucisse', 'chorizo', 'porc'],
  },

  // Check if a dish is safe for preferences
  isDishSafe(dishName, dishIngredients, preferences) {
    if (!preferences || (!preferences.allergies?.length && !preferences.restrictions?.length && !preferences.dislikes?.length)) {
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

    // Check dislikes (with synonym expansion for generic terms like "poisson" → "saumon", "cabillaud"...)
    if (preferences.dislikes?.length > 0) {
      for (const dislike of preferences.dislikes) {
        const dislikeLower = dislike.toLowerCase();
        if (dishText.includes(dislikeLower)) {
          return false;
        }
        const synonyms = this.DISLIKE_SYNONYMS[dislikeLower] || [];
        for (const synonym of synonyms) {
          if (dishText.includes(synonym)) {
            return false;
          }
        }
      }
    }

    return true;
  },

  // Helper: Check if dish breaks dietary restriction
  breaksRestriction(dishText, restriction) {
    const restrictionLower = restriction.toLowerCase();

    if (restrictionLower === 'végétalien') {
      // Vegan = no animal products (French and English terms)
      return dishText.includes('meat') || dishText.includes('fish') ||
             dishText.includes('dairy') || dishText.includes('egg') ||
             dishText.includes('butter') || dishText.includes('cheese') ||
             dishText.includes('honey') ||
             // French terms
             dishText.includes('viande') || dishText.includes('poulet') ||
             dishText.includes('boeuf') || dishText.includes('veau') ||
             dishText.includes('porc') || dishText.includes('agneau') ||
             dishText.includes('dinde') || dishText.includes('canard') ||
             dishText.includes('saumon') || dishText.includes('cabillaud') ||
             dishText.includes('maquereau') || dishText.includes('sardine') ||
             dishText.includes('thon') || dishText.includes('poisson') ||
             dishText.includes('beurre') || dishText.includes('fromage') ||
             dishText.includes('lait') || dishText.includes('crème') ||
             dishText.includes('yaourt') || dishText.includes('miel') ||
             dishText.includes('oeuf') || dishText.includes('œuf');
    }

    if (restrictionLower === 'végétarien') {
      // Vegetarian = no meat/fish (French and English terms)
      return dishText.includes('meat') || dishText.includes('fish') ||
             dishText.includes('viande') || dishText.includes('poulet') ||
             dishText.includes('boeuf') || dishText.includes('veau') ||
             dishText.includes('porc') || dishText.includes('agneau') ||
             dishText.includes('dinde') || dishText.includes('canard') ||
             dishText.includes('lapin') || dishText.includes('gigot') ||
             dishText.includes('saumon') || dishText.includes('cabillaud') ||
             dishText.includes('maquereau') || dishText.includes('sardine') ||
             dishText.includes('thon') || dishText.includes('poisson');
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
      <div id="preference-modal-${profileId}" class="preference-modal" style="display: none;">
        <div class="preference-modal__panel">
          <div class="preference-modal__header">
            <h2 class="preference-modal__title">Préférences alimentaires — ${profileName}</h2>
            <button class="preference-modal__close" data-action="close-pref-modal" data-profile-id="${profileId}" type="button" aria-label="Fermer">✕</button>
          </div>

          <div class="preference-modal__body">

            <fieldset class="preference-form__section">
              <legend class="preference-form__legend">Allergies et intolérances</legend>
              <div class="preference-form__grid">
    `;

    // Allergies checkboxes
    this.ALLERGIES.forEach(allergen => {
      const isChecked = prefs.allergies?.includes(allergen) ? 'checked' : '';
      html += `
        <label class="preference-form__option">
          <input type="checkbox" class="preference-form__checkbox" name="allergy" value="${allergen}" ${isChecked}
                 data-profile-id="${profileId}" data-user-id="${userId}">
          <span class="preference-form__label">${allergen}</span>
        </label>
      `;
    });

    html += `
              </div>
            </fieldset>

            <fieldset class="preference-form__section">
              <legend class="preference-form__legend">Régimes alimentaires</legend>
              <div class="preference-form__grid">
    `;

    // Restrictions checkboxes
    this.RESTRICTIONS.forEach(restriction => {
      const isChecked = prefs.restrictions?.includes(restriction) ? 'checked' : '';
      html += `
        <label class="preference-form__option">
          <input type="checkbox" class="preference-form__checkbox" name="restriction" value="${restriction}" ${isChecked}
                 data-profile-id="${profileId}" data-user-id="${userId}">
          <span class="preference-form__label">${restriction}</span>
        </label>
      `;
    });

    html += `
              </div>
            </fieldset>

            <fieldset class="preference-form__section">
              <legend class="preference-form__legend">Ingrédients à éviter <span class="preference-form__legend-hint">(optionnel)</span></legend>
              <input type="text" id="dislikes-${profileId}"
                     class="preference-form__input"
                     placeholder="coriandre, champignons, etc. — séparés par des virgules"
                     value="${(prefs.dislikes || []).join(', ')}">
            </fieldset>

            <button class="btn btn--primary btn--block" data-action="save-pref" data-profile-id="${profileId}" type="button">
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
      // Feedback utilisateur — sans toast la fermeture silencieuse donne
      // l'impression que "rien ne se passe" (signalé en QA mobile).
      if (typeof showToast === 'function') {
        // showToast a 2 signatures dans la codebase (3 args sur index.html,
        // 1 arg ailleurs). Try-catch pour éviter un throw en cas de
        // signature inattendue.
        try { showToast('Préférences enregistrées', 'Le menu s\'adapte à vos choix.', 'success'); }
        catch { try { showToast('✓ Préférences enregistrées'); } catch {} }
      }
      // Refresh menu if currently viewing
      if (typeof renderAll === 'function') {
        renderAll();
      } else if (typeof renderMenu === 'function') {
        renderMenu();
      }
    } else {
      console.error('❌ Failed to save preferences');
      if (typeof showToast === 'function') {
        try { showToast('Erreur', 'Impossible de sauvegarder. Réessayez.', 'error'); }
        catch { try { showToast('Erreur de sauvegarde'); } catch {} }
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

// Event delegation pour les actions de la modale Préférences alimentaires.
// Remplace les onclick="" inline qui foiraient silencieusement quand une
// extension navigateur (Grammarly, etc.) altère le scope global.
// Idempotent via window.__prefModalDelegationAttached.
if (!window.__prefModalDelegationAttached) {
  window.__prefModalDelegationAttached = true;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const profileId = btn.dataset.profileId;

    if (action === 'save-pref' && profileId) {
      console.log('[pref] save clicked', profileId);
      PreferenceManager.saveFromModal(profileId);
    } else if (action === 'close-pref-modal' && profileId) {
      const modal = document.getElementById(`preference-modal-${profileId}`);
      if (modal) modal.style.display = 'none';
    }
  });
}
