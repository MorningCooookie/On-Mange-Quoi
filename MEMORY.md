# TableSaine — Project Memory

_Last updated: 2026-04-07_

---

## Session du 2026-04-07 — SEO & contenu blog

- FAQ créée : `blog/faq.html` — 10 questions, 3 catégories, schema FAQPage JSON-LD, accordéon JS accessible, lien dans le footer de index.html. (added 2026-04-07)
- Article cadmium créé : `blog/cadmium-alimentation.html` — données ANSES/EFSA, tableau comparatif par aliment, maillage interne vers mercure + FAQ. (added 2026-04-07)
- Article mercure créé : `blog/mercure-poissons.html` — tableau par espèce avec niveaux avoid/limit/ok, recommandations par profil (enceintes, enfants, adultes), callout bio/mercure. (added 2026-04-07)
- Article pesticides créé : `blog/pesticides-fruits-legumes.html` — classement EWG + données EFSA. (added 2026-04-07)
- `sitemap.xml` créé avec toutes les pages publiques. (added 2026-04-07)
- `robots.txt` créé, pointe vers le sitemap. (added 2026-04-07)
- Sitemap déclaré dans Google Search Console. (added 2026-04-07)
- Décision : "validés ANSES/EFSA" remplacé par "selon les recommandations ANSES/EFSA" partout dans index.html et blog/ — risque légal évité. (added 2026-04-07)
- Règle contenu : aucun tiret séparateur (—), pas de tournures IA, humanizer appliqué à tous les textes visibles. (added 2026-04-07)
- Audience FAQ élargie : textes reformulés pour ne pas cibler uniquement les familles ("que vous cuisiniez pour un, deux ou toute une tablée"). (added 2026-04-07)
- À faire côté technique (Claude Code) : fix auth Supabase, Stripe, features premium à 4,99€/mois. (added 2026-04-07)
- SEO terminé : 3 articles blog, FAQ, sitemap, robots.txt, Search Console — rien de plus à faire côté SEO pour le moment. (added 2026-04-07)

---

## CEO Review: Monetization Opportunities (2026-04-03)

### Product Summary
**On Mange Quoi** is a health-first family meal planning tool focused on food safety (cadmium, mercury, pesticide reduction). Core value: weekly A-grade menus validated against ANSES/EFSA with budget tracking across store tiers.

**Current State:**
- Free, ad-free, zero tracking
- 7-day menu generation + shopping lists + health alerts
- Budget comparison: Discount (€144) → Standard (€191) → Bio (€319)
- Seasonal awareness + prep time estimation
- Account system exists but broken (account creation non-functional)
- No premium features, no monetization

### Identified Monetization Vectors

**Tier 1: Quick wins (1-2 weeks implementation, 80% revenue capture)**

1. **Premium Meal Plans (+dietary restrictions)**
   - Current: generic family menu
   - Premium: Vegetarian, vegan, allergy-safe (gluten-free, nut-free), pescatarian, keto, low-FODMAP
   - UX: toggle at menu generation
   - Revenue: €2-3/month per plan variant, 10-15% uptake = €300-500/mo early
   - Next step: Identify top 3 dietary restrictions from analytics, build variant meal dataset

2. **Recipe Detail Upsell (free → premium)**
   - Current: menu title only ("Poulet rôti Label Rouge, carottes...")
   - Premium: click → full recipe (ingredients, step-by-step, photos, cook time breakdown)
   - UX: paywall on recipe expand or recipe page
   - Revenue: €0.99 one-time per recipe, or €1.99/mo for recipe library
   - Next step: Photograph/write 10 sample recipes; A/B test free vs. premium access

3. **Grocery Delivery Integration (Instacart/Amazon Fresh affiliate)**
   - Current: budget estimates only
   - Premium: "Buy now" button → affiliate link to local grocery delivery
   - Revenue: 5-8% commission on cart value (if family spent €144, earn €7-11 per week)
   - Next step: Get Instacart partner access, build "Order" button UX

4. **Family Sharing Paid Feature**
   - Current: single profile selected
   - Premium: €4.99/mo for multi-profile management (family of 5 with different dietary needs)
   - Value: one parent plans, all kids see their version of menu
   - Next step: Add to auth/profile system, feature-flag behind paywall

