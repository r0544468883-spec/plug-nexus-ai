
# תוכנית: שיפור הודעות למגייסות, תיקון חיפוש מועמדים, ומערכת קהילות

## סקירה
שלושה נושאים עיקריים: (1) שדרוג מערכת ההודעות למגייסות, (2) תיקון באג בחיפוש מועמדים, (3) מערכת קהילות בסגנון Discord.

בגלל שהנושאים עצומים בהיקף (במיוחד הקהילות), ממליץ לפצל ליישום בשלבים. הנה התוכנית המלאה:

---

## 1. שדרוג מערכת ההודעות למגייסות

### בעיה
כרגע ה-`SendMessageDialog` פשוט מציג שדה טקסט -- אין תצוגת פרופיל של המועמד ואין אפשרות לצרף קובץ או קישור למשרה.

### פתרון

#### A. תצוגת פרופיל מועמד בדיאלוג ההודעה
- שדרוג `SendMessageDialog.tsx` להוסיף פאנל פרופיל בראש הדיאלוג
- שליפת נתוני המועמד: אווטאר, שם, tagline, bio, לינקים מקצועיים, vouch count
- המגייסת רואה את המועמד "מול העיניים" לפני שליחת ההודעה

#### B. צירוף קבצים
- הוספת כפתור "Attach File" (Paperclip icon) ל-`SendMessageDialog`
- שימוש ב-bucket `message-attachments` שכבר קיים
- הגבלה: 10MB, סוגי קבצים: PDF, Word, Excel, תמונות
- שמירת metadata בהודעה: `attachment_url`, `attachment_name`, `attachment_type`, `attachment_size`

#### C. קישור למשרה פנימית
- הוספת dropdown/autocomplete "Attach Job Link" שמושך משרות של המגייסת מטבלת `jobs`
- כשהמגייסת בוחרת משרה, מופיע כרטיס משרה מוקטן בהודעה
- שמירת `related_job_id` (כבר קיים בסכמה!) בהודעה

#### D. עדכון ConversationThread
- הצגת קבצים מצורפים בתוך בועות ההודעה (download link)
- הצגת כרטיס משרה מקושרת (אם `related_job_id` קיים)

### קבצים מעודכנים
| קובץ | שינוי |
|-------|--------|
| `src/components/messaging/SendMessageDialog.tsx` | פאנל פרופיל + צירוף קובץ + קישור משרה |
| `src/components/messaging/ConversationThread.tsx` | הצגת קבצים מצורפים + כרטיס משרה |

---

## 2. תיקון חיפוש מועמדים

### בעיה
עמוד ה-Candidates (`CandidatesPage.tsx`) מציג **רק** מועמדים שהגישו מועמדות למשרות של המגייסת. אם אין למגייסת משרות, או שאף אחד לא הגיש -- הרשימה ריקה. אין חיפוש גלובלי על כל המשתמשים הרשומים.

### פתרון
- הוספת **טאב שלישי** ל-`CandidatesPage`: "Search All Candidates" / "חיפוש כל המועמדים"
- חיפוש על `profiles_secure` view לפי שם, אימייל, bio
- סינון לפי `visible_to_hr = true` (רק מועמדים שהפעילו "גלוי למגייסים")
- כרטיסי מועמד עם כפתור "Profile", "Message", "Import"

### קבצים מעודכנים
| קובץ | שינוי |
|-------|--------|
| `src/components/candidates/CandidatesPage.tsx` | הוספת טאב "Search All" + לוגיקת חיפוש גלובלית |

---

## 3. מערכת קהילות (Community Hubs) -- שלב 1

### סקירה
מערכת קהילות בסגנון Discord עם תתי-קהילות (channels), תבניות, בקרת גישה, ואינטגרציה עם Fuel.

### טבלאות חדשות

#### `community_hubs`
| עמודה | סוג | תיאור |
|-------|------|--------|
| id | uuid PK | |
| creator_id | uuid | Hunter/HR שיצר |
| company_id | uuid (nullable) | FK ל-companies |
| name_en | text | שם באנגלית |
| name_he | text | שם בעברית |
| description_en | text | |
| description_he | text | |
| template | text | 'expert_hub' / 'branding_lounge' / 'career_academy' / 'custom' |
| avatar_url | text | |
| is_public | boolean DEFAULT true | |
| member_count | int DEFAULT 0 | |
| created_at | timestamptz | |

#### `community_channels`
| עמודה | סוג | תיאור |
|-------|------|--------|
| id | uuid PK | |
| hub_id | uuid FK | FK ל-community_hubs |
| name_en | text | שם הערוץ |
| name_he | text | |
| description_en | text | |
| description_he | text | |
| access_mode | text | 'open' / 'request' / 'private_code' |
| private_code | text (nullable) | קוד כניסה לערוצים פרטיים |
| sort_order | int DEFAULT 0 | |
| created_at | timestamptz | |

#### `community_members`
| עמודה | סוג | תיאור |
|-------|------|--------|
| id | uuid PK | |
| hub_id | uuid FK | |
| user_id | uuid | |
| role | text | 'admin' / 'moderator' / 'member' |
| joined_at | timestamptz | |

