
# מסך יצירת תוכן למגייסים/חברות + תמיכה בוידאו

## מה קיים היום
- הפיד עובד עם **mock data בלבד** (קבוע בקוד)
- אין טבלת `feed_posts` בבסיס הנתונים
- אין מסך יצירת תוכן למגייסים
- אין תמיכה בסרטונים

## מה ייבנה

### 1. טבלת בסיס נתונים: `feed_posts`
| עמודה | סוג | תיאור |
|-------|------|--------|
| id | uuid | מזהה |
| author_id | uuid | המגייס/ת שפרסמ/ה |
| company_id | uuid | החברה (FK ל-companies) |
| post_type | text | 'tip' / 'culture' / 'poll' |
| content_en | text | תוכן באנגלית |
| content_he | text | תוכן בעברית |
| video_url | text | קישור לסרטון (Storage) |
| likes_count | int | מונה לייקים |
| comments_count | int | מונה תגובות |
| is_published | boolean | האם פורסם |
| created_at | timestamptz | תאריך יצירה |

### 2. טבלת `feed_poll_options`
| עמודה | סוג | תיאור |
|-------|------|--------|
| id | uuid | מזהה |
| post_id | uuid | FK ל-feed_posts |
| text_en | text | טקסט באנגלית |
| text_he | text | טקסט בעברית |
| votes_count | int | מונה הצבעות |

### 3. Storage Bucket: `feed-videos`
- Bucket פרטי להעלאת סרטונים
- הגבלת גודל: 100MB
- RLS: מגייסים מעלים, מועמדים צופים

### 4. מסך יצירת תוכן למגייסים (חדש)
**קובץ: `src/components/feed/CreateFeedPost.tsx`**
- טופס עם שדות: סוג פוסט, תוכן EN/HE, העלאת וידאו
- אם סוג = poll: אפשרות להוסיף 2-4 אפשרויות
- כפתור "פרסם" ששומר ל-DB
- תצוגה מקדימה לפני פרסום

### 5. ניווט למגייסים
- הוספת `'create-feed-post'` ל-`DashboardSection`
- הוספת פריט ניווט חדש בסייד-בר למגייסים: "Create Feed Content"
- הוספת `case 'create-feed-post'` ב-Dashboard.tsx

### 6. עדכון הפיד למועמדים
- `FeedPage.tsx` יטען פוסטים **אמיתיים מה-DB** (במקום mock data)
- Fallback ל-mock data כשאין פוסטים אמיתיים
- תמיכה בנגן וידאו בתוך `FeedCard.tsx` (HTML5 `<video>`)

### 7. נגן וידאו ב-FeedCard
- כשפוסט מכיל `video_url`, יוצג נגן וידאו עם controls
- תמיכה ב-poster/thumbnail
- Aspect ratio 16:9

### 8. RLS Policies
- **feed_posts**: מגייסים יכולים ליצור/לערוך פוסטים שלהם; מועמדים יכולים לקרוא פוסטים מפורסמים
- **feed_poll_options**: מגייסים יוצרים; כולם קוראים
- **feed-videos bucket**: מגייסים מעלים; כולם קוראים (signed URLs)

---

## פירוט טכני

### קבצים חדשים
| קובץ | תיאור |
|-------|--------|
| `src/components/feed/CreateFeedPost.tsx` | טופס יצירת פוסט (סוג, תוכן, וידאו, סקר) |
| `src/components/feed/VideoPlayer.tsx` | קומפוננטת נגן וידאו |

### קבצים מעודכנים
| קובץ | שינוי |
|-------|--------|
| `src/components/dashboard/DashboardLayout.tsx` | הוספת `create-feed-post` לסייד-בר מגייסים |
| `src/pages/Dashboard.tsx` | הוספת case ל-`create-feed-post` |
| `src/components/feed/FeedPage.tsx` | טעינת פוסטים מה-DB + fallback למוק |
| `src/components/feed/FeedCard.tsx` | תמיכה בנגן וידאו |
| `src/components/feed/feedMockData.ts` | הוספת שדה `videoUrl` לטיפוס |

### Migration SQL
1. יצירת טבלת `feed_posts` + אינדקסים
2. יצירת טבלת `feed_poll_options`
3. יצירת bucket `feed-videos`
4. RLS policies לכל הטבלאות + הבאקט
5. Enable realtime על `feed_posts`

### זרימת השימוש

**מגייסת:**
1. נכנסת לדשבורד --> לוחצת "Create Feed Content" בסייד-בר
2. בוחרת סוג פוסט (טיפ/תרבות/סקר)
3. כותבת תוכן + מעלה סרטון (אופציונלי)
4. אם סקר -- מוסיפה אפשרויות
5. לוחצת "פרסום" --> נשמר ב-DB

**מועמד:**
1. נכנס ל-PLUG Feed
2. רואה פוסטים אמיתיים מה-DB + mock data כ-fallback
3. צופה בסרטון, עושה לייק/תגובה/הצבעה --> מקבל +1 דלק יומי
