
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
| LinkedIn | `linkedin.com` | waitFor: 5000ms, הנחיות חיפוש company ספציפיות |
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
|  [כפתור: יבוא מרובה של משרות]               |
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
|          [x] סמן כ"הוגש קו"ח" בתאריך היום  |
|                                            |
|  [כפתור: התחל יבוא]                        |
+--------------------------------------------+
```

### פורמטים נתמכים

| פורמט | סיומת | ספרייה לפענוח |
|-------|-------|---------------|
| Excel | .xlsx, .xls | SheetJS (xlsx) |
| CSV | .csv | Native parsing |
| Text | .txt | Native parsing |
| הדבקה ישירה | - | Split by newline |

---

## פרטים טכניים

### שלב 1: עדכון Edge Function - זיהוי פלטפורמות

שינויים ב-`supabase/functions/scrape-job/index.ts`:

1. הוספת interface להגדרות פלטפורמה:
```typescript
interface PlatformConfig {
  name: string;
  waitFor: number;
  promptHint: string;
}
```

2. פונקציית זיהוי פלטפורמה:
```typescript
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

3. שימוש ב-waitFor דינמי ב-Firecrawl:
```typescript
const platform = detectPlatform(url);
console.log(`Detected platform: ${platform.name}`);

body: JSON.stringify({
  url: url,
  formats: ['markdown'],
  onlyMainContent: true,
  waitFor: platform.waitFor, // Dynamic wait time
})
```

4. שיפור ה-AI Prompt עם ההנחיה הספציפית:
```typescript
content: `... ${platform.promptHint}`
```

---

### שלב 2: Edge Function חדש - יבוא מרובה

קובץ חדש: `supabase/functions/bulk-import-jobs/index.ts`

```typescript
// Endpoint: POST /bulk-import-jobs
// Body: { 
//   urls: string[], 
//   addToApplications: boolean, 
//   markAsApplied: boolean,
//   shareToComm: boolean
// }

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

לוגיקת העיבוד:
1. קבלת רשימת URLs
2. עיבוד מקבילי (עד 3 בו-זמנית)
3. לכל URL:
   - קריאה ללוגיקה הקיימת של scrape-job
   - שמירת Job לקהילה (אם shareToComm=true)
   - אם addToApplications=true: יצירת Application
   - אם markAsApplied=true: current_stage='applied', הוספת timeline event

---

### שלב 3: קומפוננטת UI חדשה

`src/components/applications/BulkImportDialog.tsx`:

- Tabs: קובץ | הדבק לינקים
- Drop zone לקבצים
- Textarea להדבקת לינקים
- Checkboxes לאפשרויות
- Progress bar עם סטטוס לכל URL
- סיכום סופי עם הצלחות/כשלונות

---

### שלב 4: ספריית Excel

שימוש בספריית `xlsx` (SheetJS) לפענוח קבצי Excel:

`src/lib/excel-parser.ts`:
```typescript
import * as XLSX from 'xlsx';

export const parseFile = async (file: File): Promise<string[]> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  } else if (extension === 'csv') {
    return parseCsvFile(file);
  } else if (extension === 'txt') {
    return parseTextFile(file);
  }
  
  throw new Error('Unsupported file format');
};
```

---

### שלב 5: אינטגרציה בממשק

עדכון `ApplicationsPage.tsx`:
- הוספת כפתור "יבוא מרובה" ליד Add Application
- State חדש: showBulkImport
- הוספת BulkImportDialog component

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
| `supabase/config.toml` | הוספת bulk-import-jobs |
| `package.json` | הוספת ספריית xlsx |

---

## יתרונות הפתרון

- **זיהוי חכם**: Firecrawl + הגדרות מותאמות לכל פלטפורמה (LinkedIn, AllJobs, Drushim)
- **חוויית משתמש**: יבוא מאסיבי בלחיצה אחת
- **גמישות**: תמיכה בקבצים שונים או הדבקה ידנית
- **אוטומציה**: סימון אוטומטי של "הוגש קו"ח"
- **שיתוף**: אפשרות להוסיף גם לקהילה וגם למועמדויות אישיות
