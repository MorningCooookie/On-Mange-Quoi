/**
 * Module de gestion des préférences alimentaires
 * Charge, sauvegarde et valide les préférences utilisateur (allergies, dégoûts)
 */

async function loadUserPreferences(supabaseClient, userId, profileId) {
  // Valider les paramètres obligatoires
  if (!supabaseClient || !userId || !profileId) {
    throw new Error('Invalid input: userId, profileId, and supabaseClient required');
  }

  try {
    const { data, error } = await supabaseClient
      .from('user_preferences')
      .select('hard_constraints, soft_preferences')
      .eq('user_id', userId)
      .eq('profile_id', profileId)
      .single();

    if (error) {
      throw new Error(`Failed to load user preferences: ${error.message}`);
    }

    return {
      hard_constraints: data.hard_constraints || [],
      soft_preferences: data.soft_preferences || []
    };
  } catch (err) {
    throw err;
  }
}

function validatePreferenceInput(ingredient, type) {
  // Valider que l'ingrédient n'est pas vide
  if (typeof ingredient !== 'string' || ingredient.trim().length === 0) {
    return false;
  }

  // Valider que le type est l'un des types autorisés
  if (!['allergy', 'dislike'].includes(type)) {
    return false;
  }

  return true;
}

async function saveUserPreferences(supabaseClient, userId, profileId, preferences) {
  // Valider les paramètres obligatoires
  if (!supabaseClient || !userId || !profileId) {
    throw new Error('Invalid input: userId, profileId, and supabaseClient required');
  }

  // Valider que preferences est un objet
  if (!preferences || typeof preferences !== 'object') {
    throw new Error('Invalid input: preferences must be an object');
  }

  try {
    const { data, error } = await supabaseClient
      .from('user_preferences')
      .upsert({
        user_id: userId,
        profile_id: profileId,
        hard_constraints: preferences.hard_constraints || [],
        soft_preferences: preferences.soft_preferences || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,profile_id' });

    if (error) {
      throw new Error(`Failed to save user preferences: ${error.message}`);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  loadUserPreferences,
  validatePreferenceInput,
  saveUserPreferences
};
