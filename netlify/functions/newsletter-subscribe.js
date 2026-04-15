// Netlify Function : inscription newsletter via Brevo
// Clé API dans les variables d'env Netlify — jamais dans le code
// Utilise fetch natif (Node 18+)

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let email;
  try {
    const body = JSON.parse(event.body);
    email = body.email?.trim().toLowerCase();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps de requête invalide' }) };
  }

  // Validation email basique
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Adresse email invalide' }),
    };
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = parseInt(process.env.BREVO_LIST_ID || '2', 10);

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Configuration serveur manquante' }),
    };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true, // ne pas rejeter si l'email existe déjà
      }),
    });

    // 201 = créé, 204 = déjà existant et mis à jour
    if (response.status === 201 || response.status === 204) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true }),
      };
    }

    const data = await response.json();

    // Code 4 = contact déjà dans la liste → succès côté UX
    if (data.code === 'duplicate_parameter') {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true, already: true }),
      };
    }

    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Erreur Brevo', detail: data }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Erreur réseau', detail: err.message }),
    };
  }
};