- Unique: `(hub_id, user_id)`

#### `community_messages`
| עמודה | סוג | תיאור |
|-------|------|--------|
| id | uuid PK | |
| channel_id | uuid FK | FK ל-community_channels |
| author_id | uuid | |
| content | text | |
| message_type | text | 'text' / 'image' / 'video' / 'poll' |
| attachment_url | text (nullable) | |
| parent_message_id | uuid (nullable) | לתגובות threaded |
| likes_count | int DEFAULT 0 | |
| created_at | timestamptz | |

#### `community_join_requests`
| עמודה | סוג | תיאור |
|-------|------|--------|
| id | uuid PK | |
| channel_id | uuid FK | |
| user_id | uuid | |
| status | text | 'pending' / 'approved' / 'rejected' |
| created_at | timestamptz | |

### RLS
- **community_hubs**: כולם קוראים hubs ציבוריים; admins יכולים CRUD
- **community_channels**: members קוראים; admins יוצרים/עורכים
- **community_members**: authenticated can read; users insert/delete themselves (open hubs); admins manage
- **community_messages**: members of the channel can read/write
- **community_join_requests**: user can create own; admins can read/update

### UI Components

#### A. רשימת קהילות (`CommunityHubsList.tsx`)
- Grid/List של כל הקהילות הציבוריות
- חיפוש ופילטרים לפי template
- כרטיס קהילה עם שם, תיאור, מספר חברים, כפתור "Join"

#### B. יצירת קהילה (`CreateCommunityHub.tsx`)
- זמין ל-freelance_hr ו-inhouse_hr
- בחירת template (Expert Hub / Branding Lounge / Career Academy / Custom)
- כל template יוצר ערוצי ברירת מחדל:
  - Expert Hub: `#general`, `#skill-challenges`, `#resources`
  - Branding Lounge: `#behind-the-scenes`, `#announcements`, `#qa`
  - Career Academy: `#interview-prep`, `#salary-talk`, `#mentoring`
- שם, תיאור, אווטאר

#### C. תצוגת קהילה (`CommunityHubView.tsx`)
- סייד-בר שמאלי (Discord-style) עם רשימת ערוצים
- אזור הודעות מרכזי עם real-time chat
- רשימת חברים בצד ימין (desktop)

#### D. ערוץ צ'אט (`CommunityChannel.tsx`)
- הודעות real-time (Supabase Realtime)
- תמיכה בטקסט, תמונות, סרטונים, סקרים
- תגובות threaded
- לייקים = +1 Daily Fuel (שימוש באותו edge function `award-credits`)

### Navigation
- הוספת `'communities'` ל-`DashboardSection`
- פריט ניווט חדש לכל הרולים: "Communities" עם icon מתאים
- הוספת `'create-community'` לרולים של מגייסות

### Fuel Integration
- לייק/תגובה/סקר בקהילה = +1 Daily Fuel (שימוש ב-`award-credits` edge function הקיים עם action types חדשים: `community_like`, `community_comment`, `community_poll_vote`)

---

## פירוט טכני -- סיכום קבצים

### קבצים חדשים
| קובץ | תיאור |
|-------|--------|
| `src/components/communities/CommunityHubsList.tsx` | רשימת קהילות + חיפוש |
| `src/components/communities/CreateCommunityHub.tsx` | טופס יצירת קהילה |
| `src/components/communities/CommunityHubView.tsx` | תצוגת קהילה (ערוצים + צ'אט) |
| `src/components/communities/CommunityChannel.tsx` | ערוץ צ'אט + real-time |
| `src/components/communities/ChannelSidebar.tsx` | סייד-בר ערוצים (Discord-style) |
| `src/components/communities/CommunityCard.tsx` | כרטיס קהילה ברשימה |

### קבצים מעודכנים
| קובץ | שינוי |
|-------|--------|
| `src/components/messaging/SendMessageDialog.tsx` | פאנל פרופיל + צירוף קבצים + קישור משרה |
| `src/components/messaging/ConversationThread.tsx` | הצגת קבצים ומשרות מצורפות |
| `src/components/candidates/CandidatesPage.tsx` | טאב חיפוש גלובלי |
| `src/components/dashboard/DashboardLayout.tsx` | הוספת Communities + Create Community לניווט |
| `src/pages/Dashboard.tsx` | הוספת cases לרינדור |
| `supabase/functions/award-credits/index.ts` | הוספת community action types |
| SQL Migration | יצירת 5 טבלאות + RLS + Realtime |

---

## סדר ביצוע
1. Migration SQL -- טבלאות קהילות
2. תיקון חיפוש מועמדים (טאב גלובלי)
3. שדרוג SendMessageDialog (פרופיל + קבצים + משרות)
4. עדכון ConversationThread (הצגת קבצים/משרות)
5. רכיבי קהילות: CommunityHubsList, CreateCommunityHub, CommunityCard
6. תצוגת קהילה: CommunityHubView, ChannelSidebar, CommunityChannel
7. ניווט + Dashboard routing
8. Fuel integration (award-credits)
