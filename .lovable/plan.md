
# תוכנית: 11 שיפורים ותיקונים למערכת PLUG

## סקירה
11 נושאים שצריכים טיפול -- מהוספת סטטיסטיקות חסרות ועד שינוי מבנה הניווט ויצירת פרופיל מגייסת.

---

## 1. סטטיסטיקות בדף מועמדים (CandidatesPage)

כרגע דף המועמדים מציג רק רשימה, בלי סיכום כמותי.

**שינוי:** הוספת שורת סטטיסטיקות בראש `CandidatesPage.tsx`:
- סה"כ מועמדים
- ממתינים לסינון (applied)
- בתהליך ראיון (interview)
- הצעות (offer)
- נשכרו (hired)
- סטגנטיים (7+ ימים)

4 כרטיסי סטטיסטיקה בגריד, מחושבים מתוך ה-candidates array הקיים.

---

## 2. הגעה למועמדים גם מטאב Applications

כרגע חיפוש גלובלי נמצא רק בטאב "Search All". 

**שינוי:** ב-`CandidatesPage.tsx`, כשאין שום סינון פעיל (searchQuery ריק, stageFilter='all', jobFilter='all') ואין מועמדים -- להציג כפתור "חפש מועמדים במערכת" שמעביר לטאב Search All, או להוסיף שדה חיפוש גלובלי גם בטאב Applications שמציג תוצאות מ-profiles_secure כשלא נמצאו תוצאות מקומיות.

---

## 3. כפתורי חזרה בכל המסכים

כרגע יש כפתור back רק ב-header כשיש `canGoBack` (מבוסס router history). 

**שינוי:** הוספת כפתור "חזרה" פנימי בראש כל מסך שאינו overview:
- בכל section ב-`Dashboard.tsx` שאינו `overview`, להוסיף כפתור חזרה ל-overview או לסקשן הקודם
- יתווסף ב-`renderSectionContent()` wrapper עם כפתור Back בראש

---

## 4. העברת Negotiation Sandbox למועמד

כרגע `negotiation-sandbox` נמצא בניווט של מגייסות. זה אמור להיות אצל מחפשי עבודה.

**שינוי:**
- הסרת `negotiation-sandbox` מ-nav items של `freelance_hr` / `inhouse_hr`
- הוספת `negotiation-sandbox` כטאב חדש בתוך `InterviewPrepContent.tsx` (אצל Job Seeker), כי זה הגיוני שזה יהיה חלק מההכנה לראיון
- הסרת הפריט מה-sidebar של מגייסות

---

## 5. הוספת כפתור B2B Suite

כרגע אין כפתור ניווט ל-B2B Suite (SLA Monitor, Vacancy Calculator, Placement Revenue).

**שינוי:** הוספת סקשן חדש `'b2b-suite'` ל-`DashboardSection` עבור מגייסות, שמציג:
- SLA Monitor
- Vacancy Calculator  
- Placement Revenue

הכל במסך אחד עם כותרת "B2B Suite" / "כלים עסקיים"

---

## 6. צמצום הסייד-בר -- איחוד ל-"Content & Community"

הסייד-בר ארוך מדי. נאחד 4 כפתורים לתוך כפתור אחד.

**שינוי:** הסרת הפריטים הבאים מה-sidebar:
- Content Dashboard
- Create Feed Content
- Webinars
- Communities

ויצירת פריט אחד: **"Content & Community"** / **"תוכן וקהילה"** (icon: `Newspaper`)

בלחיצה עליו -- מסך חדש `'content-hub'` שמציג 4 כפתורים/כרטיסים:
1. Content Dashboard (אנליטיקס)
2. Create Content (יצירת תוכן)
3. Webinars (יצירה וניהול)
4. Communities (קהילות)

כל כפתור מנווט ל-section המתאים.

---

## 7. שדרוג Content Dashboard

כרגע ה-dashboard מינימלי מאוד -- רק סטטיסטיקות בסיסיות ותרשים.

**שינוי:**
- הוספת "Benchmark" השוואתי: מציג ממוצע engagement של כל הפוסטים במערכת מול הפוסטים של המגייסת
- הוספת "Top Performing Posts" מכל המערכת כדוגמה (anonymous -- ללא שם המגייסת)
- הוספת טיפים: "פוסטים עם תמונה מקבלים 2x יותר engagement", "פוסטים עם סקר מגייעים ל-3x תגובות"
- הוספת call-to-action: "צרי תוכן חדש" עם כפתור שמנווט ל-create-feed-post

---

## 8. פרסום תוכן ממוקד לקהילה / תת-קהילה

כרגע אפשר לפרסם רק לפיד הכללי.

**שינוי:** ב-`CreateFeedPost.tsx`:
- הוספת Dropdown "פרסום ל...": General (כל המשתמשים) / קהילה ספציפית / ערוץ ספציפי
- שליפת הקהילות שהמגייסת היא admin שלהן
- שמירת `target_hub_id` ו-`target_channel_id` (nullable) בטבלת `feed_posts` (migration)

---

## 9. ביטול ההפרדה בין תוכן עברית/אנגלית

