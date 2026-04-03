// ============================================
// SUPABASE AUTHENTICATION - On Mange Quoi
// ============================================
// Simplified auth module that works with window.supabaseClient
// initialized in index.html

function updateAuthUI(session) {
  const authButtons = document.getElementById('auth-button-group');
  const userMenu = document.getElementById('user-menu-header');
  const userEmail = document.getElementById('user-email-header');

  if (!authButtons || !userMenu) return;

  if (session) {
    authButtons.style.display = 'none';
    userMenu.style.display = 'flex';
    if (userEmail) {
      userEmail.textContent = session.user.email;
      userEmail.style.cursor = 'pointer';

      // Remove old listeners to prevent duplicates
      const newEmail = userEmail.cloneNode(true);
      userEmail.parentNode.replaceChild(newEmail, userEmail);

      // Add click listener to new element
      newEmail.addEventListener('click', () => {
        const menu = document.getElementById('user-menu');
        if (menu) {
          menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
      });
    }

    // Initialize profile management
    if (typeof ProfileManager !== 'undefined') {
      ProfileManager.init(session.user.id);
    }
  } else {
    authButtons.style.display = 'flex';
    userMenu.style.display = 'none';
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
  const logoutHeaderBtn = document.getElementById('btn-logout-header');
  const logoutBtn = document.getElementById('btn-logout');

  if (logoutHeaderBtn) {
    logoutHeaderBtn.addEventListener('click', async () => {
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

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (!window.supabaseClient || !window.supabaseClient.auth) {
        updateAuthUI(null);
        return;
      }

      try {
        await window.supabaseClient.auth.signOut();
        showToast('Déconnecté', 'À bientôt!', 'success');
      } catch (err) {
        showToast('Erreur', err.message, 'error');
      }
    });
  }
}

// Setup logout when page is ready
setTimeout(setupLogoutHandlers, 500);
