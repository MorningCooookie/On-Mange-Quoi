/**
 * Feature Flags
 * Control feature visibility for development/premium users
 */

const FEATURE_FLAGS = {
  PREFERENCES_FEATURE_ENABLED: false
};

function initializeFeatureFlags() {
  // Check URL parameter for dev mode (e.g., ?dev=true)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('dev') === 'true') {
    FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED = true;
  }

  // Check localStorage for persistent dev flag
  if (localStorage.getItem('dev-mode') === 'true') {
    FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED = true;
  }
}

function toggleDevMode() {
  FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED = !FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED;
  localStorage.setItem('dev-mode', FEATURE_FLAGS.PREFERENCES_FEATURE_ENABLED);
  location.reload();
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.FEATURE_FLAGS = FEATURE_FLAGS;
  window.initializeFeatureFlags = initializeFeatureFlags;
  window.toggleDevMode = toggleDevMode;
}
