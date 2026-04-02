// ============================================
// SUPABASE AUTHENTICATION - On Mange Quoi
// ============================================

const SUPABASE_URL = 'https://pozhsrnsezklfyqjoues.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QZK_OFTOFeLGgGgT8_Yd9w_CMFLFFfP';

// Importe Supabase depuis CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// LOGIN HANDLER
// ============================================
document.getElementById('btn-login')?.addEventListener('click', async () => {
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

    // Connexion réussie
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('user-menu').style.display = 'block';
    document.getElementById('user-email').textContent = email;
    localStorage.setItem('user-email', email);
    alert('✅ Connecté!');
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});

// ============================================
// SIGNUP HANDLER
// ============================================
document.getElementById('btn-signup')?.addEventListener('click', async () => {
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
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});

// ============================================
// LOGOUT HANDLER
// ============================================
document.getElementById('btn-logout')?.addEventListener('click', async () => {
  try {
    await supabase.auth.signOut();
    document.getElementById('auth-modal').style.display = 'flex';
    document.getElementById('user-menu').style.display = 'none';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    localStorage.removeItem('user-email');
    alert('✅ Déconnecté');
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});

// ============================================
// CHECK IF USER IS ALREADY LOGGED IN
// ============================================
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('user-menu').style.display = 'block';
    document.getElementById('user-email').textContent = session.user.email;
    localStorage.setItem('user-email', session.user.email);
  } else {
    document.getElementById('auth-modal').style.display = 'flex';
    document.getElementById('user-menu').style.display = 'none';
  }
});
