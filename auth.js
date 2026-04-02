// ============================================
// SUPABASE AUTHENTICATION - On Mange Quoi
// ============================================

const SUPABASE_URL = 'https://pozhsrnsezklfyqjoues.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QZK_OFTOFeLGgGgT8_Yd9w_CMFLFFfP';

let supabase = null;

// Wait for Supabase to load from CDN
function initSupabase() {
  try {
    if (window.supabase && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      setupAuthListener();
      return true;
    }
  } catch (err) {
    console.error('Supabase init failed:', err);
  }
  return false;
}

// Try immediately, then retry if not ready
if (!initSupabase()) {
  setTimeout(() => {
    if (!initSupabase()) {
      setTimeout(initSupabase, 1000);
    }
  }, 100);
}

// ============================================
// AUTH STATE LISTENER
// ============================================
function setupAuthListener() {
  if (!supabase) return;

  supabase.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session);
  });

  // Check initial state
  supabase.auth.getSession().then(({ data: { session } }) => {
    updateAuthUI(session);
  });
}

// ============================================
// UI STATE
// ============================================
function updateAuthUI(session) {
  const authButtons = document.getElementById('auth-button-group');
  const userMenu = document.getElementById('user-menu-header');

  if (!authButtons || !userMenu) return;

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
// LOGIN/SIGNUP HANDLERS
// ============================================
async function handleLogin() {
  console.log('handleLogin called - START');
  alert('🔄 Connexion en cours...');

  try {
    if (!supabase) {
      console.error('Supabase not initialized');
      alert('❌ Service d\'authentification indisponible. Supabase not loaded.');
      return;
    }

    const emailEl = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');

    if (!emailEl || !passwordEl) {
      alert('❌ Erreur: Les champs ne sont pas trouvés');
      return;
    }

    const email = emailEl.value.trim();
    const password = passwordEl.value;

    console.log('Login attempt with email:', email);

    if (!email || !password) {
      alert('Veuillez entrer email et mot de passe');
      return;
    }

    console.log('Calling Supabase signInWithPassword...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    console.log('Supabase response:', { data, error });

    if (error) {
      alert('❌ Erreur Supabase: ' + error.message);
      return;
    }

    document.getElementById('login-modal').style.display = 'none';
    emailEl.value = '';
    passwordEl.value = '';
    alert('✅ Connecté!');
  } catch (err) {
    console.error('Login error:', err);
    alert('❌ Erreur: ' + err.message);
  }
}

async function handleSignup() {
  console.log('handleSignup called - START');
  alert('🔄 Création de compte en cours...');

  try {
    if (!supabase) {
      console.error('Supabase not initialized');
      alert('❌ Service d\'authentification indisponible. Supabase not loaded.');
      return;
    }

    const emailEl = document.getElementById('signup-email');
    const passwordEl = document.getElementById('signup-password');

    if (!emailEl || !passwordEl) {
      alert('❌ Erreur: Les champs ne sont pas trouvés');
      return;
    }

    const email = emailEl.value.trim();
    const password = passwordEl.value;

    console.log('Signup attempt with email:', email);

    if (!email || !password) {
      alert('Veuillez entrer email et mot de passe');
      return;
    }

    if (password.length < 6) {
      alert('Le mot de passe doit faire au moins 6 caractères');
      return;
    }

    console.log('Calling Supabase signUp...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    console.log('Supabase response:', { data, error });

    if (error) {
      alert('❌ Erreur Supabase: ' + error.message);
      return;
    }

    document.getElementById('signup-modal').style.display = 'none';
    emailEl.value = '';
    passwordEl.value = '';
    alert('✅ Compte créé! Vérifiez votre email pour confirmer.');
  } catch (err) {
    console.error('Signup error:', err);
    alert('❌ Erreur: ' + err.message);
  }
}

// ============================================
// MODAL CLOSE BUTTON
// ============================================
document.getElementById('btn-close-modal')?.addEventListener('click', hideModal);

// Click outside modal to close
document.getElementById('auth-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'auth-modal') hideModal();
});

// ============================================
// HEADER BUTTON HANDLERS - ALWAYS WORK
// ============================================
const btnLoginHeader = document.getElementById('btn-login-header');
const btnSignupHeader = document.getElementById('btn-signup-header');

if (btnLoginHeader) {
  btnLoginHeader.addEventListener('click', showModal);
  console.log('✓ btn-login-header listener attached');
} else {
  console.error('❌ btn-login-header not found in DOM');
}

if (btnSignupHeader) {
  btnSignupHeader.addEventListener('click', showModal);
  console.log('✓ btn-signup-header listener attached');
} else {
  console.error('❌ btn-signup-header not found in DOM');
}

// Test modal function
console.log('Auth module loaded. Modal ID exists:', !!document.getElementById('auth-modal'));
console.log('Supabase library available:', !!window.supabase);
console.log('Supabase client initialized:', !!supabase);

// ============================================
// LOGIN HANDLER
// ============================================
document.getElementById('btn-login')?.addEventListener('click', async () => {
  if (!supabase) {
    alert('❌ Service d\'authentification indisponible. Vérifiez votre connexion internet.');
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

// ============================================
// SIGNUP HANDLER
// ============================================
document.getElementById('btn-signup')?.addEventListener('click', async () => {
  if (!supabase) {
    alert('❌ Service d\'authentification indisponible. Vérifiez votre connexion internet.');
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

// ============================================
// LOGOUT HANDLERS
// ============================================
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
