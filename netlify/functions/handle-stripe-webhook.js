// ============================================
// Netlify Function: Stripe Webhook Handler
// ============================================
// Updates subscription status in Supabase when Stripe events occur
// Place this file at: netlify/functions/handle-stripe-webhook.js

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

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    // Handle subscription created
    if (stripeEvent.type === 'customer.subscription.created') {
      const subscription = stripeEvent.data.object;

      const customer = await stripe.customers.retrieve(subscription.customer);
      const userId = customer.metadata?.supabase_user_id;

      if (userId) {
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: subscription.customer,
            stripe_subscription_id: subscription.id,
            status: 'active',
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000)
          });

        if (error) {
          console.error('Error upserting subscription:', error);
          throw error;
        }

        console.log(`✅ Subscription created for user ${userId}`);
      }
    }

    // Handle subscription updated
    if (stripeEvent.type === 'customer.subscription.updated') {
      const subscription = stripeEvent.data.object;

      const customer = await stripe.customers.retrieve(subscription.customer);
      const userId = customer.metadata?.supabase_user_id;

      if (userId) {
        const statusMap = {
          active: 'active',
          past_due: 'past_due',
          canceled: 'canceled',
          unpaid: 'past_due'
        };

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: statusMap[subscription.status] || 'active',
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            updated_at: new Date()
          })
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating subscription:', error);
          throw error;
        }

        console.log(`✅ Subscription updated for user ${userId}: ${subscription.status}`);
      }
    }

    // Handle subscription deleted/canceled
    if (stripeEvent.type === 'customer.subscription.deleted') {
      const subscription = stripeEvent.data.object;

      const customer = await stripe.customers.retrieve(subscription.customer);
      const userId = customer.metadata?.supabase_user_id;

      if (userId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date() })
          .eq('user_id', userId);

        if (error) {
          console.error('Error canceling subscription:', error);
          throw error;
        }

        console.log(`✅ Subscription canceled for user ${userId}`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (err) {
    console.error('Webhook processing error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
