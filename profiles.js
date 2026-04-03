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
    this.renderProfiles();
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

  renderProfiles() {
    const list = document.getElementById('profiles-list');
    if (!list) return;

    list.innerHTML = this.profiles.map(profile => `
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;padding:0.75rem;border-radius:8px;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:600;color:#1B4332;">${profile.name}</div>
          <div style="font-size:0.8rem;color:#999;">Créé le ${new Date(profile.created_at).toLocaleDateString('fr-FR')}</div>
        </div>
        ${this.profiles.length > 1 ? `<button onclick="ProfileManager.deleteProfile('${profile.id}'); return false;" style="padding:0.25rem 0.5rem;background:#fee2e2;color:#dc2626;border:none;border-radius:4px;cursor:pointer;font-size:0.85rem;font-weight:bold;">Supprimer</button>` : ''}
      </div>
    `).join('');

    // Update profile count display
    const countEl = document.getElementById('profile-count');
    if (countEl) countEl.textContent = this.profiles.length;
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
