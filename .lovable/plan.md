
# PLUG Analytics, Community Dashboard, B2B Suite & Candidate Experience -- Master Plan

## Overview
This is a large-scale feature set spanning 4 major domains. To keep things deliverable and stable, we'll implement in 4 phases. Each phase is self-contained and testable.

---

## Phase 1: Candidate Analytics (Hunter View)

### 1A. Pipeline Velocity -- Red Alert (7-Day Stagnation)
**Database:** Add column `last_stage_change_at` (timestamptz) to `applications` table (default = `created_at`). Update this on every stage change.

**UI -- CandidateCard.tsx:**
- Calculate days since `last_stage_change_at`
- If >= 7 days: show a pulsing RED badge: "Stagnant 7+ days"
- On click: prompt dialog asking "Candidate stagnant for 1 week. What action would you like to take?" with options:
  - "Send Message" (opens SendMessageDialog)
  - "Move to Next Stage" (quick stage bump)
  - "Reject" (mark rejected)
  - "Dismiss Alert" (snooze for 7 more days via `stagnation_snoozed_until` column)

**UI -- CandidatesPage.tsx:**
- Add a summary banner at top: "X candidates stagnant for 7+ days" with a filter toggle

### 1B. AI Summary (Dattoo-style)
**Edge Function:** New `generate-candidate-summary` function
- Input: candidate's CV data (from `profiles.cv_data`), vouch skills, salary expectations
- Output: structured JSON with skills summary, soft skills, salary positioning vs market
- Uses Gemini 2.5 Flash for speed

**UI -- CandidateCard.tsx:**
- Add expandable "AI Summary" section with skill tags, salary positioning badge (below/at/above market)
- Cache summary in `applications.ai_candidate_summary` (new JSONB column)

### 1C. Progress Bar in Candidate Cards
**UI -- CandidateCard.tsx:**
- Add a compact `StageProgressBar` (already exists!) below the candidate info
- Show percentage: Applied=20%, Screening=40%, Interview=60%, Offer=80%, Hired=100%
- Visual indicator of proximity to "Hired"

### 1D. Retention Risk Prediction
**Logic:** Simple heuristic model (no ML needed for MVP):
- Risk Score = weighted combination of:
  - Days since last interaction (weight: 40%)
  - Response rate < 50% (weight: 25%)
  - No profile updates in 30 days (weight: 20%)
  - Low engagement (no feed/community activity) (weight: 15%)

**UI -- CandidateCard.tsx:**
- "Dropout Risk" badge: Low (green) / Medium (yellow) / High (red)
- Tooltip showing contributing factors

---

## Phase 2: Community & Exposure Dashboard

### 2A. Content Dashboard
**Database:** Add columns to `feed_posts`:
- `views_count` (int, default 0)
- `unique_viewers` (int, default 0)
- `shares_count` (int, default 0)

**UI -- New Component `ContentDashboard.tsx`:**
- Table/cards showing all posts by the recruiter
- Metrics per post: Views, Likes, Comments, Shares, Engagement Rate
- Total reach across all posts
- Trend line chart (using Recharts, already installed)

### 2B. Top Talent Ping
**Logic:**
- Query candidates with high vouch weight scores (using existing `calculate_vouch_weight` function)
- Sort by total weighted vouches descending
- For `visible_to_hr = false` users: show "Ping" button (sends anonymous interest notification)
- For `visible_to_hr = true` users: show "Message" button

**UI -- New section in CandidatesPage or dedicated widget**

### 2C. Lurker Conversion Widget
**Logic:** Track community members who read but never post/react (based on `community_messages` absence)
- Query `community_members` LEFT JOIN `community_messages` WHERE messages = 0
- Suggest "Create a Poll to engage X silent members"

**UI -- Widget in CommunityHubView.tsx sidebar (admin only)**

### 2D. Engagement Heatmap
**Logic:** Aggregate `community_messages` by channel, count by day/hour
- Show which channels/topics are trending

**UI -- New Component `EngagementHeatmap.tsx`:**
- Grid heatmap (days x hours) using Recharts
- Top trending channels list

---

## Phase 3: B2B & Process Suite

### 3A. Client SLA Monitor
**Database:** Already have `companies.avg_hiring_speed_days`. Extend:
- Add `avg_response_time_hours` to `companies` table (nullable numeric)
- Calculate from application stage transitions

**UI -- New component `SLAMonitor.tsx`:**
- Card showing response times per company
- Color coding: Green (<24h), Yellow (24-72h), Red (>72h)
- "Company X responds in 48h" format

### 3B. Cost-of-Vacancy Calculator
**UI -- New component `VacancyCalculator.tsx`:**
- Input fields: Role salary, Days open, Revenue impact factor
- Formula: Daily Cost = (Annual Salary / 365) x Impact Multiplier
- Shows running total: "This role has cost approximately $X,XXX so far"
- Pulls `created_at` from job posting to auto-calculate days open

### 3C. Placement Revenue Tracker
**UI -- New widget on Hunter Dashboard overview:**
- Query `applications` WHERE `current_stage = 'hired'` for recruiter's jobs
- Show: Total placements, Estimated revenue (configurable fee % in settings)
- Monthly trend chart

---

## Phase 4: Candidate Experience Features

