// ============================================
// SUPABASE AUTHENTICATION - On Mange Quoi
// ============================================
// Auth module utilisable sur toutes les pages avec une .landing-header.
// Responsabilités :
//   1. S'assurer que le markup user-menu (#user-menu-header + #user-menu)
//      existe dans la landing-header — l'injecter si absent.
//   2. Écouter la session Supabase et basculer le UI (login button ↔
//      Mon compte dropdown).
//   3. Gérer le logout.
// Pré-requis : le SDK Supabase + window.supabaseClient initialisé AVANT
// que ce script s'exécute. Sur la home, c'est fait inline dans index.html.

// Injecte le markup user-menu si absent — utilisé sur les pages internes
// qui n'ont pas le markup hardcodé. Idempotent.
function ensureAuthMarkup() {
  const actions = document.querySelector('.landing-header__actions');
  if (!actions) return; // Pas de landing-header sur cette page (ex: erreur 404)

  // Wrap les boutons existants dans #auth-button-group si pas déjà fait
  // (auth.js cherche cet ID pour cacher/montrer le groupe au login).
  if (!actions.id) actions.id = 'auth-button-group';

  // Si le bouton "Mon compte" n'existe pas, l'injecter juste après actions
  if (!document.getElementById('user-menu-header')) {
    const wrapper = document.createElement('div');
    wrapper.id = 'user-menu-header';
    wrapper.className = 'landing-header__user';
    wrapper.style.display = 'none';
    wrapper.innerHTML = `
      <button class="landing-header__user-btn" id="user-email-header" type="button">Mon compte ▾</button>
      <div id="user-menu" class="user-menu-dropdown" style="display:none;">
        <div class="user-menu-header">
          <div class="user-menu-email" id="user-email"></div>
        </div>
        <div class="user-menu-body">
          <a href="preferences.html" class="user-menu-btn">Mes préférences</a>
          <a href="semaine.html" class="user-menu-btn">Mon menu</a>
          <button type="button" class="user-menu-btn" id="btn-logout">Se déconnecter</button>
        </div>
      </div>
    `;
    actions.after(wrapper);
  }
}

// Toggle du dropdown user-menu (auparavant dans le inline d'index.html).
// On l'attache une seule fois au document — idempotent.
function ensureUserMenuToggle() {
  if (window.__userMenuToggleAttached) return;
  window.__userMenuToggleAttached = true;

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-menu');
    const accountBtn = document.getElementById('user-email-header');
    if (!menu) return;

    if (accountBtn && accountBtn.contains(e.target)) {
      menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
    } else if (!menu.contains(e.target)) {
      menu.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const menu = document.getElementById('user-menu');
      if (menu) menu.style.display = 'none';
    }
  });
}

async function checkSubscription(userId) {
  if (!window.supabaseClient || !userId) return false;
  try {
    const { data } = await window.supabaseClient
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .single();
    return data?.status === 'active';
  } catch {
    return false;
  }
}

async function updateAuthUI(session) {
  const authButtons = document.getElementById('auth-button-group');
  const userMenu = document.getElementById('user-menu-header');
  const userEmail = document.getElementById('user-email-header');
  const emailDropdown = document.getElementById('user-email');

  if (!authButtons || !userMenu) {
    console.warn('Auth UI elements not found');
    return;
  }

  if (session && session.user) {
    console.log('✅ User logged in:', session.user.email);
    authButtons.style.display = 'none !important';
    authButtons.style.visibility = 'hidden';
    userMenu.style.display = 'flex';
    userMenu.style.visibility = 'visible';

    if (userEmail) {
      userEmail.textContent = 'Mon compte';
      userEmail.style.cursor = 'pointer';
    }
    if (emailDropdown) {
      emailDropdown.textContent = session.user.email;
    }

    // Check premium subscription status
    window.isPremium = await checkSubscription(session.user.id);
    window.currentUserId = session.user.id;

    // Initialize profile management
    if (typeof ProfileManager !== 'undefined') {
      ProfileManager.init(session.user.id);
      console.log('✅ ProfileManager initialized with userId:', session.user.id);
    }

    // Initialize preferences button (premium feature)
    // Garde défensive : la classe PreferencesButton est définie dans
    // js/preferences-button.js, qui n'est pas inclus sur toutes les pages.
    // Sans cette garde, ReferenceError → crash de updateAuthUI → modale
    // login bloquée ouverte après connexion réussie.
    if (typeof PreferencesButton !== 'undefined') {
      if (!window.preferencesButton && window.supabaseClient) {
        window.preferencesButton = new PreferencesButton(window.supabaseClient);
        window.preferencesButton.setCurrentUser(session.user);
        console.log('✅ PreferencesButton initialized');
      } else if (window.preferencesButton) {
        window.preferencesButton.setCurrentUser(session.user);
      }
    }
  } else {
    console.log('❌ No session - showing auth buttons');
    authButtons.style.display = 'flex';
    authButtons.style.visibility = 'visible';
    userMenu.style.display = 'none';
    userMenu.style.visibility = 'hidden';
  }
}

// Setup auth listener when Supabase client becomes available
function setupAuthListener() {
  if (!window.supabaseClient || !window.supabaseClient.auth) {
    setTimeout(setupAuthListener, 100);
    return;
  }

  try {
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
      updateAuthUI(session);
    });

    // Check initial state
    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
      updateAuthUI(session);
    });

    console.log('✅ Auth listener setup complete');
  } catch (err) {
    console.error('Auth listener setup failed:', err.message);
  }
}

// Start listening for auth state changes
// Sur les pages internes, on doit d'abord injecter le markup user-menu
// si absent (la home le hardcode ; les autres pages s'appuient sur
// l'injection dynamique).
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ensureAuthMarkup();
    ensureUserMenuToggle();
    setupAuthListener();
  });
} else {
  ensureAuthMarkup();
  ensureUserMenuToggle();
  setupAuthListener();
}

// ============================================
// LOGOUT HANDLERS
// ============================================
function setupLogoutHandlers() {
  const logoutBtn = document.getElementById('btn-logout');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (!window.supabaseClient || !window.supabaseClient.auth) {
        updateAuthUI(null);
        return;
      }

      try {
        await window.supabaseClient.auth.signOut();
        showToast('Déconnecté', 'À bientôt!', 'success');
        // Close menu if open
        const menu = document.getElementById('user-menu');
        if (menu) menu.style.display = 'none';
      } catch (err) {
        showToast('Erreur', err.message, 'error');
      }
    });
  }
}

// Setup logout when page is ready
setTimeout(setupLogoutHandlers, 500);