**Tier 2: High-impact, medium-lift (3-4 weeks, 20% additional revenue)**

5. **Nutritionist/Dietitian Consultation (SaaS B2C)**
   - Premium: async chat with registered dietitian (€9.99/question or €29.99/mo unlimited)
   - Positioning: "Ask why your menu scored B instead of A" / "How to adjust for allergies"
   - Next step: Partner with 2-3 dietitians; build consultation queue system

6. **Corporate Wellness Licensing (B2B SaaS)**
   - Positioning: "Healthy meal planning for employee wellness programs"
   - Target: mid-market companies (500-5000 employees)
   - Model: €2-5k/mo per company + white-label option
   - Next step: Create B2B landing page, pitch 5 HR directors at target companies

7. **School Lunch Program Tool (B2B)**
   - Positioning: "ANSES-validated menus for school cafeterias"
   - Target: regional school districts, private schools
   - Model: €500-1500/mo per school + training
   - Next step: Contact 3 school nutrition directors; build admin dashboard for menu approval

8. **PDF/Print Premium (meal prep guides, printable shopping lists, menu postcards)**
   - Revenue: €1.99 for "Meal Prep Guide" (recipes + prep tips), €0.99 for weekly shopping list PDF
   - Next step: Design 3 template PDFs; add "Download as PDF" button

**Tier 3: Expansion/Platform plays (6+ weeks, long-term revenue)**

9. **Data Licensing to Health Apps**
   - Current: ANSES/EFSA health alert library
   - B2B: License data to Fitbit, MyFitnessPal, insurance apps
   - Revenue: €500-2k/mo per partner
   - Next step: Document data schema; pitch health app partners

10. **Recipe API (for recipe sites, meal kit services)**
    - License recipe dataset + nutritional metadata
    - Revenue: €100-500/mo per user depending on volume
    - Next step: Build API, document, create pricing table

11. **Merchandise (meal prep containers, shopping bags, kitchen tools branded)**
    - Revenue: €5-15 margin per item, 100+ units/mo = €500-1500/mo
    - Next step: Design 3 SKUs, source supplier, Shopify integration

### Revenue Projection (Year 1)
```
Month 1-2:   Tier 1 launches → €1,200-2,000/mo (premium plans + recipe upsell)
Month 3-4:   Grocery affiliate + family sharing → €2,500-4,000/mo
Month 5-8:   B2B licensing + dietitian launch → €5,000-8,000/mo
Month 9-12:  Mature monetization + API → €8,000-12,000/mo
Year 1 Total: €45,000-70,000 (conservative, assumes 5-10% conversion)
```

### Critical Blockers (Fix First)
1. **Account creation broken** — blocks premium features, user save state
2. **Supabase/OVH integration unstable** — auth reliability is foundation for all monetization
3. **UI/UX polish** — premium feels cheap if core UX is rough; priority: form flows, paywall clarity

---

## Next Steps by Monetization Method

### 1. Premium Dietary Plans
- [ ] Audit analytics for top dietary requests (veg, allergy, etc.)
- [ ] Create meal variant dataset (3 dishes × 5 dietary versions = 15 menus)
- [ ] Build toggle UI for dietary selection at menu start
- [ ] Add paywall/upsell messaging
- [ ] Test A/B on 100 users (free vs. €2.99/mo)
- **Effort:** 2 weeks | **Revenue:** €300-500/mo early

### 2. Recipe Details + Premium Access
- [ ] Photograph 15 core recipes from menu
- [ ] Write 3-step recipe format (ingredients, method, tips)
- [ ] Build recipe expand modal with paywall
- [ ] Stripe integration for €0.99 one-time purchase
- [ ] Track conversion rate
- **Effort:** 2 weeks | **Revenue:** €200-400/mo (10% click rate × €0.99)

### 3. Grocery Delivery Integration (Instacart/Amazon)
- [ ] Sign up for Instacart Partner program
- [ ] Get API keys + affiliate account
- [ ] Build "Order Now" button on shopping list
- [ ] Route to local grocery with affiliate link
- [ ] Track click-through → conversion
- **Effort:** 1 week | **Revenue:** €200-600/mo (5% commission × weekly orders)

