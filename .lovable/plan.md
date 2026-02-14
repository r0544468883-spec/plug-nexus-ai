
# שדרוג טופס משרות (היברידי + שכר מובנה) + שיפור מערכת קהילות

## חלק 1: שדרוג טופס פרסום משרה

### A. מודל עבודה היברידי
- הוספת ערך `'hybrid'` לרשימת `JOB_TYPES` (היברידי / Hybrid)
- כשנבחר `hybrid`, מופיע שדה נוסף: **"כמה ימים מהמשרד?"** -- slider או select עם ערכים 1-5
- שמירה בטבלת `jobs`: עמודות חדשות `hybrid_office_days` (int, nullable)

### B. שכר מובנה עם מטבע ותדירות
במקום שדה טקסט חופשי `salary_range`, נבנה מערכת שכר מובנית:

**שדות חדשים בטבלת `jobs`:**
| עמודה | סוג | תיאור |
|-------|------|--------|
| salary_min | integer | שכר מינימום |
| salary_max | integer | שכר מקסימום |
| salary_currency | text | 'ILS' / 'USD' / 'EUR' |
| salary_period | text | 'monthly' / 'yearly' |

**טופס:**
- שני שדות מספריים: מינימום ומקסימום
- Select מטבע: שקלים (ILS), דולרים (USD), יורו (EUR)
- Select תדירות: חודשי / שנתי

**חישוב אוטומטי:** הטופס ממיר ומציג את השכר בצורה נקייה. למשל אם הזינו $120,000 שנתי, מציג גם $10,000/חודש.

**הערת כוכבית למשתמשים ישראליים:** כשמשתמש עם locale ישראלי (language=he) צופה במשרה עם שכר בדולרים/יורו, מוצגת הערה קטנה:
`* ≈ ₪XX,XXX לחודש` (המרה בשער קבוע מוגדר מראש: USD=3.6, EUR=3.9)

### C. עדכון תצוגה בכרטיסי משרות
- `JobCard.tsx` -- הצגת שכר מעוצב: `$80K-$120K/yr` או `₪25,000-₪35,000/mo`
- `JobDetailsSheet.tsx` -- הצגה מלאה + הערת המרה לשקלים
- Badge "Hybrid (3 days)" ברשימת badges

---

## חלק 2: שיפור מערכת קהילות -- הסרת תבניות, הוספת הגדרות מנהל

### שינוי מהותי
במקום לבחור תבנית (Expert Hub / Branding Lounge וכו'), מנהל הקהילה מקבל **גישה מלאה לכל הפיצ'רים** ויכול להפעיל/לכבות כל אחד מהם.

### A. עמודות חדשות בטבלת `community_hubs`
| עמודה | סוג | ברירת מחדל | תיאור |
|-------|------|------------|--------|
| allow_posts | boolean | true | חברים יכולים לפרסם |
| allow_comments | boolean | true | חברים יכולים להגיב |
| allow_polls | boolean | true | חברים יכולים ליצור סקרים |
| allow_video | boolean | true | חברים יכולים להעלות וידאו |
| allow_images | boolean | true | חברים יכולים להעלות תמונות |
| allow_member_invite | boolean | true | חברים יכולים להזמין אחרים |

### B. עדכון `CreateCommunityHub.tsx`
- הסרת בחירת Template לחלוטין
- הוספת סקשן "Community Settings" עם Switch toggles לכל הגדרה:
  - "Allow members to post" / "אפשר לחברים לפרסם"
  - "Allow comments" / "אפשר תגובות"
  - "Allow polls" / "אפשר סקרים"
  - "Allow video uploads" / "אפשר העלאת וידאו"
  - "Allow image uploads" / "אפשר העלאת תמונות"
  - "Allow member invites" / "אפשר הזמנת חברים"
- ערוצי ברירת מחדל: תמיד `#general` (ניתן להוסיף עוד ידנית אח"כ)

### C. עדכון `CommunityChannel.tsx`
- בדיקת ההגדרות מה-hub לפני הצגת כפתורי "Post", "Poll", "Upload"
- אם `allow_posts = false`: מסתיר את שדה ההודעה לחברים רגילים (admins תמיד יכולים)
- אם `allow_comments = false`: מסתיר reply threads
- וכן הלאה

### D. הוספת מסך הגדרות קהילה למנהלים
- כפתור Settings (Settings icon) ב-`ChannelSidebar.tsx` (גלוי רק ל-admins)
- מסך/dialog שמציג את אותם toggles עם אפשרות עדכון
- גם ניהול ערוצים: הוספה/מחיקה/שינוי שם

---

## פירוט טכני

### Migration SQL
1. הוספת עמודות ל-`jobs`: `hybrid_office_days`, `salary_min`, `salary_max`, `salary_currency`, `salary_period`
2. הוספת עמודות ל-`community_hubs`: `allow_posts`, `allow_comments`, `allow_polls`, `allow_video`, `allow_images`, `allow_member_invite`

### קבצים מעודכנים
| קובץ | שינוי |
|-------|--------|
| `src/components/jobs/PostJobForm.tsx` | Hybrid option + structured salary (min/max/currency/period) |
| `src/components/jobs/JobCard.tsx` | Formatted salary display + hybrid badge + ILS footnote |
| `src/components/jobs/JobDetailsSheet.tsx` | Full salary display + conversion footnote |
| `src/components/communities/CreateCommunityHub.tsx` | הסרת templates, הוספת Switch toggles |
| `src/components/communities/CommunityChannel.tsx` | בדיקת הרשאות hub לפני הצגת אפשרויות |
| `src/components/communities/ChannelSidebar.tsx` | כפתור Settings למנהלים |

### קבצים חדשים
| קובץ | תיאור |
|-------|--------|
| `src/components/communities/HubSettingsDialog.tsx` | דיאלוג הגדרות קהילה למנהלים (toggles + ניהול ערוצים) |
| `src/lib/salary-utils.ts` | פונקציות עזר: פורמט שכר, המרת מטבע, חישוב חודשי/שנתי |

### לוגיקת המרת שכר (`salary-utils.ts`)
```text
EXCHANGE_RATES = { USD: 3.6, EUR: 3.9, ILS: 1 }

formatSalary(min, max, currency, period) --> "$80K-$120K/yr"
convertToILS(amount, currency) --> amount * rate
monthlyEquivalent(amount, period) --> period === 'yearly' ? amount/12 : amount
```
