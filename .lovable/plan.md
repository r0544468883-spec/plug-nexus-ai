
# תוכנית תיקון - 3 בעיות

## בעיה 1: מסך Overview יורד למטה

### אבחון
ב-`PlugChat.tsx` שורה 144:
```typescript
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

זה גורם לסקרול **למטה** בכל פעם שההודעות משתנות. כשה-Overview נטען, ה-PlugChat טוען את ההיסטוריה וגורם לסקרול למטה.

### פתרון
1. הגבל את ה-`scrollIntoView` רק לתוך ה-chat container עצמו (לא לכל הדף)
2. השתמש ב-`{ block: 'nearest' }` במקום `{ behavior: 'smooth' }` כדי שזה לא ישפיע על ה-parent scroll
3. הוסף בדיקה שה-chat באמת visible לפני הסקרול

**שינוי ב-PlugChat.tsx:**
```typescript
// במקום:
messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

// יהיה:
if (chatContainerRef.current && messagesEndRef.current) {
  // Scroll only within the chat container
  chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
}
```

---

## בעיה 2: CV Builder - חזרה לממשק הטופס המקורי עם הצגת פרומפט

### מצב נוכחי
- `CVChatBuilder.tsx` - ממשק שיחה (לא רצוי)
- `CVBuilder.tsx` + `CVEditorPanel.tsx` - ממשק טופס מקורי (רצוי!)

### מה רוצים
1. לשמור על הטופס המקורי (CVEditorPanel) כפי שהיה
2. להוסיף כפתור "סיימתי - צור קורות חיים" בסוף
3. בלחיצה - להציג Dialog עם הפרומפט שייצא ל-Gemini Canvas
4. המשתמש יכול לערוך את הפרומפט או לשלוח כמו שהוא
5. לאחר שליחה - התמונה מוצגת למשתמש

### שינויים נדרשים

**1. עדכון Dashboard.tsx:**
להחזיר את `CVBuilder` במקום `CVChatBuilder`

**2. עדכון CVBuilder.tsx:**
הוספת כפתור "סיימתי" + Dialog להצגת הפרומפט

**3. יצירת פונקציה `buildCVPrompt`:**
```typescript
function buildCVPrompt(data: CVData): string {
  // בונה את הפרומפט המלא מכל הנתונים
  return `Create a professional CV...
  Name: ${data.personalInfo.fullName}
  Title: ${data.personalInfo.title}
  ...`;
}
```

**4. Dialog חדש להצגת הפרומפט:**
```text
+------------------------------------------+
| Preview Prompt                      [X]  |
+------------------------------------------+
| This is the prompt that will be sent     |
| to AI to generate your CV:               |
|                                          |
| [Editable Textarea with prompt]          |
|                                          |
+------------------------------------------+
| [Cancel]                  [Generate CV]  |
+------------------------------------------+
```

**5. תהליך יצירת התמונה:**
- לחיצה על "Generate CV" שולחת ל-`cv-generate-visual`
- התמונה מוצגת ב-Dialog חדש או בפאנל התצוגה
- אפשרות להורדה

---

## בעיה 3: Crawler לא מוצא משרות

### אבחון
- ה-cron jobs **פעילים** (3 פעמים ביום: 05:00, 11:00, 17:00 UTC)
- הסריקות רצות אבל מחזירות `jobs_found: 0`
- הבעיה: Firecrawl Map לא מחזיר URLs, ו-Scrape fallback גם לא מוצא

### סיבות אפשריות
1. **LinkedIn**: חוסם סקריפטים (צריך session/cookies)
2. **AllJobs/Drushim**: ה-regex patterns לא מתאימים ל-HTML
3. **Firecrawl**: ה-waitFor לא מספיק זמן

### פתרון
1. **הוספת Logging מפורט** לראות מה בדיוק חוזר מ-Firecrawl
2. **תיקון ה-regex patterns** להתאים ל-structure האמיתי של האתרים
3. **הוספת fallback חכם יותר** - במקום לחפש URLs ב-markdown, לחפש ב-links array
4. **הוספת indicator במסך** - להראות למשתמש את הסטטוס האמיתי

### שינויים ל-job-crawler/index.ts:

```typescript
// 1. Logging משופר
console.log('Map response:', JSON.stringify(mapData, null, 2));
console.log('All links from Firecrawl:', mapData.links);

// 2. Regex patterns מעודכנים
// LinkedIn:
const linkedinPatches = content.matchAll(/linkedin\.com\/jobs\/view\/(\d+)/gi);

// AllJobs:
const alljobsMatches = content.matchAll(/alljobs\.co\.il\/jobs\/[^"'\s>]+/gi);

// 3. הדפסת מה נמצא
console.log(`Found ${jobUrls.length} URLs:`, jobUrls);
```

### הוספת מידע למסך CrawlerSettings:
- הוספת Badge "Last successful crawl" עם תאריך
- הצגת כמה משרות נמצאו בסה"כ
- כפתור "View Logs" לראות מה קרה

---

## סיכום שינויים לקבצים

| קובץ | שינוי |
|------|-------|
| `src/components/chat/PlugChat.tsx` | תיקון scrollIntoView שלא ישפיע על parent |
| `src/pages/Dashboard.tsx` | החזרת CVBuilder במקום CVChatBuilder |
| `src/components/cv-builder/CVBuilder.tsx` | הוספת כפתור "סיימתי", Dialog לפרומפט, יצירת תמונה |
| `supabase/functions/job-crawler/index.ts` | Logging, regex fixes, better fallback |
| `src/components/crawler/CrawlerSettings.tsx` | הוספת סטטיסטיקות ומידע על הסטטוס |

---

## איך תדע שה-Crawler עובד?

1. **במסך Job Crawler** - תראה סריקות עם `jobs_found > 0`
2. **במסך חיפוש משרות** - יופיעו משרות חדשות מ-LinkedIn/AllJobs/Drushim
3. **בלוגים** - אפשר לבדוק את הלוגים של ה-Edge Function
4. **בדיקה ידנית** - לחיצה על "Run Crawl Now" ולראות תוצאות

### לוח זמנים הסריקות האוטומטיות (UTC):
- 05:00 (07:00 שעון ישראל)
- 11:00 (13:00 שעון ישראל)  
- 17:00 (19:00 שעון ישראל)
