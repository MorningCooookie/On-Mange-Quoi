/**
 * Tests pour le module preferences
 * Tests unitaires pour les fonctions de gestion des préférences alimentaires
 */

const {
  loadUserPreferences,
  validatePreferenceInput,
  saveUserPreferences
} = require('../js/preferences.js');

// Helper: Creates a properly structured mock Supabase client
function createMockSupabaseClient(result) {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(result)
          })
        })
      }),
      upsert: jest.fn().mockResolvedValue(result)
    })
  };
}

describe('preferences module', () => {
  test('loadUserPreferences returns user preferences from Supabase', async () => {
    const mockSupabase = createMockSupabaseClient({
      data: {
        hard_constraints: [{ ingredient: 'shellfish', reason: 'allergy' }],
        soft_preferences: [{ ingredient: 'liver', reason: 'dislike' }]
      },
      error: null
    });

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
    const mockSupabase = createMockSupabaseClient({
      data: {
        user_id: 'user123',
        profile_id: 'couple',
        hard_constraints: [{ ingredient: 'nuts', reason: 'allergy' }],
        soft_preferences: []
      },
      error: null
    });

    const result = await saveUserPreferences(mockSupabase, 'user123', 'couple', {
      hard_constraints: [{ ingredient: 'nuts', reason: 'allergy' }],
      soft_preferences: []
    });

    expect(result).toBeDefined();
    expect(result.user_id).toBe('user123');
  });

  test('loadUserPreferences throws when user not found', async () => {
    const mockSupabase = createMockSupabaseClient({
      data: null,
      error: { message: 'No rows returned' }
    });

    await expect(
      loadUserPreferences(mockSupabase, 'nonexistent', 'couple')
    ).rejects.toThrow('Failed to load user preferences');
  });

  test('loadUserPreferences throws when missing required parameters', async () => {
    await expect(
      loadUserPreferences(null, 'user123', 'couple')
    ).rejects.toThrow('Invalid input');

    await expect(
      loadUserPreferences({}, null, 'couple')
    ).rejects.toThrow('Invalid input');

    await expect(
      loadUserPreferences({}, 'user123', null)
    ).rejects.toThrow('Invalid input');
  });

  test('saveUserPreferences throws when missing required parameters', async () => {
    const mockSupabase = createMockSupabaseClient({ data: null, error: null });

    await expect(
      saveUserPreferences(null, 'user123', 'couple', {})
    ).rejects.toThrow('Invalid input');
  });

  test('saveUserPreferences throws when preferences is not an object', async () => {
    const mockSupabase = createMockSupabaseClient({ data: null, error: null });

    await expect(
      saveUserPreferences(mockSupabase, 'user123', 'couple', null)
    ).rejects.toThrow('Invalid input: preferences must be an object');

    await expect(
      saveUserPreferences(mockSupabase, 'user123', 'couple', 'invalid')
    ).rejects.toThrow('Invalid input: preferences must be an object');
  });

  test('saveUserPreferences throws on Supabase error', async () => {
    const mockSupabase = createMockSupabaseClient({
      data: null,
      error: { message: 'Database connection failed' }
    });

    await expect(
      saveUserPreferences(mockSupabase, 'user123', 'couple', {
        hard_constraints: [],
        soft_preferences: []
      })
    ).rejects.toThrow('Failed to save user preferences');
  });
});
