// ============================================
// SUPABASE AUTHENTICATION - On Mange Quoi
// ============================================

const SUPABASE_URL = 'https://pozhsrnsezklfyqjoues.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QZK_OFTOFeLGgGgT8_Yd9w_CMFLFFfP';

// Importe Supabase depuis CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Debug: confirm script is loaded
console.log('✅ auth.js loaded');

// ============================================
// SHOW LOGIN MODAL (FROM HEADER BUTTONS)
// ============================================
const btnLoginHeader = document.getElementById('btn-login-header');
console.log('btn-login-header element:', btnLoginHeader);
btnLoginHeader?.addEventListener('click', () => {
  console.log('✅ Login button clicked');
  document.getElementById('auth-modal').style.display = 'flex';
  document.getElementById('login-email').focus();
});

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
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    localStorage.setItem('user-email', email);
    alert('✅ Connecté!');
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});

// ============================================
// SHOW SIGNUP MODAL (FROM HEADER BUTTON)
// ============================================
const btnSignupHeader = document.getElementById('btn-signup-header');
console.log('btn-signup-header element:', btnSignupHeader);
btnSignupHeader?.addEventListener('click', () => {
  console.log('✅ Signup button clicked');
  document.getElementById('auth-modal').style.display = 'flex';
  document.getElementById('login-email').focus();
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
    document.getElementById('auth-modal').style.display = 'none';
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});

// ============================================
// LOGOUT HANDLER (HEADER BUTTON)
// ============================================
document.getElementById('btn-logout-header')?.addEventListener('click', async () => {
  try {
    await supabase.auth.signOut();
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    localStorage.removeItem('user-email');
    alert('✅ Déconnecté');
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
});

// ============================================
// LOGOUT HANDLER (MODAL - kept for backwards compatibility)
// ============================================
document.getElementById('btn-logout')?.addEventListener('click', async () => {
  try {
    await supabase.auth.signOut();
    document.getElementById('auth-modal').style.display = 'none';
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
    // User is logged in - show header user menu
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('auth-button-group').style.display = 'none';
    document.getElementById('user-menu-header').style.display = 'flex';
    document.getElementById('user-email-header').textContent = session.user.email;
    document.getElementById('user-menu').style.display = 'none';
    localStorage.setItem('user-email', session.user.email);
  } else {
    // User is logged out - show header login buttons
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('auth-button-group').style.display = 'flex';
    document.getElementById('user-menu-header').style.display = 'none';
    document.getElementById('user-menu').style.display = 'none';
  }
});
