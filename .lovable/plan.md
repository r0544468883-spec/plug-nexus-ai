
# כרטיס אישי (Personal Card) למחפשי עבודה

## סקירה כללית
יצירת "כרטיס אישי" ויזואלי ועשיר למחפשי עבודה שמאפשר להם להציג את עצמם באופן אישי ואנושי יותר - לא רק מידע מקצועי, אלא גם "מי אני" עם תמונה, סרטון קצר, וכמה מילים על החיים.

הכרטיס הזה יהיה החשיפה העיקרית למגייסות - מה שהן רואות כשהן מסתכלות על מועמד.

---

## מה כולל הכרטיס האישי?

```text
+------------------------------------------+
|  [תמונת פרופיל גדולה]                     |
|                                          |
|  שם מלא                                  |
|  "כותרת אישית" (לא בהכרח תפקיד)          |
|                                          |
|  [סרטון היכרות קצר - 60 שניות]           |
|                                          |
|  "כמה מילים על עצמי" - טקסט אישי         |
|  (על החיים, תחביבים, ערכים - לא רק קריירה)|
|                                          |
|  [קישורים מקצועיים: LinkedIn, GitHub, etc]|
|                                          |
|  [כפתורי פעולה: הודעה, WhatsApp, פרופיל מלא]|
+------------------------------------------+
```

---

## שלב 1: עדכון בסיס הנתונים

### שדות חדשים בטבלת `profiles`:
| שדה | סוג | תיאור |
|-----|-----|-------|
| `personal_tagline` | TEXT | כותרת אישית קצרה (במקום title מקצועי) |
| `about_me` | TEXT | טקסט אישי על החיים (לא bio מקצועי) |
| `intro_video_url` | TEXT | קישור לסרטון ההיכרות |

### Storage Bucket חדש:
- שם: `profile-videos`
- גודל מקסימלי: 50MB
- פורמטים: MP4, WebM, MOV
- RLS: בעלים יכולים להעלות/לצפות, מגייסות יכולות לצפות (לפי visible_to_hr או הגשה)

### עדכון View המאובטח:
הוספת השדות החדשים ל-`profiles_secure` view

---

## שלב 2: קומפוננטות עריכה (Frontend - Job Seeker)

### 2.1 PersonalCardEditor
קומפוננטה חדשה לעריכת הכרטיס האישי:

```text
src/components/profile/
├── PersonalCardEditor.tsx      # עורך הכרטיס
├── PersonalCardPreview.tsx     # תצוגה מקדימה
├── IntroVideoUpload.tsx        # העלאת סרטון
└── PhotoUpload.tsx             # העלאת תמונת פרופיל
```

**מיקום בממשק**: 
- קטע חדש בדף הפרופיל (`/profile`)
- יופיע ראשון, לפני קורות חיים והעדפות קריירה

### 2.2 IntroVideoUpload
- גרירת קובץ וידאו
- תצוגה מקדימה לפני העלאה
- מגבלה: 60 שניות, 50MB
- אפשרות להסיר סרטון קיים

### 2.3 PhotoUpload (שדרוג)
- שדרוג כפתור "שנה תמונה" הקיים
- תמיכה ב-crop ו-resize
- Storage bucket: `avatars` (חדש)

---

## שלב 3: תצוגת הכרטיס למגייסות

### 3.1 PersonalCard Component
כרטיס ויזואלי שמציג:
- תמונה גדולה יותר
- שם + כותרת אישית
- נגן וידאו מובנה (אם קיים)
- טקסט "על עצמי"
- קישורים מקצועיים
- כפתורי פעולה

### 3.2 שילוב בממשק המגייסות
| מיקום | תיאור |
|-------|-------|
| `CandidateCard` | הוספת תצוגת סרטון/about בכרטיס |
| `CandidateProfile` | הכרטיס האישי מלא בראש העמוד |
| `MatchingCandidatesTab` | תצוגת כרטיסים עם תוכן אישי |
| `PublicProfile` | הכרטיס בפרופיל הציבורי |

---

## שלב 4: שדרוג תצוגת פרופיל ציבורי

עדכון `/p/:userId` להציג:
1. הכרטיס האישי בראש
2. סרטון היכרות (אם קיים)
3. טקסט אישי
4. המלצות (Vouches)

---

## שלב 5: אבטחה ופרטיות

### RLS Policies לסרטונים:
- בעלים: CREATE, READ, DELETE
- מגייסות: READ (אם visible_to_hr=true או הגשה קיימת)

### עדכון profiles_secure view:
```sql
-- הוספת השדות החדשים
personal_tagline,
about_me,
intro_video_url
```

---

## פירוט טכני

### קבצים חדשים:
```text
src/components/profile/
├── PersonalCardEditor.tsx
├── PersonalCardPreview.tsx
├── IntroVideoUpload.tsx
├── PhotoUpload.tsx
└── PersonalCard.tsx
```

### קבצים לעדכון:
| קובץ | שינוי |
|------|-------|
| `src/pages/Profile.tsx` | הוספת PersonalCardEditor |
| `src/pages/PublicProfile.tsx` | הצגת הכרטיס האישי |
| `src/pages/CandidateProfile.tsx` | הכרטיס האישי למגייסות |
| `src/components/candidates/CandidateCard.tsx` | תצוגה מקוצרת |
| `profiles_secure` view | הוספת שדות חדשים |

### Migration SQL:
```sql
-- 1. Add new columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS personal_tagline TEXT,
ADD COLUMN IF NOT EXISTS about_me TEXT,
ADD COLUMN IF NOT EXISTS intro_video_url TEXT;

-- 2. Create profile-videos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-videos', 'profile-videos', false);

-- 3. Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- 4. Storage RLS policies for videos
-- 5. Update profiles_secure view
```

---

## UX Flow

### עבור מחפש עבודה:
1. נכנס לעמוד הפרופיל
2. רואה את עורך הכרטיס האישי
3. מעלה תמונה
4. כותב כותרת אישית ("חובב טיולים, אוהב אתגרים")
5. כותב "על עצמי" (טקסט חופשי)
6. (אופציונלי) מעלה סרטון היכרות
7. רואה תצוגה מקדימה
8. שומר

### עבור מגייסת:
1. רואה מועמד ברשימה
2. לוחצת על הכרטיס
3. רואה את הכרטיס האישי עם כל המידע
4. יכולה לצפות בסרטון ההיכרות
5. מקבלת תחושה אישית יותר על המועמד

---

## סיכום יתרונות

- **אנושיות**: המועמד נתפס כאדם, לא רק כקורות חיים
- **בידול**: סרטון + טקסט אישי מייחדים
- **חיבור**: מגייסות מרגישות קרבה למועמד
- **שקיפות**: מה שהמועמד רואה = מה שהמגייסת רואה
