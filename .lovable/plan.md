

# PLUG Feed & Gamification Credit System

## Overview
Add a personalized content feed ("PLUG Feed") to the candidate dashboard with interactive gamification -- every like, comment, or poll vote earns +1 Fuel Credit with visual feedback.

## What You'll Get

1. **"PLUG Feed" entry point on the Dashboard overview** -- a visually prominent card inviting candidates to explore the feed
2. **New "feed" section in the dashboard sidebar** -- accessible via navigation, rendered inside the existing dashboard layout
3. **Feed page with categorized tabs**: All, Interview Tips, Company Culture, Polls
4. **Personalized mock content** -- UGC-style cards from recruiters, prioritized by companies the user has applied to
5. **+1 Fuel Credit per interaction** (Like, Comment, Poll Vote) with:
   - Mint Green toast notification
   - Sparkle animation on the interaction button
6. **Updated Credits page** -- transaction log already exists; new feed actions will appear as "Feed Like: +1", "Feed Comment: +1", "Feed Poll Vote: +1"
7. **Role-locked to job_seeker only**
8. **Full RTL/Hebrew support**

---

## Technical Plan

### 1. New Files

| File | Purpose |
|------|---------|
| `src/components/feed/FeedPage.tsx` | Main feed container with tabs (All / Interview Tips / Company Culture / Polls) |
| `src/components/feed/FeedCard.tsx` | Individual post card (image/video, recruiter info, like/comment/poll) |
| `src/components/feed/FeedPollCard.tsx` | Interactive poll card variant |
| `src/components/feed/feedMockData.ts` | Mock data generator -- personalizes company names from user's applications |
| `src/components/feed/SparkleAnimation.tsx` | Small mint-green sparkle CSS animation component |

### 2. Modified Files

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardLayout.tsx` | Add `'feed'` to `DashboardSection` type and nav items (job_seeker only) |
| `src/pages/Dashboard.tsx` | Add `case 'feed'` to `renderSectionContent`, add Feed entry card in overview |
| `src/lib/credit-costs.ts` | Add `FEED_INTERACTION: 1` to `CREDIT_COSTS` and labels |
| `src/pages/Credits.tsx` | Add labels for `feed_like`, `feed_comment`, `feed_poll_vote` action types |

### 3. Feed Content Structure (Mock Data)

Each post will contain:
- Recruiter avatar, name, company name
- Post type: `tip` / `culture` / `poll`
- Content text + optional image placeholder
- Like count, comment count
- For polls: 2-4 options with vote percentages

Personalization: the mock data generator receives the user's applications list and prioritizes companies from that list in the feed.

### 4. Credit Integration

Each interaction calls the existing `awardCredits('feed_like')` / `awardCredits('feed_comment')` / `awardCredits('feed_poll_vote')` from `CreditsContext`. The backend `award-credits` edge function will handle the +1 permanent fuel award. A mint-green toast fires on success, and a CSS sparkle animation plays on the button.

### 5. Role Gating

The feed nav item and dashboard card will only render when `role === 'job_seeker'`. The feed component itself will also check the role and redirect/hide if accessed by other roles.

