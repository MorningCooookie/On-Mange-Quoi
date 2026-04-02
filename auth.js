// ============================================
// SUPABASE AUTHENTICATION - On Mange Quoi
// ============================================

const SUPABASE_URL = 'https://pozhsrnsezklfyqjoues.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QZK_OFTOFeLGgGgT8_Yd9w_CMFLFFfP';

let supabase = null;

// Initialize Supabase
(async () => {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Set up auth state listener
    supabase.auth.onAuthStateChange((event, session) => {
      updateAuthUI(session);
    });

    // Check initial auth state
    const { data: { session } } = await supabase.auth.getSession();
    updateAuthUI(session);
  } catch (err) {
    console.error('Supabase init failed:', err);
  }
})();

// ============================================
// UI STATE MANAGEMENT
// ============================================
function updateAuthUI(session) {
  const authButtons = document.getElementById('auth-button-group');
  const userMenu = document.getElementById('user-menu-header');

  if (session) {
    authButtons.style.display = 'none';
    userMenu.style.display = 'flex';
    document.getElementById('user-email-header').textContent = session.user.email;
  } else {
    authButtons.style.display = 'flex';
    userMenu.style.display = 'none';
  }
}

function showModal() {
  document.getElementById('auth-modal').style.display = 'flex';
  document.getElementById('login-email').focus();
}

function hideModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

// ============================================
// BUTTON CLICK HANDLERS - ALWAYS WORK
// ============================================
document.getElementById('btn-login-header')?.addEventListener('click', showModal);
document.getElementById('btn-signup-header')?.addEventListener('click', showModal);

// ============================================
// MODAL HANDLERS - REQUIRE SUPABASE
// ============================================
document.getElementById('btn-login')?.addEventListener('click', async () => {
  if (!supabase) {
    alert('❌ Service d\'authentification indisponible');
    return;
  }

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    alert('Veuillez entrer email et mot de passe');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert('❌ Erreur: ' + error.message);
      return;
    }

    hideModal();
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    alert('✅ Connecté!');
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});

document.getElementById('btn-signup')?.addEventListener('click', async () => {
  if (!supabase) {
    alert('❌ Service d\'authentification indisponible');
    return;
  }

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    alert('Veuillez entrer email et mot de passe');
    return;
  }

  if (password.length < 6) {
    alert('Le mot de passe doit faire au moins 6 caractères');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      alert('❌ Erreur: ' + error.message);
      return;
    }

    alert('✅ Compte créé! Vérifiez votre email pour confirmer.');
    hideModal();
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});

document.getElementById('btn-logout-header')?.addEventListener('click', async () => {
  if (!supabase) {
    localStorage.removeItem('user-email');
    updateAuthUI(null);
    return;
  }

  try {
    await supabase.auth.signOut();
    localStorage.removeItem('user-email');
    alert('✅ Déconnecté');
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  if (!supabase) {
    localStorage.removeItem('user-email');
    updateAuthUI(null);
    return;
  }

  try {
    await supabase.auth.signOut();
    localStorage.removeItem('user-email');
    alert('✅ Déconnecté');
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});