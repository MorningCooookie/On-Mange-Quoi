// ============================================
// FAMILY SHARING - Multi-Profile Management
// ============================================

const ProfileManager = {
  profiles: [],
  isSubscribed: false,
  userId: null,

  async init(userId) {
    this.userId = userId;
    if (!window.supabaseClient) {
      console.error('Supabase client not ready');
      return;
    }
    await this.loadProfiles();
    await this.checkSubscription();
    await this.renderProfiles();
    this.setupEventListeners();
  },

  async loadProfiles() {
    if (!this.userId || !window.supabaseClient) return;

    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading profiles:', error);
        // If table doesn't exist yet, create default profile
        this.profiles = [{ id: '1', user_id: this.userId, name: 'Ma famille', created_at: new Date() }];
      } else {
        this.profiles = data || [];
        // If no profiles, create default one
        if (this.profiles.length === 0) {
          await this.createProfile('Ma famille');
        }
      }
    } catch (err) {
      console.error('Profile load error:', err);
      this.profiles = [{ id: '1', user_id: this.userId, name: 'Ma famille', created_at: new Date() }];
    }
  },

  async checkSubscription() {
    // Subscription checking removed - all users have full access
    this.isSubscribed = true;
  },

  async createProfile(name) {
    if (!this.userId || !window.supabaseClient) return;

    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .insert({
          user_id: this.userId,
          name: name || 'Nouveau profil'
        })
        .select()
        .single();

      if (error) throw error;

      this.profiles.push(data);
      showToast('Profil créé', `${name || 'Nouveau profil'} ajouté avec succès.`, 'success');
      this.renderProfiles();
      document.getElementById('new-profile-name').value = '';
      return true;
    } catch (err) {
      console.error('Error creating profile:', err);
      showToast('Erreur', 'Impossible de créer le profil.', 'error');
      return false;
    }
  },

  async deleteProfile(profileId) {
    if (!this.userId || !window.supabaseClient) return false;
    if (this.profiles.length <= 1) {
      showToast('Impossible', 'Vous devez garder au moins un profil.', 'error');
      return false;
    }

    try {
      const { error } = await window.supabaseClient
        .from('profiles')
        .delete()
        .eq('id', profileId)
        .eq('user_id', this.userId);

      if (error) throw error;

      this.profiles = this.profiles.filter(p => p.id !== profileId);
      showToast('Profil supprimé', 'Le profil a été supprimé.', 'success');
      this.renderProfiles();
      return true;
    } catch (err) {
      console.error('Error deleting profile:', err);
      showToast('Erreur', 'Impossible de supprimer le profil.', 'error');
      return false;
    }
  },

  async selectProfile(profileId, profileName) {
    // Load preferences for this profile
    await PreferenceManager.loadPreferences(profileId);

    // Mémorise l'actif côté ProfileManager pour les autres pages
    this.activeProfile = { id: profileId, name: profileName };
    this.updateActiveProfileDisplay(profileName);

    // Notify app.js to update menu with this profile's preferences
    if (typeof setSupabaseProfile === 'function') {
      setSupabaseProfile(profileId, profileName);
    }

    // Close the modal
    const modal = document.getElementById('profiles-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  // Met à jour le nom affiché dans le dropdown "Mon compte" (#current-profile-name).
  // Indépendant d'app.js (qui n'est pas chargé partout) — fonctionne sur
  // toutes les pages où auth.js a injecté le markup user-menu.
  updateActiveProfileDisplay(name) {
    const el = document.getElementById('current-profile-name');
    if (!el) return;
    // Strip emojis éventuels (cohérent avec setSupabaseProfile dans app.js)
    const cleanName = (name || 'Mon profil')
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2000}-\u{206F}]/gu, '')
      .trim();
    el.textContent = cleanName || 'Mon profil';
  },

  async renderProfiles() {
    const list = document.getElementById('profiles-list');
    if (!list) return;

    // Load preferences for each profile
    for (const profile of this.profiles) {
      await PreferenceManager.loadPreferences(profile.id);
    }

    let html = '';

    for (const profile of this.profiles) {
      const prefs = PreferenceManager.getPreferences(profile.id);
      const tags = PreferenceManager.getPreferenceTags(prefs);
      const tagDisplay = tags.length > 0 ? `<div class="profile-item__tags">${tags.join(' ')}</div>` : '';
      const createdDate = new Date(profile.created_at).toLocaleDateString('fr-FR');

      html += `
        <div class="profile-item">
          <div class="profile-item__main" onclick="ProfileManager.selectProfile('${profile.id}', '${profile.name}'); return false;">
            <div class="profile-item__name">${profile.name}</div>
            <div class="profile-item__meta">Ajouté ${createdDate}</div>
            ${tagDisplay}
          </div>
          <div class="profile-item__actions">
            <button class="profile-item__btn profile-item__btn--prefs" onclick="ProfileManager.openPreferenceModal('${profile.id}', '${profile.name}'); return false;">Préférences</button>
            ${this.profiles.length > 1 ? `<button class="profile-item__btn profile-item__btn--delete" onclick="ProfileManager.deleteProfile('${profile.id}'); return false;" aria-label="Supprimer ${profile.name}">Supprimer</button>` : ''}
          </div>
        </div>
      `;
    }

    list.innerHTML = html;

    // Update profile count display
    const countEl = document.getElementById('profile-count');
    if (countEl) countEl.textContent = this.profiles.length;

    // Auto-select first profile (ensures preferences are loaded into cache)
    if (this.profiles.length > 0) {
      const firstProfile = this.profiles[0];
      this.activeProfile = { id: firstProfile.id, name: firstProfile.name };
      this.updateActiveProfileDisplay(firstProfile.name);
      if (typeof setSupabaseProfile === 'function') {
        setSupabaseProfile(firstProfile.id, firstProfile.name);
      }
    }
  },

  openPreferenceModal(profileId, profileName) {
    // Close user menu dropdown first
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
      userMenu.style.display = 'none';
    }

    // Always destroy and recreate the modal to get fresh state
    const existing = document.getElementById(`preference-modal-${profileId}`);
    if (existing) {
      existing.remove();
    }

    // Create the modal
    const modal = PreferenceManager.renderPreferenceModal(profileId, profileName, this.userId);
    const container = document.createElement('div');
    container.innerHTML = modal;
    const modalEl = container.firstElementChild;
    modalEl.style.zIndex = '30000';

    // Close on background click
    modalEl.addEventListener('click', (e) => {
      if (e.target.id === `preference-modal-${profileId}`) {
        modalEl.style.display = 'none';
      }
    });

    document.body.appendChild(modalEl);
    modalEl.style.display = 'flex';
  },

  setupEventListeners() {
    const addBtn = document.getElementById('btn-add-profile');
    const input = document.getElementById('new-profile-name');
    const familyBtn = document.getElementById('btn-family-sharing');

    if (addBtn) {
      addBtn.onclick = () => {
        const name = input.value.trim();
        if (!name) {
          showToast('Champ requis', 'Entrez un nom pour le profil.', 'error');
          return;
        }
        this.createProfile(name);
      };
    }

    if (input) {
      input.onkeypress = (e) => {
        if (e.key === 'Enter') addBtn?.click();
      };
    }

    if (familyBtn) {
      familyBtn.onclick = () => {
        document.getElementById('user-menu').style.display = 'none';
        document.getElementById('profiles-modal').style.display = 'flex';
      };
    }
  },

  async startCheckout() {
    if (!this.userId) {
      showToast('Erreur', 'Vous devez être connecté.', 'error');
      return;
    }

    try {
      showToast('Redirection...', 'Vous serez redirigé vers le paiement.', 'success');

      // Call Netlify serverless function for Stripe checkout
      const response = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Stripe API error:', response.status, response.statusText, errorText);
        showToast('Erreur Stripe', 'Le service de paiement est actuellement indisponible. Contactez hello@onmangequoi.eu', 'error');
        return;
      }

      const { sessionId } = await response.json();
      if (!window.Stripe) {
        showToast('Erreur', 'Service de paiement indisponible.', 'error');
        return;
      }

      const stripe = window.Stripe('pk_live_51TEo6ARSlTwKkI4xVuOB4z3b6IC3QnwsVYypBLSP2gxxW5t2EZBN4FZmD5rB6N08lRyP3njybKyphjwD6yLInXre00FUl5vZrY');
      await stripe.redirectToCheckout({ sessionId });
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('Erreur', 'Impossible de démarrer le paiement.', 'error');
    }
  }
};
