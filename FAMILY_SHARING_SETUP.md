# 👥 Family Sharing Setup Guide

This guide walks you through activating the Family Sharing feature (€4.99/mo paid tier).

## Timeline
- **Step 1-2:** 30 minutes (Supabase + Stripe setup)
- **Step 3:** 10 minutes (Environment variables)
- **Step 4:** Testing & launch

---

## Step 1: Set Up Supabase Tables

1. **Open Supabase SQL Editor**
   - Go to: https://app.supabase.com/project/pozhsrnsezklfyqjoues/sql/new
   - You're now in the SQL editor

2. **Copy & paste the entire `SUPABASE_SETUP.sql` file** from this folder

3. **Click the blue "Run" button** (top right)
   - This creates the `profiles` and `subscriptions` tables
   - Status: ✅ Done when you see "Success"

---

## Step 2: Set Up Stripe

### 2a. Create a Stripe Account
- Go to: https://stripe.com
- Sign up (free)
- Go to Dashboard

### 2b. Create the Product & Price
1. In Stripe Dashboard, go to **Products** (left sidebar)
2. Click **+ Add product**
3. Fill in:
   - **Name:** `Family Sharing`
   - **Description:** `Unlimited profiles for your family`
   - **Pricing:** Toggle "Recurring" → Monthly → **€4.99**
4. Click **Create product**
5. **Copy the Price ID** (looks like `price_1ABC123...`) — you'll need this

### 2c. Get Your Keys
1. In Stripe Dashboard, go to **Developers** → **API keys** (left sidebar)
2. You should see two keys:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`)
3. **Copy both** — you'll need them for Step 3

### 2d. Set Up Webhooks (Stripe → Supabase)
1. In Stripe Dashboard, go to **Webhooks** (left sidebar)
2. Click **Add endpoint**
3. Fill in:
   - **Endpoint URL:** `https://your-site.netlify.app/.netlify/functions/handle-stripe-webhook`
   - **Events to send:** Search and select:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Click **Add endpoint**
5. **Copy the Signing secret** (starts with `whsec_...`) — you'll need this

---

## Step 3: Set Environment Variables

Your Netlify site needs three secrets:

1. **Go to Netlify Dashboard**
   - https://app.netlify.com/sites
   - Click your site
   - Go to **Site settings** → **Build & deploy** → **Environment**

2. **Click "Add a variable"** and add these three:

| Key | Value | Where to get it |
|-----|-------|-----------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard → Webhooks → Signing secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Get from Supabase | Supabase → Settings → API → Service role secret |

### How to get Supabase Service Role Key:
1. Go to: https://app.supabase.com/project/pozhsrnsezklfyqjoues/settings/api
2. Copy the **Service Role** secret (NOT the "anon" key)

3. **After adding all three, click "Save"**

---

## Step 4: Update Stripe Price ID

1. **Open `profiles.js`** in your editor
2. Find this line (around line 180):
   ```javascript
   const stripe = window.Stripe('pk_live_YOUR_KEY_HERE');
   ```
3. Replace `pk_live_YOUR_KEY_HERE` with your **Stripe Publishable Key** (from Step 2c)

4. **Open `netlify/functions/create-checkout-session.js`**
5. Find this line (around line 60):
   ```javascript
   price: 'price_YOUR_PRICE_ID',
   ```
6. Replace `price_YOUR_PRICE_ID` with your **Price ID** (from Step 2b)

---

## Step 5: Deploy

1. **Commit your changes**
   ```bash
   git add -A
   git commit -m "feat: add Family Sharing with Stripe integration"
   git push
   ```

2. **Netlify will automatically deploy** (watch the Deploys page)

---

## Step 6: Test

### Test Free Tier (1 profile)
1. Create a new account on your site
2. Click "👥 Profils familiaux" (User menu → top right)
3. Try to add a 2nd profile
4. ✅ You should see the paywall message

### Test Payment Flow
1. Add a profile → paywall appears
2. Click "Souscrire à Family Sharing"
3. You're redirected to Stripe Checkout
4. Use test card: `4242 4242 4242 4242` (expiry: any future date, CVC: any 3 digits)
5. Click Pay
6. ✅ You're redirected back to your site
7. ✅ Paywall disappears, you can create unlimited profiles

---

## Troubleshooting

### "Error: Service de paiement indisponible"
- Check that Stripe keys are in Netlify environment variables
- Check that the function file is at `netlify/functions/create-checkout-session.js`
- Deploy again: `git push`

### "Error: Supabase client not ready"
- Supabase library takes 1-2 seconds to load
- If it says this on first login, refresh the page

### "Profil créé" but then 404 error
- The Supabase tables might not be created
- Go back to Step 1 and run the SQL again

### "Error loading profiles"
- RLS policies might not be set correctly
- Go back to Supabase dashboard and check the policies are created

---

## What's Next (Phase 2)

After launch, you can add:
- Dietary restrictions per profile (vegetarian, vegan, gluten-free)
- Custom budget per profile
- Different store preferences per profile

For now, all profiles share the same menu/preferences.

---

## Support

If you get stuck:
1. Check Stripe logs: https://dashboard.stripe.com → Logs
2. Check Supabase logs: https://app.supabase.com/project/pozhsrnsezklfyqjoues → Logs
3. Check Netlify function logs: https://app.netlify.com/sites → Functions
4. Email: hello@onmangequoi.eu