### 4. Family Sharing (Paid)
- [ ] Fix account creation (BLOCKING)
- [ ] Add multi-profile to auth system
- [ ] Implement profile isolation in meal state
- [ ] Add €4.99/mo paywall at 2+ profiles
- [ ] Test with 20 users (free tier vs. paid)
- **Effort:** 2 weeks (after auth fix) | **Revenue:** €500-1500/mo (5-10% uptake)

### 5. Dietitian Consultation
- [ ] Identify + contract 2-3 registered dietitians (freelance)
- [ ] Build chat UI + queue system
- [ ] Stripe integration for €9.99/question or €29.99/mo
- [ ] Legal: ensure dietitian credentials + liability coverage
- [ ] Soft launch with 50 users
- **Effort:** 3 weeks | **Revenue:** €400-800/mo (10-15% engagement × €9.99)

### 6. B2B Corporate Wellness
- [ ] Create B2B landing page (target: HR directors)
- [ ] Build admin dashboard (company-wide menu approval + bulk user management)
- [ ] Create proposal template + pricing deck (€3k/mo as anchor)
- [ ] Pitch 5 target companies (500-5000 employees)
- [ ] Negotiate white-label option (+€500/mo premium)
- **Effort:** 4 weeks | **Revenue:** €3k-5k/mo (1-2 deals closed)

### 7. School Lunch Program
- [ ] Research 5 target school districts + nutrition directors
- [ ] Create school-specific landing page (menus, compliance, training)
- [ ] Build admin dashboard (menu approval, budget tracking, dietary accommodations)
- [ ] Pilot with 1 school (€500/mo) → case study
- [ ] Pitch 10 schools
- **Effort:** 5 weeks | **Revenue:** €1k-3k/mo (2-3 schools × €500-1k)

### 8. PDF/Printable Products
- [ ] Design 3 templates: meal prep guide (€1.99), shopping list PDF (€0.99), menu poster (€0.99)
- [ ] Build checkout flow (Stripe)
- [ ] Add "Download" button to shopping list
- [ ] Track download rate + conversion
- **Effort:** 1.5 weeks | **Revenue:** €150-300/mo (2-5% conversion)

### 9. Data Licensing API
- [ ] Document data schema (recipes, health alerts, nutritional metadata)
- [ ] Build read-only API with rate limits
- [ ] Create pricing tiers (free: 100 req/day, starter: €50/mo, enterprise: custom)
- [ ] Pitch to 5 health app partners (Fitbit, MyFitnessPal, insurance apps)
- **Effort:** 4 weeks | **Revenue:** €300-1k/mo (1-3 partners × €100-500)

### 10. Merchandise (Long-tail)
- [ ] Design 3 SKUs (meal prep container, shopping bag, apron) with branding
- [ ] Source supplier (Alibaba or local)
- [ ] Shopify integration for e-commerce
- [ ] Ad spend to test (€100) on target audience (health-conscious families)
- [ ] Scale if >3x ROAS
- **Effort:** 3 weeks (product design + supply chain) | **Revenue:** €300-800/mo (low urgency)

---

## Implementation Roadmap

**Phase 1 (Weeks 1-4):** Fix auth, launch Tier 1
- Fix account creation + Supabase stability (CRITICAL)
- Premium dietary plans (2 weeks)
- Recipe detail upsell (2 weeks)
- Grocery affiliate integration (1 week)

**Phase 2 (Weeks 5-8):** Family sharing + B2C SaaS
- Family sharing paywall (2 weeks)
- Dietitian consultation MVP (3 weeks)

**Phase 3 (Weeks 9-16):** B2B licensing
- Corporate wellness landing + pitch (3 weeks)
- School lunch program MVP (4 weeks)

**Phase 4 (Weeks 17+):** Expansion
- Data API (3 weeks)
- Merchandise (3 weeks)
- Optimize and scale based on traction

---

## Key Metrics to Track

- **Conversion rate** (free → premium)
- **Engagement by segment** (premium vs. free users)
- **ARPU** (average revenue per user) target: €0.50-1.50/mo
- **Churn** by feature (track which premium features drive retention)
- **CAC** (customer acquisition cost) if paid marketing
- **Affiliate commission rate** (actual payout from Instacart, etc.)

