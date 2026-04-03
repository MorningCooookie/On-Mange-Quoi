// ============================================
// Netlify Function: Create Stripe Checkout Session
// ============================================
// This serverless function handles Stripe payment initiation
// Place this file at: netlify/functions/create-checkout-session.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabaseUrl = 'https://pozhsrnsezklfyqjoues.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
    }

    // Get user email from Supabase
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.id === userId);

    if (!user || !user.email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'User not found' }) };
    }

    // Check if user already has a Stripe customer ID
    let customerId;
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subscription) {
      customerId = subscription.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: userId }
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1TIAitRSlTwKkI4x64vK5CTG',
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.URL}/index.html?payment=success#menu`,
      cancel_url: `${process.env.URL}/index.html?payment=canceled#menu`,
      metadata: { user_id: userId }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id })
    };
  } catch (err) {
    console.error('Stripe error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