כרגע יש 2 שדות טקסט נפרדים: contentEn ו-contentHe. זה מבלבל.

**שינוי:** ב-`CreateFeedPost.tsx`:
- הסרת השדות הנפרדים
- שדה תוכן אחד בלבד
- הוספת כפתור שפה (Toggle: עברית / English) שמציין באיזו שפה התוכן כתוב
- שמירה ב-`content_en` או `content_he` לפי הבחירה

---

## 10. שדרוג סוגי פוסטים + הגדרות תגובות

כרגע יש רק: tip, culture, poll.

**שינוי:** ב-`CreateFeedPost.tsx`:
- הוספת סוגי פוסט חדשים:
  - `visual` -- תוכן ויזואלי (תמונה)
  - `video` -- תוכן וידאו
  - `question` -- שאלה לקהילה
  - `event` -- הזמנה לאירוע/וובינר (עם תאריך, שעה, לינק)
- כל סוג פוסט יכול לכלול תמונה או וידאו
- הוספת סקשן "Comment Settings":
  - Toggle: "Allow comments" / "אפשר תגובות"
  - Select: "Who can comment" -- All / Members only / No one
- שמירת `allow_comments` ו-`comment_permission` ב-`feed_posts`

---

## 11. הסרת Documents, הוספת מסך פרופיל מגייסת

כרגע יש לינק "Documents" בסייד-בר של מגייסות שהוא לא רלוונטי.

**שינוי:**
- הסרת הפריט "Documents" מה-nav של מגייסות
- החלפתו בפריט **"My Profile"** / **"הפרופיל שלי"** (icon: `User`)
- יצירת מסך פרופיל מגייסת חדש: `RecruiterProfileEditor.tsx`

**תוכן הפרופיל:**
- תמונה + סרטון קצר (60 שניות)
- תעשיות שהיא עובדת בהן (tags)
- חברות שעבדה איתן
- פילוסופיית גיוס -- "מה אני מאמינה לגבי תהליך הגיוס"
- רקע מקצועי
- רקע אקדמאי
- טיפ למועמדים (שדה חופשי)
- **תצוגה כפולה:** Toggle לראות "כך חברות רואות אותך" / "כך מועמדים רואים אותך"
  - תצוגת חברות: דגש על חוויה, תעשיות, הצלחות
  - תצוגת מועמדים: דגש על טיפים, פילוסופיה, סרטון

**שמירה:** עמודות חדשות ב-`profiles`:
- `recruiter_industries` (text[])
- `recruiter_companies` (text[])
- `recruiter_philosophy` (text)
- `recruiter_background` (text)
- `recruiter_education` (text)
- `recruiter_tip` (text)
- `recruiter_video_url` (text)

---

## סיכום טכני

### Migration SQL
```text
ALTER TABLE feed_posts:
  + target_hub_id UUID (nullable, FK community_hubs)
  + target_channel_id UUID (nullable, FK community_channels)
  + allow_comments BOOLEAN DEFAULT true
  + comment_permission TEXT DEFAULT 'all'
  + content_language TEXT DEFAULT 'en'

ALTER TABLE profiles:
  + recruiter_industries TEXT[]
  + recruiter_companies TEXT[]
  + recruiter_philosophy TEXT
  + recruiter_background TEXT
  + recruiter_education TEXT
  + recruiter_tip TEXT
  + recruiter_video_url TEXT
```

### קבצים חדשים
| קובץ | תיאור |
|-------|--------|
| `src/components/profile/RecruiterProfileEditor.tsx` | מסך עריכת פרופיל מגייסת |
| `src/components/profile/RecruiterProfilePreview.tsx` | תצוגות "כך רואים אותך" |

### קבצים מעודכנים
| קובץ | שינוי |
|-------|--------|
| `src/components/candidates/CandidatesPage.tsx` | שורת סטטיסטיקות + גישה לחיפוש מטאב Applications |
| `src/components/dashboard/DashboardLayout.tsx` | צמצום sidebar, הסרת Documents, הוספת Content & Community + B2B Suite + My Profile |
| `src/pages/Dashboard.tsx` | הוספת sections חדשים (content-hub, b2b-suite, recruiter-profile), wrapper עם כפתור חזרה, העברת negotiation-sandbox לתוך interview-prep |
| `src/components/interview/InterviewPrepContent.tsx` | הוספת טאב NegotiationSandbox |
| `src/components/feed/CreateFeedPost.tsx` | שדה תוכן יחיד, סוגי פוסט חדשים, הגדרות תגובות, פרסום לקהילה |
| `src/components/feed/ContentDashboard.tsx` | benchmarks, טיפים, CTA |

### סדר ביצוע
1. Migration SQL
2. סטטיסטיקות מועמדים (#1) + חיפוש מ-Applications (#2)
3. כפתורי חזרה (#3)
4. העברת Negotiation Sandbox (#4)
5. צמצום sidebar + B2B Suite + Content Hub (#5, #6)
6. שדרוג Content Dashboard (#7)
7. פרסום ממוקד + שדה תוכן יחיד + סוגי פוסט (#8, #9, #10)
8. פרופיל מגייסת (#11)
