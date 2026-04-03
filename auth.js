// ============================================
// SUPABASE AUTHENTICATION - On Mange Quoi
// ============================================
// Simplified auth module that works with window.supabaseClient
// initialized in index.html

function updateAuthUI(session) {
  const authButtons = document.getElementById('auth-button-group');
  const userMenu = document.getElementById('user-menu-header');

  if (!authButtons || !userMenu) return;

  if (session) {
    authButtons.style.display = 'none';
    userMenu.style.display = 'flex';
    document.getElementById('user-email-header').textContent = session.user.email;

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
document.getElementById('btn-logout-header')?.addEventListener('click', async () => {
  if (!window.supabaseClient || !window.supabaseClient.auth) {
    updateAuthUI(null);
    return;
  }

  try {
    await window.supabaseClient.auth.signOut();
    alert('✅ Déconnecté');
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  if (!window.supabaseClient || !window.supabaseClient.auth) {
    updateAuthUI(null);
    return;
  }

  try {
    await window.supabaseClient.auth.signOut();
    alert('✅ Déconnecté');
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});
