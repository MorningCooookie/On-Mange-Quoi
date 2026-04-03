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
    if (!this.userId || !window.supabaseClient) return;

    try {
      const { data, error } = await window.supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'active')
        .single();

      this.isSubscribed = !error && data;
    } catch (err) {
      console.log('Subscription check (expected if no subscription):', err.message);
      this.isSubscribed = false;
    }
  },

  async createProfile(name) {
    if (!this.userId || !window.supabaseClient) return;

    // Check free limit (1 profile)
    if (!this.isSubscribed && this.profiles.length >= 1) {
      showToast('Limite atteinte', 'Passez à Family Sharing pour créer plus de profils.', 'error');
      this.showPaywall();
      return false;
    }

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

    // Update status display
    const statusEl = document.getElementById('profile-status');
    const countEl = document.getElementById('profile-count');
    const limitEl = document.getElementById('profile-limit');
    const paywallEl = document.getElementById('paywall-section');

    if (statusEl) {
      statusEl.textContent = this.isSubscribed ? '✅ Family Sharing actif' : '🆓 Version gratuite';
      statusEl.style.color = this.isSubscribed ? '#16A34A' : '#DC2626';
    }
    if (countEl) countEl.textContent = this.profiles.length;
    if (limitEl) limitEl.style.display = !this.isSubscribed ? 'inline' : 'none';
    if (paywallEl) paywallEl.style.display = (!this.isSubscribed && this.profiles.length >= 1) ? 'block' : 'none';
  },

  showPaywall() {
    const paywallEl = document.getElementById('paywall-section');
    if (paywallEl) {
      paywallEl.style.display = 'block';
      paywallEl.scrollIntoView({ behavior: 'smooth' });
    }
  },

  setupEventListeners() {
    const addBtn = document.getElementById('btn-add-profile');
    const input = document.getElementById('new-profile-name');
    const subscribeBtn = document.getElementById('btn-subscribe');
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

    if (subscribeBtn) {
      subscribeBtn.onclick = async () => {
        await this.startCheckout();
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

      // Call your Stripe backend endpoint
      // This is a placeholder - you'll need a backend for this
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId })
      });

      if (!response.ok) {
        showToast('Erreur Stripe', 'Le service de paiement est actuellement indisponible. Contactez hello@onmangequoi.eu', 'error');
        console.error('Stripe API error:', response.statusText);
        return;
      }

      const { sessionId } = await response.json();
      if (!window.Stripe) {
        showToast('Erreur', 'Service de paiement indisponible.', 'error');
        return;
      }

      const stripe = window.Stripe('pk_live_YOUR_KEY_HERE'); // Replace with actual Stripe key
      await stripe.redirectToCheckout({ sessionId });
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('Erreur', 'Impossible de démarrer le paiement.', 'error');
    }
  }
};
