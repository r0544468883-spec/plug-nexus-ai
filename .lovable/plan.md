
# תמיכה מורחבת בסריקת משרות + יבוא מרובה מקבצים

## סקירה כללית

הפתרון כולל שתי יכולות חדשות:
1. **זיהוי אוטומטי של פלטפורמות** - LinkedIn, AllJobs, Drushim עם הגדרות סריקה מותאמות לכל פלטפורמה
2. **יבוא מרובה של משרות** - העלאת קובץ Excel/CSV עם לינקים, ניתוח אוטומטי, והוספה לקהילה ולמועמדויות

---

## חלק 1: זיהוי אוטומטי של פלטפורמות

### לוגיקה חדשה ב-Edge Function

| פלטפורמה | דומיין | הגדרות מיוחדות |
|----------|--------|-----------------|
| LinkedIn | `linkedin.com` | waitFor: 5000ms, חיפוש company-name בפורמט ספציפי |
| AllJobs | `alljobs.co.il` | waitFor: 3000ms, תמיכה בעברית |
| Drushim | `drushim.co.il` | waitFor: 3000ms, תמיכה בעברית |
| כללי | כל שאר האתרים | waitFor: 2000ms |

### שיפורים ב-AI Prompt לפי פלטפורמה

```text
// LinkedIn
"For LinkedIn: Look for company name after 'at ' or in the 'company' section."

// AllJobs / Drushim
"Content may be in Hebrew. Extract company name even if in Hebrew characters."
```

---

## חלק 2: יבוא מרובה של משרות (Multiple Links Import)

### Flow חדש למשתמש

```text
+--------------------------------------------+
|  [לחצן: יבוא מרובה של משרות]               |
+--------------------------------------------+
        |
        v
+--------------------------------------------+
|  [דיאלוג יבוא]                             |
|                                            |
|  1. גרור קובץ Excel/CSV עם לינקים          |
|     או הדבק לינקים (אחד בכל שורה)          |
|                                            |
|  2. פלאג מנתח את כל הלינקים               |
|                                            |
|  3. תצוגה מקדימה של המשרות שנמצאו         |
|                                            |
|  4. בחר: [ ] שתף לקהילה                    |
|          [x] הוסף למועמדויות שלי           |
|          [x] סמן כ-"הוגש קו"ח" בתאריך היום|
+--------------------------------------------+
```

### פורמטים נתמכים

| פורמט | סיומת | ספרייה לפענוח |
|-------|-------|---------------|
| Excel | .xlsx, .xls | SheetJS (xlsx) |
| CSV | .csv | Native parsing |
| Text | .txt | Native parsing |
| הדבקה ישירה | - | Split by newline |

### עמודות נתמכות בקובץ

הפייסר יחפש לינקים ב:
- עמודה A (ראשונה)
- עמודה בשם "URL", "Link", "קישור"
- כל תא שמתחיל ב-`http`

---

## שלב 1: עדכון Edge Function - זיהוי פלטפורמות

### שינויים ב-`supabase/functions/scrape-job/index.ts`

```typescript
// Platform detection helper
function detectPlatform(url: string): PlatformConfig {
  const hostname = new URL(url).hostname.toLowerCase();
  
  if (hostname.includes('linkedin.com')) {
    return {
      name: 'linkedin',
      waitFor: 5000,
      promptHint: 'For LinkedIn: company name appears after "at " or in job header.'
    };
  }
  if (hostname.includes('alljobs.co.il')) {
    return {
      name: 'alljobs',
      waitFor: 3000,
      promptHint: 'Hebrew job board. Company name may be in Hebrew.'
    };
  }
  if (hostname.includes('drushim.co.il')) {
    return {
      name: 'drushim',
      waitFor: 3000,
      promptHint: 'Hebrew job board. Look for company in structured data.'
    };
  }
  
  return { name: 'generic', waitFor: 2000, promptHint: '' };
}
```

### שימוש ב-Firecrawl עם הגדרות מותאמות

```typescript
const platform = detectPlatform(url);
console.log(`Detected platform: ${platform.name}`);

const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: url,
    formats: ['markdown'],
    onlyMainContent: true,
    waitFor: platform.waitFor, // Dynamic wait time
  }),
});
```

---

## שלב 2: Edge Function חדש - יבוא מרובה

### קובץ חדש: `supabase/functions/bulk-import-jobs/index.ts`

```typescript
// Endpoint: POST /bulk-import-jobs
// Body: { urls: string[], addToApplications: boolean, markAsApplied: boolean }

interface BulkImportResult {
  success: boolean;
  totalUrls: number;
  processed: number;
  failed: number;
  results: {
    url: string;
    status: 'success' | 'error';
    job?: { id: string; title: string; company: string };
    application_id?: string;
    error?: string;
  }[];
}
```

### לוגיקת העיבוד

