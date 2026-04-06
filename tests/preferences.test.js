/**
 * Tests pour le module preferences
 * Tests unitaires pour les fonctions de gestion des préférences alimentaires
 */

const {
  loadUserPreferences,
  validatePreferenceInput,
  saveUserPreferences
} = require('../js/preferences.js');

describe('preferences module', () => {
  test('loadUserPreferences returns user preferences from Supabase', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  hard_constraints: [{ ingredient: 'shellfish', reason: 'allergy' }],
                  soft_preferences: [{ ingredient: 'liver', reason: 'dislike' }]
                }
              })
            })
          })
        })
      })
    };

    const prefs = await loadUserPreferences(mockSupabase, 'user123', 'couple');
    expect(prefs.hard_constraints).toHaveLength(1);
    expect(prefs.soft_preferences).toHaveLength(1);
  });

  test('validatePreferenceInput rejects invalid ingredient names', () => {
    const valid = validatePreferenceInput('shellfish', 'allergy');
    const invalid = validatePreferenceInput('', 'allergy');

    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });

  test('validatePreferenceInput rejects invalid preference type', () => {
    const invalid = validatePreferenceInput('shellfish', 'invalid');
    expect(invalid).toBe(false);
  });

  test('saveUserPreferences upserts preferences to Supabase', async () => {
    const mockSupabase = {
      from: () => ({
        upsert: async (data) => {
          return { data, error: null };
        }
      })
    };

    const result = await saveUserPreferences(mockSupabase, 'user123', 'couple', {
      hard_constraints: [{ ingredient: 'nuts', reason: 'allergy' }],
      soft_preferences: []
    });

    expect(result).toBeDefined();
  });

  test('loadUserPreferences returns empty constraints if user not found', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({
                data: null,
                error: 'No data'
              })
            })
          })
        })
      })
    };

    const prefs = await loadUserPreferences(mockSupabase, 'nonexistent', 'couple');
    expect(prefs.hard_constraints).toHaveLength(0);
    expect(prefs.soft_preferences).toHaveLength(0);
  });
});
