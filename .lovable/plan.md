
# Creator Suite, Follow System & Webinar Management

## Overview
This plan adds three major systems: (1) Follow logic so candidates can follow Hunters/Companies, (2) a notification engine for new content, and (3) a full Webinar management system with reminders, registration, and in-feed display.

---

## 1. Database Tables

### `follows`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| follower_id | uuid | Candidate who follows |
| followed_user_id | uuid (nullable) | Followed Hunter |
| followed_company_id | uuid (nullable) | Followed Company |
| created_at | timestamptz | |

- Unique constraint: `(follower_id, followed_user_id)` and `(follower_id, followed_company_id)`
- CHECK: at least one of `followed_user_id` or `followed_company_id` is not null

### `webinars`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| creator_id | uuid | Hunter or HR who created it |
| company_id | uuid (nullable) | FK to companies |
| title_en | text | |
| title_he | text | |
| description_en | text | |
| description_he | text | |
| scheduled_at | timestamptz | Webinar date/time |
| link_url | text | Zoom/Meet URL or null for internal |
| is_internal | boolean | If true, embed video player in feed |
| internal_stream_url | text (nullable) | For internal stream |
| reminder_1_minutes | int | First reminder (e.g. 1440 = 24h) |
| reminder_2_minutes | int | Second reminder (e.g. 60 = 1h) |
| created_at | timestamptz | |

### `webinar_registrations`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| webinar_id | uuid FK | |
| user_id | uuid | Candidate who registered |
| created_at | timestamptz | |

- Unique constraint: `(webinar_id, user_id)`

### RLS Policies
- **follows**: Candidates can insert/delete their own follows; all authenticated users can read
- **webinars**: Recruiters (freelance_hr, inhouse_hr) can CRUD their own; all authenticated can read
- **webinar_registrations**: Candidates can insert/delete their own; creators can read registrations for their webinars

---

## 2. Edge Function: `send-content-notifications`

Triggered when a recruiter publishes a post with "Push to Followers" toggled on.

Logic:
1. Receive `{ postId, authorId, companyId }` 
2. Query `follows` for all followers of this author or company
3. Query `applications` for candidates who previously applied to jobs from this company
4. Deduplicate user IDs
5. Insert a notification row per user into the `notifications` table
6. Notification type: `new_content` (Soft Purple) or `webinar_reminder` (Mint Green)

---

## 3. Edge Function: `webinar-reminders`

A scheduled/cron-style function (or called from the publish flow):
- Queries `webinars` where `scheduled_at - reminder_X_minutes` is within the current window
- For each matching webinar, fetches registered users from `webinar_registrations`
- Inserts reminder notifications into the `notifications` table

For MVP: reminders are triggered by a Supabase cron (pg_cron) that runs every 5 minutes calling this function.

---

## 4. UI Changes

### A. "Push to Followers" Toggle in `CreateFeedPost.tsx`
- Add a Switch component: "Push to Followers & Previous Contacts"
- When toggled on and post is published, call `send-content-notifications` edge function

### B. Webinar Creation Form: `CreateWebinar.tsx`
New component accessible to freelance_hr and inhouse_hr roles:
- Fields: Title (EN/HE), Description (EN/HE), Date/Time picker, Link URL or "Internal Stream" toggle
- Two reminder dropdowns (preset options: 24h, 12h, 6h, 1h, 30min, 15min)
- Publish button saves to `webinars` table

### C. Navigation Updates (`DashboardLayout.tsx`)
- Add `'create-webinar'` to `DashboardSection` type
- Add nav item for recruiters: "Webinars" with Video icon
- Add case in `Dashboard.tsx`

### D. Follow Button (`FollowButton.tsx`)
New component that candidates see on:
- Feed cards (next to recruiter name)
- Public profiles of Hunters/Companies

Clicking toggles a follow/unfollow in the `follows` table.

### E. Webinar Cards in Feed (`WebinarFeedCard.tsx`)
- Specialized card showing: title, description, date/time, "Register" / "Join" button
- If `is_internal` is true: embed a `VideoPlayer` placeholder with "Live" badge
- If external: "Join" opens link in new tab
- Registration inserts into `webinar_registrations`

### F. Feed Updates (`FeedPage.tsx`)
- Add a "Webinars" tab alongside existing tabs
- Fetch upcoming webinars and display as `WebinarFeedCard`
- Prioritize content from followed accounts at the top

### G. Notification Styling (`NotificationItem.tsx`)
- `new_content` type: Soft Purple icon/badge (#A855F7)
- `webinar_reminder` type: Mint Green icon/badge (#00FF9D)

---

## 5. File Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/feed/CreateWebinar.tsx` | Webinar creation form for recruiters |
| `src/components/feed/WebinarFeedCard.tsx` | Webinar display card in candidate feed |
| `src/components/feed/FollowButton.tsx` | Follow/Unfollow toggle component |
| `supabase/functions/send-content-notifications/index.ts` | Push notifications to followers on new content |
| `supabase/functions/webinar-reminders/index.ts` | Automated webinar reminder notifications |

### Modified Files
| File | Change |
|------|--------|
| `src/components/feed/CreateFeedPost.tsx` | Add "Push to Followers" switch |
| `src/components/feed/FeedPage.tsx` | Add "Webinars" tab, prioritize followed content |
| `src/components/feed/FeedCard.tsx` | Add FollowButton next to recruiter name |
| `src/components/dashboard/DashboardLayout.tsx` | Add `create-webinar` section for recruiters |
| `src/pages/Dashboard.tsx` | Add webinar case to section renderer |
| `src/components/notifications/NotificationItem.tsx` | Add purple/green color coding by type |
| SQL Migration | Create `follows`, `webinars`, `webinar_registrations` tables + RLS + realtime |

---

## 6. User Flows

### Recruiter publishes content
1. Goes to "Create Feed Content"
2. Writes post, toggles "Push to Followers & Previous Contacts"
3. Clicks Publish --> post saved + edge function notifies followers

### Recruiter creates webinar
1. Goes to "Webinars" in sidebar
2. Fills title, description, date, link, selects 2 reminder intervals
3. Clicks Create --> saved to DB
4. Reminders auto-fire at configured times via cron

### Candidate follows a company
1. Sees a post in feed from "TechCo"
2. Clicks Follow button on the card
3. Future TechCo content appears prioritized in feed
4. Gets Soft Purple notification when TechCo publishes new content

### Candidate registers for webinar
1. Sees webinar card in feed
2. Clicks "Register"
3. Gets Mint Green reminder notifications before the event
4. If internal: clicks "Join" to watch embedded stream
