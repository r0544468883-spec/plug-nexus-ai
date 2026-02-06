
# PLUG Fuel Economy Implementation Plan

## Overview
Implementing a comprehensive dual-credit system ("Daily Fuel" + "Permanent Fuel") with viral growth mechanics, onboarding flows, and community engagement rewards.

---

## Phase 1: Database Schema

### New Table: `user_credits`
```sql
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_fuel INTEGER DEFAULT 20 NOT NULL,
  permanent_fuel INTEGER DEFAULT 0 NOT NULL,
  is_onboarded BOOLEAN DEFAULT false NOT NULL,
  last_refill_date DATE DEFAULT CURRENT_DATE NOT NULL,
  pings_today INTEGER DEFAULT 0 NOT NULL,
  referral_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### New Table: `credit_transactions`
```sql
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('daily', 'permanent')),
  action_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New Table: `social_task_completions`
```sql
CREATE TABLE public.social_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_id)
);
```

### New Table: `referrals`
```sql
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referred_id UUID NOT NULL REFERENCES auth.users(id),
  credits_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referred_id)
);
```

### RLS Policies
- Users can only read/update their own credit records
- Credit transactions viewable by owner only
- Referral tracking with proper security

---

## Phase 2: Backend Logic (Edge Functions)

### 1. `daily-fuel-reset` (Scheduled Function)
- Runs at 00:00 Israel Time (21:00 UTC)
- Resets `daily_fuel` to 20 for all users
- Updates `last_refill_date` and resets `pings_today`

### 2. `deduct-credits` (Edge Function)
```text
Priority: daily_fuel first, then permanent_fuel
Action Costs:
- CV Builder: 10 credits
- Interview Prep: 5 credits
- Resume Match: 3 credits
- Internal Pings: 4/day free, 5th+ costs 15 credits
```

### 3. `award-credits` (Edge Function)
Handles awarding permanent fuel for:
- Social task completions (one-time)
- Recurring actions (with daily caps)
- Referral bonuses
- Vouch rewards

### 4. `generate-referral-code` (Edge Function)
Creates unique referral code on user signup

---

## Phase 3: First-Time User Experience (FTUE)

### Flow
1. User logs in for first time
2. Check `is_onboarded` flag in `user_credits`
3. If `false`, redirect to `/fuel-up`
4. Set `is_onboarded = true` after interaction

### Implementation
- Modify `Index.tsx` to check onboarding status
- Create redirect logic in `AuthContext` or Dashboard

---

## Phase 4: New Pages

### `/fuel-up` (Mission Control)
**Social Tasks Grid with Credits:**
| Task | Credits | Link |
|------|---------|------|
| GitHub Star | +100 | github.com/r0544468883-spec/Plug-for-users |
| LinkedIn Follow | +50 | linkedin.com/company/plug-hr |
| WhatsApp Join | +50 | chat.whatsapp.com/Kbh0vYaFUTWG1Km3t0ogBw |
| TikTok Follow | +50 | tiktok.com/@plug_hr |
| Discord Join | +50 | discord.gg/Pe5NFPKcFu |
| YouTube Subscribe | +50 | youtube.com/channel/UCiPKqhdBPG5rbMuwn58sqCg |
| Spotify Follow | +25 | open.spotify.com/episode/... |
| Telegram Join | +25 | t.me/+7ITI4MUzD-hmZDk0 |
| Facebook Follow | +25 | facebook.com/profile.php?id=61587514412711 |
| Instagram Follow | +25 | instagram.com/plug_hr.ai |
| LinkedIn Post Share | +25 | (Launch post link) |
| X Follow | +25 | (Placeholder) |

**UI Components:**
- Grid of animated cards with "Magnetic Pull" hover effect
- Click opens external link in new tab
- On return/focus, prompt user to confirm completion
- Award credits and mark task as completed

### `/credits` (Credit Management Hub)
- Display Daily Fuel (mint bolt icon) and Permanent Fuel (purple crystal icon)
- Transaction history (last 10 events)
- Quick links to Fuel Up tasks
- Referral link generator with copy button
- Progress visualization