1. קבלת רשימת URLs
2. עיבוד מקבילי (עד 5 בו-זמנית)
3. לכל URL:
   - קריאה ל-scrape-job logic
   - שמירת Job לקהילה
   - אם addToApplications=true: יצירת Application
   - אם markAsApplied=true: current_stage='applied', הוספת timeline event

---

## שלב 3: קומפוננטת UI חדשה

### `src/components/applications/BulkImportDialog.tsx`

```text
+------------------------------------------+
|  יבוא מרובה של משרות                     |
|  Import Multiple Jobs                     |
|------------------------------------------|
|                                          |
|  [Tabs: קובץ | הדבק לינקים]              |
|                                          |
|  [Tab: קובץ]                             |
|  +--------------------------------------+|
|  |  גרור קובץ Excel או CSV לכאן        ||
|  |  [icon: Upload]                       ||
|  |  תומך ב: .xlsx, .csv, .txt           ||
|  +--------------------------------------+|
|                                          |
|  [Tab: הדבק לינקים]                      |
|  +--------------------------------------+|
|  | https://linkedin.com/jobs/123        ||
|  | https://alljobs.co.il/job/456        ||
|  | https://drushim.co.il/job/789        ||
|  +--------------------------------------+|
|                                          |
|  נמצאו: 15 לינקים                        |
|                                          |
|  [x] שתף את המשרות לקהילה               |
|  [x] הוסף למועמדויות שלי                |
|  [x] סמן כ"הוגש קו"ח" בתאריך היום       |
|                                          |
|  [כפתור: התחל יבוא]                      |
+------------------------------------------+
```

### מצב עיבוד

```text
+------------------------------------------+
|  מעבד משרות...                           |
|------------------------------------------|
|                                          |
|  [=========>          ] 7/15             |
|                                          |
|  ✓ Frontend Developer @ Google           |
|  ✓ Backend Engineer @ Meta               |
|  ⏳ Product Manager @ Apple              |
|  ⏳ Designer @ Netflix                   |
|  ...                                     |
+------------------------------------------+
```

### סיכום לאחר סיום

```text
+------------------------------------------+
|  יבוא הושלם! 🎉                          |
|------------------------------------------|
|                                          |
|  ✓ 12 משרות נוספו בהצלחה                |
|  ✗ 3 משרות נכשלו                        |
|                                          |
|  [רשימת הכשלונות עם סיבה]               |
|                                          |
|  [כפתור: סגור]                           |
+------------------------------------------+
```

---

## שלב 4: התקנת ספריית Excel

### שינויים ב-`package.json`

```json
{
  "dependencies": {
    "xlsx": "^0.18.5"
  }
}
```

### שימוש לפענוח קובץ

```typescript
import * as XLSX from 'xlsx';

const parseExcelFile = async (file: File): Promise<string[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 });
  
  const urls: string[] = [];
  for (const row of rows) {
    for (const cell of Object.values(row)) {
      if (typeof cell === 'string' && cell.startsWith('http')) {
        urls.push(cell.trim());
      }
    }
  }
  return [...new Set(urls)]; // Remove duplicates
};
```

---

## שלב 5: אינטגרציה בממשק

### עדכון `ApplicationsPage.tsx`

```typescript
// הוספת כפתור "יבוא מרובה" ליד Add Application
<Button onClick={() => setShowBulkImport(true)} variant="outline">
  <FileSpreadsheet className="w-4 h-4" />
  {isRTL ? 'יבוא מרובה' : 'Bulk Import'}
</Button>

<BulkImportDialog 
  open={showBulkImport} 
  onOpenChange={setShowBulkImport}
  onComplete={fetchApplications}
/>
```

---

## סיכום קבצים

### קבצים חדשים:
| קובץ | תיאור |
|------|-------|
| `supabase/functions/bulk-import-jobs/index.ts` | Edge function לעיבוד מרובה |
| `src/components/applications/BulkImportDialog.tsx` | דיאלוג יבוא |
| `src/lib/excel-parser.ts` | פונקציות עזר לפענוח קבצים |

### קבצים לעדכון:
| קובץ | שינוי |
|------|-------|
| `supabase/functions/scrape-job/index.ts` | זיהוי פלטפורמות + הגדרות מותאמות |
| `src/components/applications/ApplicationsPage.tsx` | כפתור יבוא מרובה |
| `package.json` | הוספת ספריית xlsx |

---

## יתרונות הפתרון

- **זיהוי חכם**: Firecrawl + הגדרות מותאמות לכל פלטפורמה
- **חוויית משתמש**: יבוא מאסיבי בלחיצה אחת
- **גמישות**: תמיכה בקבצים שונים או הדבקה ידנית
- **אוטומציה**: סימון אוטומטי של "הוגש קו"ח"
- **שיתוף**: אפשרות להוסיף גם לקהילה וגם למועמדויות אישיות
