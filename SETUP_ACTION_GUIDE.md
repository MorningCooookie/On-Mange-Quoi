# 🚀 Family Sharing Setup — Action Checklist

**Timeline:** All steps should take ~2-3 hours total. Do them in order.

---

## ✅ PHASE 1: Database Setup (15 minutes)

### Step 1a: Create Supabase Tables
1. Go to **Supabase Dashboard**: https://app.supabase.com/project/pozhsrnsezklfyqjoues/sql/new
2. Copy the **entire** `SUPABASE_SETUP.sql` file from this folder
3. Paste it into the SQL editor
4. Click blue **"Run"** button (top right)
5. **Expected:** Green "Success" message and both tables appear in left sidebar under "Tables"

**If it fails:** Check console for errors. Common issue = RLS policies. Just copy-paste the exact SQL again.

---

## ✅ PHASE 2: Stripe Account (30 minutes)

### Step 2a: Create Stripe Account
- Go to https://stripe.com
- Click **Sign up** (free)
- Verify email
- Go to **Dashboard**

### Step 2b: Create Product
1. Left sidebar → **Products**
2. Click **+ Add product**
3. Fill in:
   - **Name:** `Family Sharing`
   - **Description:** `Unlimited profiles for your family`
   - Toggle **"Recurring"** → **Monthly** → **€4.99**
4. Click **Create product**
5. **Copy the Price ID** (looks like `price_1ABC123XYZ...`)
   - Save this somewhere — you'll need it in Step 4

### Step 2c: Get Stripe API Keys
1. Left sidebar → **Developers** → **API keys**
2. You'll see two keys:
   - **Publishable key** (starts with `pk_live_...` or `pk_test_...`)
   - **Secret key** (starts with `sk_live_...` or `sk_test_...`)
3. **Copy both** (you'll use them in Step 3)

**⚠️ NOTE:** If you see `pk_test_` and `sk_test_`, you're in **test mode**. That's fine for now. Just use the test keys. When you go live, switch to live keys (toggle at top right).

### Step 2d: Set Up Webhook
1. Left sidebar → **Webhooks**
2. Click **+ Add endpoint**
3. Endpoint URL: `https://[your-netlify-site-name].netlify.app/.netlify/functions/handle-stripe-webhook`
   - Replace `[your-netlify-site-name]` with your actual Netlify site name
   - Example: `https://on-mange-quoi.netlify.app/.netlify/functions/handle-stripe-webhook`
4. Events to send: Search and select:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_...`)
   - Save this — you'll need it in Step 3

---

## ✅ PHASE 3: Supabase Service Key (5 minutes)

1. Go to **Supabase Settings**: https://app.supabase.com/project/pozhsrnsezklfyqjoues/settings/api
2. Under "Project API keys", find **Service Role** (NOT the "anon" key)
3. **Copy the Service Role secret**
4. Save this — you'll need it in the next step

---

## ✅ PHASE 4: Netlify Environment Variables (10 minutes)

1. Go to **Netlify Dashboard**: https://app.netlify.com/sites
2. Click your site
3. **Site settings** → **Build & deploy** → **Environment**
4. Click **+ Add variable** three times and fill in:

| Key | Value |
|-----|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` (from Stripe Step 2c) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Stripe Step 2d) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from Supabase (from Phase 3) |

5. Click **Save** after adding all three

**Check:** You should see all three variables listed in the Environment section.

---

## ✅ PHASE 5: Update Code (5 minutes)

### Step 5a: Stripe Publishable Key
1. Open `profiles.js` in your editor
2. Find this line (around line 180):
   ```javascript
   const stripe = window.Stripe('pk_live_YOUR_KEY_HERE');
   ```
3. Replace `pk_live_YOUR_KEY_HERE` with your **Stripe Publishable Key** from Step 2c
   - Example: `const stripe = window.Stripe('pk_test_51ABC123XYZ...');`

### Step 5b: Stripe Price ID
1. Open `netlify/functions/create-checkout-session.js`
2. Find this line (around line 61):
   ```javascript
   price: 'price_YOUR_PRICE_ID',
   ```
3. Replace `price_YOUR_PRICE_ID` with your **Price ID** from Step 2b
   - Example: `price: 'price_1ABC123XYZ...',`

---

## ✅ PHASE 6: Deploy (2 minutes)

In your terminal:
```bash
cd /path/to/TableSaine
git add -A
git commit -m "feat: configure Family Sharing with Stripe and Supabase"
git push
```

**Netlify will automatically deploy.** Watch the "Deploys" tab — should see a green checkmark in 1-2 minutes.

---

## ✅ PHASE 7: Test (10 minutes)

### Test Free Tier (1 profile limit)
1. Open your site in an **incognito/private window**
2. Click **"Créer un compte"**
3. Enter email + password → Click **"Créer un compte"**
4. ✅ Check email → Click confirmation link → Redirects to site
5. Click **"👥 Profils familiaux"** (top right menu)
6. You should see **1 default profile** already created
7. Try to add a 2nd profile
8. ✅ **You should see the paywall** (yellow box saying "4.99 €/mois")

### Test Payment Flow
1. Click **"Souscrire à Family Sharing"** in paywall
2. You're redirected to **Stripe Checkout**
3. Fill in:
   - **Email:** (auto-filled)
   - **Card:** `4242 4242 4242 4242` (Stripe test card)
   - **Expiry:** Any future date (e.g., `12/27`)
   - **CVC:** Any 3 digits (e.g., `123`)
4. Click **Pay**
5. ✅ You're redirected back to your site
6. ✅ Paywall disappears → You can add unlimited profiles now

### If Something Breaks
- **"Service de paiement indisponible"** → Check Netlify env vars (Step 4)
- **"Supabase client not ready"** → Refresh the page, wait 2 seconds
- **Paywall doesn't appear** → Check browser console (F12 → Console tab)
- **Stripe checkout fails** → Check Stripe test API keys are in Netlify env vars

---

## Estimated Timeline

| Phase | Time | Task |
|-------|------|------|
| 1 | 15 min | Run SQL to create tables |
| 2 | 30 min | Create Stripe account + product + webhook |
| 3 | 5 min | Get Supabase Service Role key |
| 4 | 10 min | Add Netlify env vars |
| 5 | 5 min | Update code with API keys |
| 6 | 2 min | Deploy via git |
| 7 | 10 min | Test free tier + payment |
| **Total** | **~75 min** | **From zero to paid feature live** |

---

## Next Steps After Launch

Once Family Sharing is live and tested:
1. Get feedback from early users (10-15 people)
2. Monitor Stripe dashboard for any payment issues
3. Check Supabase logs for any RLS policy errors
4. Plan Phase 2 features (dietary restrictions per profile, custom budget, etc.)

---

## Support

If you get stuck:
- **Stripe logs:** https://dashboard.stripe.com → **Logs** (left sidebar)
- **Supabase logs:** https://app.supabase.com/project/pozhsrnsezklfyqjoues → **Logs** (left sidebar)
- **Netlify function logs:** https://app.netlify.com/sites → Click site → **Functions** (top nav)