### 4A. Ghosting Protection -- "Likelihood of Response" Meter
**Logic:** Calculate per company based on historical data:
- Total applications received vs. total that moved past "applied" stage
- Response rate = (moved past applied / total) * 100
- Already partially exists via `companies.avg_hiring_speed_days`

**UI -- JobCard.tsx & JobDetailsSheet.tsx:**
- Small meter/badge: "Response Likelihood: High/Medium/Low"
- Green (>70%), Yellow (40-70%), Red (<40%)
- Tooltip: "Based on X applications, this company typically responds within Y days"

### 4B. Negotiation Sandbox (AI Chatbot)
**UI -- New component `NegotiationSandbox.tsx`:**
- Dedicated chat interface (reuse PlugChat pattern)
- System prompt configured for salary negotiation simulation
- User plays "candidate", AI plays "hiring manager"
- After session: AI provides feedback on negotiation tactics

**Edge Function:** Reuse `plug-chat` with a special `context.mode = 'negotiation_sandbox'` parameter
- Different system prompt for negotiation simulation
- No need for separate function

### 4C. Personalized Feed Heatmap
**Logic:** Based on `profiles.cv_data` (parsed resume):
- Extract skills/keywords
- Match against community channel topics and feed post content
- Suggest top 3 communities + trending topics

**UI -- Widget in Feed page sidebar:**
- "Recommended for You" section
- Community cards with "Join" buttons
- Hot topic tags linking to relevant channels

### 4D. Fuel Credit Validation
**Existing system already handles this.** Verify and extend:
- Add `community_like`, `community_comment`, `community_poll_vote` to `RECURRING_REWARDS` in `award-credits` edge function (same as `feed_like` pattern, +1 daily fuel each)
- Ensure all community interactions trigger the award

---

## Database Migration Summary

```text
ALTER TABLE applications:
  + last_stage_change_at TIMESTAMPTZ DEFAULT now()
  + stagnation_snoozed_until TIMESTAMPTZ
  + ai_candidate_summary JSONB
  + retention_risk_score NUMERIC

ALTER TABLE feed_posts:
  + views_count INT DEFAULT 0
  + unique_viewers INT DEFAULT 0
  + shares_count INT DEFAULT 0

ALTER TABLE companies:
  + avg_response_time_hours NUMERIC
  + response_rate NUMERIC
```

---

## New Files Summary

| File | Description |
|------|-------------|
| `src/components/candidates/StagnationAlert.tsx` | Red alert dialog for 7-day stagnant candidates |
| `src/components/candidates/RetentionRiskBadge.tsx` | Dropout risk indicator badge |
| `src/components/candidates/TopTalentPing.tsx` | High-vouch talent discovery widget |
| `src/components/feed/ContentDashboard.tsx` | Post analytics dashboard for recruiters |
| `src/components/communities/LurkerWidget.tsx` | Silent member engagement widget |
| `src/components/communities/EngagementHeatmap.tsx` | Channel activity heatmap |
| `src/components/jobs/GhostingMeter.tsx` | Response likelihood meter for jobs |
| `src/components/jobs/VacancyCalculator.tsx` | Cost-of-vacancy calculator |
| `src/components/dashboard/PlacementRevenue.tsx` | Revenue tracking widget |
| `src/components/dashboard/SLAMonitor.tsx` | Company response time monitor |
| `src/components/interview/NegotiationSandbox.tsx` | AI salary negotiation practice |
| `src/components/feed/PersonalizedFeedWidget.tsx` | CV-based community/topic suggestions |
| `supabase/functions/generate-candidate-summary/index.ts` | AI candidate summary generator |

## Modified Files Summary

| File | Change |
|------|--------|
| `src/components/candidates/CandidateCard.tsx` | Add progress bar, AI summary, stagnation alert, retention risk |
| `src/components/candidates/CandidatesPage.tsx` | Add stagnation banner, Top Talent section |
| `src/components/jobs/JobCard.tsx` | Add ghosting protection meter |
| `src/components/jobs/JobDetailsSheet.tsx` | Add response likelihood + vacancy cost |
| `src/components/dashboard/DashboardLayout.tsx` | Add new nav items (Content Dashboard, Negotiation Sandbox) |
| `src/pages/Dashboard.tsx` | Add new section cases + recruiter analytics widgets |
| `src/components/communities/CommunityHubView.tsx` | Add lurker widget + heatmap for admins |
| `src/components/feed/FeedPage.tsx` | Add personalized suggestions sidebar |
| `supabase/functions/award-credits/index.ts` | Add community action types to RECURRING_REWARDS |

---

## Execution Order
1. SQL Migration (all new columns)
2. Phase 1: Candidate Analytics (CandidateCard upgrades + edge function)
3. Phase 2: Community Dashboard (ContentDashboard + widgets)
4. Phase 3: B2B Suite (SLA + Vacancy + Revenue)
5. Phase 4: Candidate Experience (Ghosting meter + Negotiation + Feed suggestions)
6. Fuel Credit validation across all new interactions

---

## Notes
- **Market Benchmark (Levels.fyi / Salary.com):** These require paid API access. For MVP, we'll use the static exchange rates and salary ranges already in the system. Can be upgraded later when API keys are available.
- **Webinar Funnel (Google Analytics):** Requires GA4 API key and setup. For MVP, we'll track registrations and attendance internally via `webinar_registrations` table. GA integration can be added as a connector later.
- **AI Moderation:** For MVP, implemented as keyword-based filter in community messages. Full NLP moderation can be added later.
