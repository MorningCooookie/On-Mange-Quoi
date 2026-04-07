/**
 * Test suite for preference substitution feature
 * Run in browser console: node_modules would load PreferenceSubstitution after init()
 * Or run manually after page loads with all modules initialized
 */

const PreferenceSubstitutionTest = {
  passed: 0,
  failed: 0,

  async runAllTests() {
    console.log('🧪 Starting preference substitution tests...\n');

    // Wait for PreferenceSubstitution to be ready
    if (!PreferenceSubstitution || !PreferenceSubstitution.allMeals || PreferenceSubstitution.allMeals.length === 0) {
      console.error('❌ PreferenceSubstitution not initialized. Waiting...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!PreferenceSubstitution.allMeals || PreferenceSubstitution.allMeals.length === 0) {
        console.error('❌ Failed: PreferenceSubstitution still not ready');
        return;
      }
    }

    this.testMealDatabaseLoaded();
    this.testIsMealSafe();
    this.testScoreMealMatch();
    this.testFindBestAlternative();
    this.testApplySubstitutions();

    console.log(`\n✨ Test results: ${this.passed} passed, ${this.failed} failed\n`);
  },

  testMealDatabaseLoaded() {
    console.log('Test 1: Meal database loaded');
    const mealCount = PreferenceSubstitution.allMeals.length;
    if (mealCount > 0) {
      console.log(`✅ Database loaded with ${mealCount} meals`);
      this.passed++;
    } else {
      console.error('❌ Meal database is empty');
      this.failed++;
    }
  },

  testIsMealSafe() {
    console.log('\nTest 2: isMealSafe() function');

    // Find a meal with dairy
    const dairyMeal = PreferenceSubstitution.allMeals.find(m => m.allergens?.includes('dairy'));
    if (!dairyMeal) {
      console.warn('⚠️ No dairy meal found to test');
      return;
    }

    // Test with dairy allergy
    const preferencesWithDairyAllergy = {
      allergies: ['dairy'],
      restrictions: [],
      dislikes: []
    };

    const isSafe = PreferenceSubstitution.isMealSafe(dairyMeal.name, preferencesWithDairyAllergy);

    if (!isSafe) {
      console.log(`✅ Correctly identified "${dairyMeal.name}" as unsafe for dairy allergy`);
      this.passed++;
    } else {
      console.error(`❌ Failed: "${dairyMeal.name}" should be unsafe for dairy allergy`);
      this.failed++;
    }

    // Test with no preferences
    const isSafeNoPrefs = PreferenceSubstitution.isMealSafe(dairyMeal.name, { allergies: [], restrictions: [], dislikes: [] });
    if (isSafeNoPrefs) {
      console.log(`✅ Correctly identified "${dairyMeal.name}" as safe when no preferences`);
      this.passed++;
    } else {
      console.error(`❌ Failed: "${dairyMeal.name}" should be safe with no preferences`);
      this.failed++;
    }
  },

  testScoreMealMatch() {
    console.log('\nTest 3: scoreMealMatch() function');

    const meal1 = {
      difficulty: 'easy',
      kidFriendly: true,
      ingredients: ['fish', 'rice', 'vegetables']
    };
    const meal2 = {
      difficulty: 'easy',
      kidFriendly: true,
      ingredients: ['fish', 'rice', 'carrots']
    };
    const meal3 = {
      difficulty: 'hard',
      kidFriendly: false,
      ingredients: ['beef', 'spices', 'herbs']
    };

    const score1 = PreferenceSubstitution.scoreMealMatch(meal1, meal2);
    const score2 = PreferenceSubstitution.scoreMealMatch(meal1, meal3);

    if (score1 > score2) {
      console.log(`✅ Similar meals score higher (${score1.toFixed(2)}) than different meals (${score2.toFixed(2)})`);
      this.passed++;
    } else {
      console.error(`❌ Failed: Score logic incorrect. Similar: ${score1.toFixed(2)}, Different: ${score2.toFixed(2)}`);
      this.failed++;
    }

    if (score1 <= 1 && score1 >= 0) {
      console.log(`✅ Score is normalized between 0-1: ${score1.toFixed(2)}`);
      this.passed++;
    } else {
      console.error(`❌ Failed: Score out of range: ${score1}`);
      this.failed++;
    }
  },

  testFindBestAlternative() {
    console.log('\nTest 4: findBestAlternative() function');

    // Find a breakfast meal with dairy
    const originalMeal = PreferenceSubstitution.allMeals.find(m =>
      m.category === 'breakfast' && m.allergens?.includes('dairy')
    );

    if (!originalMeal) {
      console.warn('⚠️ No breakfast meal with dairy found');
      return;
    }

    const preferences = { allergies: ['dairy'], restrictions: [], dislikes: [] };
    const alternative = PreferenceSubstitution.findBestAlternative(originalMeal, preferences);

    if (alternative) {
      console.log(`✅ Found alternative: "${originalMeal.name}" → "${alternative.name}"`);

      // Verify alternative is in same category
      if (alternative.category === originalMeal.category) {
        console.log(`✅ Alternative is in same category (${alternative.category})`);
        this.passed++;
      } else {
        console.error(`❌ Alternative is in different category: ${alternative.category}`);
        this.failed++;
      }

      // Verify alternative is safe
      if (PreferenceSubstitution.isMealSafe(alternative.name, preferences)) {
        console.log(`✅ Alternative is safe for dairy allergy`);
        this.passed++;
      } else {
        console.error(`❌ Alternative is NOT safe for dairy allergy`);
        this.failed++;
      }
    } else {
      console.warn(`⚠️ No alternative found for "${originalMeal.name}"`);
    }
  },

  async testApplySubstitutions() {
    console.log('\nTest 5: applySubstitutions() function');

    // Create a test menu
    const testMenu = {
      weekStart: '2026-04-06',
      weekEnd: '2026-04-12',
      days: [
        {
          label: 'Lundi',
          date: '2026-04-06',
          meals: {
            breakfast: {
              name: 'Yaourt nature, muesli maison, kiwi',
              icon: '🌅',
              prepTime: '5',
              ingredients: ['yaourt', 'muesli', 'kiwi'],
              riskLevel: 'low'
            },
            lunch: {
              name: 'Pâtes au beurre et parmesan',
              icon: '🍝',
              prepTime: '15',
              ingredients: ['pates', 'beurre', 'parmesan'],
              riskLevel: 'low'
            }
          }
        }
      ]
    };

    const preferences = { allergies: ['dairy'], restrictions: [], dislikes: [] };
    const result = await PreferenceSubstitution.applySubstitutions(testMenu, 'test-profile-id');

    if (result.substitutionCount > 0) {
      console.log(`✅ Applied ${result.substitutionCount} substitutions`);
      this.passed++;
    } else {
      console.warn(`⚠️ No substitutions applied (menu might not have conflicts)`);
    }

    if (result.alerts && result.alerts.length > 0) {
      console.log(`✅ Generated ${result.alerts.length} alerts`);
      this.passed++;
    }

    // Verify menu structure is preserved
    if (result.menu && result.menu.days && result.menu.days.length > 0) {
      console.log(`✅ Menu structure preserved`);
      this.passed++;
    } else {
      console.error(`❌ Menu structure broken`);
      this.failed++;
    }
  }
};

// Auto-run tests if this file is loaded in browser after PreferenceSubstitution
if (typeof PreferenceSubstitution !== 'undefined') {
  PreferenceSubstitutionTest.runAllTests();
}