---

## Phase 5: Recurring Viral Actions

### "Earn More" Section
| Action | Credits | Cap |
|--------|---------|-----|
| Share to Community | +5 | 3/day |
| Share Job Card | +5 | 5/day |
| Referral (both users) | +10 | Unlimited |
| Receiving Vouch | +25 | 5/month |
| Giving Vouch | +5 | 5/month |

### Integration Points
- Hook into existing community share actions
- Hook into job sharing functionality
- Extend vouch system to award credits
- Track daily/monthly caps in database

---

## Phase 6: HUD & Visual Elements

### Persistent Credit Widget
- Position: Top-right corner (next to notifications)
- Design:
  - Mint Green Bolt (#00FF9D) for Daily Fuel
  - Soft Purple Crystal (#B794F4) for Permanent Fuel
- Click to open `/credits` page
- Show combined total with breakdown tooltip

### Feedback System
- Mint Green toast notifications on credit earn
- Red toast on insufficient credits
- Animated number increment on credit changes

### Daily Reset Check
- On login/app load, check `last_refill_date`
- If date changed, reset daily_fuel to 20
- Show celebratory toast: "Your daily fuel has been refilled!"

---

## Phase 7: Integration with Existing Features

### CV Builder Integration
- Check credits before allowing use
- Deduct 10 credits on CV generation
- Show credit cost in UI

### Interview Prep Integration
- Deduct 5 credits per session
- Show credit requirement

### Resume Match Integration
- Deduct 3 credits per match request

### Vouch System Enhancement
- Award +25 permanent fuel when receiving vouch
- Award +5 permanent fuel when giving vouch
- Respect monthly cap of 5 vouches

---

## File Structure

```text
src/
├── pages/
│   ├── FuelUp.tsx              # Mission Control page
│   └── Credits.tsx             # Credit Management Hub
├── components/
│   └── credits/
│       ├── CreditHUD.tsx       # Persistent header widget
│       ├── FuelCard.tsx        # Social task card
│       ├── CreditBalance.tsx   # Balance display
│       ├── TransactionHistory.tsx
│       └── ReferralSection.tsx
├── contexts/
│   └── CreditsContext.tsx      # Credit state management
├── hooks/
│   └── useCredits.ts           # Credit operations hook
└── lib/
    └── credit-costs.ts         # Cost constants

supabase/
├── functions/
│   ├── deduct-credits/
│   ├── award-credits/
│   └── daily-fuel-reset/
└── migrations/
    └── [timestamp]_fuel_economy.sql
```

---

## Technical Notes

### Credit Priority Logic (TypeScript)
```typescript
async function deductCredits(userId: string, amount: number) {
  const { data: credits } = await supabase
    .from('user_credits')
    .select('daily_fuel, permanent_fuel')
    .eq('user_id', userId)
    .single();
    
  const total = credits.daily_fuel + credits.permanent_fuel;
  if (total < amount) throw new Error('Insufficient credits');
  
  let dailyDeduct = Math.min(credits.daily_fuel, amount);
  let permanentDeduct = amount - dailyDeduct;
  
  await supabase.from('user_credits').update({
    daily_fuel: credits.daily_fuel - dailyDeduct,
    permanent_fuel: credits.permanent_fuel - permanentDeduct,
  }).eq('user_id', userId);
}
```

### Timezone Handling
- Use Israel timezone (Asia/Jerusalem) for daily reset
- Store dates in UTC, convert on display
- Edge function scheduled for 21:00 UTC (00:00 Israel)

### Route Updates
Add to `App.tsx`:
```typescript
<Route path="/fuel-up" element={<FuelUp />} />
<Route path="/credits" element={<Credits />} />
```

---

## Summary
This implementation creates a complete gamified credit system that:
1. Encourages social sharing and community growth
2. Gates premium features behind credit costs
3. Provides clear onboarding for new users
4. Integrates seamlessly with existing vouch and job-sharing features
5. Uses visual feedback to make earning credits feel rewarding
