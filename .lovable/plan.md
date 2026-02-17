
# Plan: Photo Upload in Profile + Mission Board Marketplace

## Part A: Photo Upload in My Profile

Currently, only job seekers see the `PersonalCardEditor` (which includes `PhotoUpload`) on the Profile page. For HR/recruiter roles, there's no photo upload option.

### Changes:
1. **`src/pages/Profile.tsx`** - Add `PhotoUpload` component for all roles (not just job seekers). Place it at the top of the profile page for non-job-seeker roles inside a Card with the user's name, email, and role badge.

2. **`src/components/settings/ProfileSettings.tsx`** - Replace the non-functional "Change Photo" button with the actual `PhotoUpload` component that uploads to the existing `avatars` bucket.

No database changes needed -- the `avatars` bucket already exists and is public, and `profiles.avatar_url` column already exists.

---

## Part B: Mission Board (Tender Marketplace)

A competitive marketplace where Companies post recruitment "Missions" and Hunters (freelance/in-house HR) bid to execute them.

### Database Tables (new migration):

**`missions`** - The tender/mission postings
- `id`, `company_id` (uuid, FK companies), `created_by` (uuid), `job_id` (uuid, FK jobs, nullable)
- `title`, `description` (text)
- `commission_model` (text: 'percentage' | 'flat_fee')
- `commission_value` (numeric)
- `scope` (text: 'exclusive' | 'open')
- `urgency` (text: 'standard' | 'high' | 'critical')
- `min_reliability_score` (integer, nullable)
- `required_specializations` (text[], nullable)
- `status` (text: 'open' | 'in_progress' | 'completed' | 'cancelled', default 'open')
- `created_at`, `updated_at`
- RLS: Authenticated users can view open missions; creators can manage their own

**`mission_bids`** - Hunter bids on missions
- `id`, `mission_id` (uuid, FK missions), `hunter_id` (uuid)
- `pitch` (text) - why the hunter is best fit
- `verified_candidates_count` (integer)
- `vouched_candidates_count` (integer)
- `status` (text: 'pending' | 'reviewing' | 'accepted' | 'declined', default 'pending')
- `created_at`, `updated_at`
- RLS: Hunters manage own bids; mission creators can view/update bids on their missions

### Frontend Components:

1. **`src/components/missions/MissionBoard.tsx`** - Main marketplace view
   - Card-based feed of all open missions
   - Filters: Commission, Industry, Urgency, Company SLA
   - "Best Match" AI badge (based on hunter's existing candidate pool)
   - Stock-exchange-inspired clean UI with urgency color coding

2. **`src/components/missions/MissionCard.tsx`** - Individual mission card
   - Company logo + name, title, commission info
   - Urgency badge (Standard=blue, High=orange, Critical=red)
   - Scope badge (Exclusive/Open), bid count
   - "Bid on Mission" CTA button

3. **`src/components/missions/CreateMissionForm.tsx`** - For companies to post missions
   - Form with all fields: title, description, link to job, commission model, scope, urgency, targeting
   - Preview before posting

4. **`src/components/missions/BidDialog.tsx`** - Hunter bid submission
   - Pitch textarea
   - Auto-calculated "Talent Snapshot" showing verified/vouched candidates from hunter's pool
   - Status tracking after submission

5. **`src/components/missions/MissionDetailSheet.tsx`** - Expanded mission view
   - Full description, company info, all bids (for creator), bid status (for hunter)

6. **`src/components/missions/MyMissions.tsx`** - Dashboard for mission creators
   - List of posted missions with bid counts and statuses

### Post-Award Automation (when a bid is accepted):

- **CRM Integration**: Auto-create company profile in hunter's "My Clients" hub (insert into `companies` + link)
- **Success Lounge**: Create a private conversation between hunter and company contact (insert into `conversations`)
- **Contract Vault**: Generate a placeholder document in the company's vault (insert into `documents` with doc_type='contract')
- **Timeline Entry**: Log "Mission Awarded" in the client timeline

### Navigation:
- Add "Mission Board" to the sidebar for HR roles in `DashboardLayout.tsx` (with a Target/Crosshair icon)
- Add `'missions' | 'create-mission' | 'my-missions'` to `DashboardSection` type
- Route handling in `Dashboard.tsx`

### Notifications (preparation):
- When a new mission matches a hunter's specialization, trigger a push notification
- When a hunter bids on a mission, notify the company
- Uses existing `push-notifications` edge function infrastructure

---

## Technical Details

### Migration SQL highlights:
```text
CREATE TABLE missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  created_by uuid NOT NULL,
  job_id uuid REFERENCES jobs(id),
  title text NOT NULL,
  description text,
  commission_model text NOT NULL DEFAULT 'percentage',
  commission_value numeric NOT NULL DEFAULT 0,
  scope text NOT NULL DEFAULT 'open',
  urgency text NOT NULL DEFAULT 'standard',
  min_reliability_score integer,
  required_specializations text[],
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE mission_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  hunter_id uuid NOT NULL,
  pitch text NOT NULL,
  verified_candidates_count integer DEFAULT 0,
  vouched_candidates_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

RLS policies will ensure:
- All authenticated users can view open missions
- Only company roles / mission creators can create/edit missions
- Hunters can create/view their own bids
- Mission creators can view and update bid statuses on their missions

### File summary:
- **Modified**: `Profile.tsx`, `ProfileSettings.tsx`, `DashboardLayout.tsx`, `Dashboard.tsx`
- **New**: `MissionBoard.tsx`, `MissionCard.tsx`, `CreateMissionForm.tsx`, `BidDialog.tsx`, `MissionDetailSheet.tsx`, `MyMissions.tsx`
- **New migration**: missions + mission_bids tables with RLS
