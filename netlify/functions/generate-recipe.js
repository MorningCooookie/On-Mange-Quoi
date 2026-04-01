// Netlify Function : proxy sécurisé vers l'API Claude
// Clé API dans les variables d'env Netlify — jamais dans le code

const Anthropic = require("@anthropic-ai/sdk");

// Contraintes santé communes aux deux modes
const HEALTH_CONSTRAINTS = `
CONTRAINTES SANTÉ (toujours actives) :
- Anti-cadmium : limiter pommes de terre (max 3×/semaine), pain blanc, céréales industrielles
- Anti-mercure : pas de thon ni espadon, saumon max 2×/mois — préférer cabillaud, lieu noir, maquereau
- Pesticides : fruits bio recommandés pour fraises, raisins, pêches, pommes
- Élevage : préférer volailles Label Rouge ou plein air, œufs code 0 ou 1
- Privilégier légumineuses (lentilles, pois chiches, haricots), poissons blancs, légumes colorés`;

// Profils familiaux
const PROFILES = {
  famille: "Famille Jordan O'Shea : Kevin (adulte), Mina (adulte), enfant 6 ans, enfant 3 ans → 4 portions. Sans porc (pas de lardons, chorizo, jambon de charcuterie industrielle). Pas épicé (enfants) — paprika doux, cumin, curcuma OK, pas de piment ni curry fort.",
  couple: "Couple adulte : 2 portions. Sans porc. Peut être légèrement relevé mais rester accessible.",
  solo: "1 personne adulte : 1 portion. Sans porc."
};

// Prompt Thermomix
function buildThermomixPrompt(profile) {
  return `Tu es un assistant culinaire Thermomix (TM5 ou TM6) pour la famille.

PROFIL : ${PROFILES[profile] || PROFILES.famille}
${HEALTH_CONSTRAINTS}

INSTRUCTIONS :
- Génère directement la recette complète sans poser de questions
- Cuisson max 45 minutes
- Chaque étape Thermomix mentionne : température (°C), vitesse, durée
- Utilise les techniques : Varoma, sens inverse, Turbo quand approprié

FORMAT EXACT :

### 🍽️ [Nom du plat]
*Pour X personnes · Y min · Thermomix*

**Ingrédients**
- [quantité] [ingrédient]

**Préparation**
1. [action] → *[température]°C / vitesse [X] / [durée]*

**💡 Astuce famille** : [conseil adapté]`;
}

// Prompt cuisine classique
function buildClassicPrompt(profile) {
  return `Tu es un assistant culinaire pour la famille.

PROFIL : ${PROFILES[profile] || PROFILES.famille}
${HEALTH_CONSTRAINTS}

INSTRUCTIONS :
- Génère directement la recette complète sans poser de questions
- Cuisson max 45 minutes
- Techniques standards (poêle, casserole, four, vapeur)

FORMAT EXACT :

### 🍽️ [Nom du plat]
*Pour X personnes · Y min · Cuisine classique*

**Ingrédients**
- [quantité] [ingrédient]

**Préparation**
1. [action avec ustensile et durée]

**💡 Astuce famille** : [conseil adapté]`;
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let ingredients, mode, profile;
  try {
    const body = JSON.parse(event.body);
    ingredients = body.ingredients;
    mode = body.mode || "classique";       // "thermomix" ou "classique"
    profile = body.profile || "famille";   // "famille", "couple", "solo"
  } catch {
    return { statusCode: 400, body: "Corps de requête invalide" };
  }

  if (!ingredients || ingredients.trim().length === 0) {
    return { statusCode: 400, body: "Ingrédients manquants" };
  }

  const systemPrompt = mode === "thermomix"
    ? buildThermomixPrompt(profile)
    : buildClassicPrompt(profile);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: `J'ai : ${ingredients}` }]
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ recipe: message.content[0].text })
    };
  } catch (error) {
    console.error("Erreur API Claude :", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur lors de la génération de la recette" })
    };
  }
};
