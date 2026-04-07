// ============================================
// SUPABASE AUTHENTICATION - On Mange Quoi
// ============================================
// Simplified auth module that works with window.supabaseClient
// initialized in index.html

function updateAuthUI(session) {
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
      userEmail.textContent = 'Mon compte ▾';
      userEmail.style.cursor = 'pointer';
      userEmail.onclick = function(e) {
        e.stopPropagation();
        const menu = document.getElementById('user-menu');
        if (menu) {
          menu.style.display = menu.style.display === 'none' || !menu.style.display ? 'flex' : 'none';
        }
      };
    }
    // Populate email in dropdown
    if (emailDropdown) {
      emailDropdown.textContent = session.user.email;
    }

    // Initialize profile management
    if (typeof ProfileManager !== 'undefined') {
      ProfileManager.init(session.user.id);
      console.log('✅ ProfileManager initialized with userId:', session.user.id);
    }

    // Initialize preferences button (premium feature)
    if (!window.preferencesButton && window.supabaseClient) {
      window.preferencesButton = new PreferencesButton(window.supabaseClient);
      window.preferencesButton.setCurrentUser(session.user);
      console.log('✅ PreferencesButton initialized');
    } else if (window.preferencesButton) {
      window.preferencesButton.setCurrentUser(session.user);
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
setupAuthListener();

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
