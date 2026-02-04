
# תוכנית מקיפה לתיקונים ושיפורים

## סיכום הבעיות והבקשות

| # | נושא | סוג |
|---|------|-----|
| 1 | מסך ראשי יורד למטה בדסקטופ ובמובייל | באג |
| 2 | שיפור CV Builder - הוספת תפקידים ולימודים מרובים | שיפור (קיים!) |
| 3 | הוספת צבעים, פלטת צבעים, גודל, כיוון (לאורך/רוחב), סגנון, פונט | שיפור |
| 4 | שליחה ל-Gemini Canvas ליצירת קו"ח ויזואלי | חדש |
| 5 | Plug מחזיר את המוצר במסך הראשי | חדש |
| 6 | שאלה: איפה אולג'ובס ושאר האתרים? | הבהרה |
| 7 | שאלה: מה הכוונה "להתחבר ללינקדין"? | הבהרה |
| 8 | שאלה: מה זה Match Me? | הבהרה |
| 9 | סטטיסטיקות - צריך עוד נתונים מעניינים על השוק | שיפור |

---

## חלק 1: תיקון בעיית הסקרול (באג קריטי)

### מצב נוכחי
הקוד ב-`Dashboard.tsx` (שורות 97-106) כבר מנסה לגלול לראש:
```typescript
useEffect(() => {
  const el = document.getElementById('dashboard-scroll');
  if (el) {
    el.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  } else {
    window.scrollTo(0, 0);
  }
}, [currentSection]);
```

אבל ב-`DashboardLayout.tsx` (שורה 269):
```tsx
<main id="dashboard-scroll" className="flex-1 p-4 md:p-6 overflow-auto">
```

### בעיה אפשרית
ה-`useEffect` רץ עם `[currentSection]` כ-dependency, אבל:
1. הוא לא רץ בטעינה ראשונית כי `currentSection` מתחיל כ-`'overview'` ולא משתנה
2. יתכן שהרכיב `PlugChat` או אחרים גורמים לסקרול אוטומטי למטה

### פתרון
1. הוספת dependency ריק `[]` נוסף לטעינה ראשונית
2. בדיקה אם יש `scrollIntoView` בקומפוננטות פנימיות שגורם לבעיה
3. הוספת `scrollTo(0,0)` גם ב-`setTimeout` קטן כדי לוודא שזה קורה אחרי רינדור

```typescript
// בטעינה ראשונית
useEffect(() => {
  const scrollToTop = () => {
    const el = document.getElementById('dashboard-scroll');
    if (el) {
      el.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    window.scrollTo(0, 0);
  };
  
  scrollToTop();
  // גם אחרי timeout קטן
  const timer = setTimeout(scrollToTop, 100);
  return () => clearTimeout(timer);
}, []);

// בשינוי section
useEffect(() => {
  const el = document.getElementById('dashboard-scroll');
  if (el) {
    el.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
}, [currentSection]);
```

---

## חלק 2: CV Builder - מה כבר קיים ומה חסר

### מה כבר קיים (ב-CVEditorPanel.tsx)
הקוד כבר תומך בהוספת מרובים:
- `addExperience()` - שורה 31
- `addEducation()` - שורה 57
- `addLanguage()` - שורה 90
- `addProject()` - שורה 111

כל אחד עם כפתור "הוסף" ואפשרות למחיקה.

### מה חסר ויש להוסיף

#### 2.1 אפשרויות סגנון מורחבות (CVPreviewPanel.tsx)
כרגע יש:
- בחירת תבנית
- צבע מבטא (color picker)
- גודל פונט (small/medium/large)

**צריך להוסיף:**
- פלטת צבעים מוגדרת מראש (presets)
- כיוון (portrait/landscape)
- משפחת פונט (font family)
- ריווח (spacing)

```typescript
interface CVSettings {
  templateId: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  // חדש:
  fontFamily: 'inter' | 'roboto' | 'open-sans' | 'heebo' | 'assistant';
  orientation: 'portrait' | 'landscape';
  colorPreset: 'default' | 'professional' | 'creative' | 'minimal' | 'bold';
  spacing: 'compact' | 'normal' | 'spacious';
}
```

#### 2.2 אינטגרציית Gemini Canvas/Nano Banana
יצירת Edge Function חדשה `cv-generate-visual`:
```typescript
// שולח את כל הנתונים ל-Gemini עם בקשה ליצור עיצוב
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  body: JSON.stringify({
    model: "google/gemini-2.5-flash-image", // Nano Banana
    messages: [
      { role: "user", content: `Create a professional CV image based on: ${JSON.stringify(cvData)}` }
    ],
    modalities: ["image", "text"]
  })
});
```

#### 2.3 Plug מחזיר את המוצר במסך הראשי
הוספת state ב-Dashboard לשמירת התמונה שנוצרה:
```typescript
const [generatedCVImage, setGeneratedCVImage] = useState<string | null>(null);
```

ו-Card שמציג את התוצאה:
```tsx
{generatedCVImage && (
  <Card>
    <CardHeader>
      <CardTitle>Your AI-Generated CV</CardTitle>
    </CardHeader>
    <CardContent>
      <img src={generatedCVImage} alt="Generated CV" />
      <Button onClick={downloadCV}>Download</Button>
    </CardContent>
  </Card>
)}
```

---

## חלק 3: הבהרות על Crawler ו-Match Me

### 3.1 Crawler - איפה אולג'ובס ושאר האתרים?

**מצב נוכחי:**
- Edge Function `job-crawler` (נוצר כבר) תומך ב-3 פלטפורמות:
  - `linkedin`
  - `alljobs`
  - `drushim`
- המסך `CrawlerSettings.tsx` (תפריט: Job Crawler) מאפשר:
  - הפעלה/כיבוי אוטומטי
  - בחירת פלטפורמות
  - הגדרת מילות חיפוש ומיקומים
  - הפעלת סריקה ידנית

**מה צריך כדי שזה יעבוד אוטומטית ברקע:**
1. חיבור Firecrawl Connector (כבר מוגדר)
2. ה-pg_cron job שהוגדר צריך להיות מופעל
3. הסריקה עובדת לכל המשתמשים (לא per-user)

### 3.2 "להתחבר ללינקדין" - מה הכוונה?

**הבהרה:**
- **לא נדרש** חיבור OAuth לחשבון LinkedIn של המשתמש
- ה-Crawler פשוט סורק את דפי החיפוש הציבוריים של LinkedIn Jobs
- הבעיה: LinkedIn חוסם בקשות אוטומטיות (anti-bot)
- הפתרון: Firecrawl מטפל בזה עם JavaScript rendering ו-waiting

### 3.3 Match Me - מה הפונקציה עושה?

**מצב נוכחי** (JobSearchPage.tsx שורות 224-256):
הפונקציה מסננת משרות לפי:
1. כישורים טכניים מקורות החיים (`cv_data.skills.technical`)
2. תחומים מועדפים מהפרופיל (`preferred_fields`)
3. תפקידים מועדפים (`preferred_roles`)

```typescript
return jobs.filter(job => {
  const jobDesc = (job.description + job.title + job.requirements).toLowerCase();
  const hasSkillMatch = skills.some(skill => jobDesc.includes(skill.toLowerCase()));
  const hasFieldMatch = preferredFields.some(field => job.job_field?.slug === field);
  return hasSkillMatch || hasFieldMatch;
});
```

**שיפור מוצע:**
- הוספת ציון התאמה (score) לכל משרה
- הצגת אחוז התאמה
- הסבר למה המשרה מתאימה

---

## חלק 4: סטטיסטיקות מורחבות על שוק העבודה

### מצב נוכחי (JobInsightsStats.tsx)
רק תרשים פאי של משרות לפי עיר.

### שיפורים מוצעים

#### 4.1 נתונים נוספים
```typescript
interface MarketInsights {
  jobsByCity: { name: string; value: number }[];
  jobsByField: { name: string; value: number }[];
  jobsByExperience: { name: string; value: number }[];
  salaryRanges: { range: string; count: number }[];
  trendingSkills: { skill: string; count: number }[];
  remoteVsOnsite: { remote: number; onsite: number; hybrid: number };
  newJobsThisWeek: number;
  avgSalaryByField: { field: string; avgSalary: number }[];
}
```

#### 4.2 ויזואליזציות חדשות
- Bar chart: משרות לפי תחום
- Donut chart: Remote vs Onsite vs Hybrid
- Line chart: מגמות לאורך זמן
- Word cloud: כישורים נדרשים

#### 4.3 קומפוננטות חדשות
```text
src/components/jobs/
├── JobInsightsStats.tsx (קיים - נשדרג)
├── MarketTrendsCard.tsx (חדש)
├── SalaryInsightsCard.tsx (חדש)
└── SkillsDemandCard.tsx (חדש)
```

---

## סיכום פעולות

| # | פעולה | קבצים |
|---|-------|-------|
| 1 | תיקון סקרול לראש | `Dashboard.tsx` |
| 2 | הוספת אפשרויות סגנון ל-CV Builder | `types.ts`, `CVPreviewPanel.tsx` |
| 3 | אינטגרציית Gemini Canvas | Edge Function חדש + `CVBuilder.tsx` |
| 4 | הוספת סטטיסטיקות שוק | `JobInsightsStats.tsx` + קומפוננטות חדשות |
| 5 | שיפור Match Me עם ציונים | `JobSearchPage.tsx` |
| 6 | וידוא ש-Crawler עובד ברקע | בדיקת pg_cron |

---

## פירוט טכני: עדכון types.ts

```typescript
export interface CVSettings {
  templateId: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'inter' | 'roboto' | 'open-sans' | 'heebo' | 'assistant';
  orientation: 'portrait' | 'landscape';
  colorPreset: 'default' | 'professional' | 'creative' | 'minimal' | 'bold';
  spacing: 'compact' | 'normal' | 'spacious';
}

// Color presets
export const colorPresets = {
  default: { primary: '#3b82f6', secondary: '#64748b', accent: '#10b981' },
  professional: { primary: '#1e3a5f', secondary: '#374151', accent: '#0891b2' },
  creative: { primary: '#8b5cf6', secondary: '#6366f1', accent: '#ec4899' },
  minimal: { primary: '#374151', secondary: '#6b7280', accent: '#9ca3af' },
  bold: { primary: '#dc2626', secondary: '#1f2937', accent: '#f97316' },
};
```

---

## פירוט טכני: סטטיסטיקות מורחבות

```tsx
// JobInsightsStats.tsx - גרסה משודרגת
export function JobInsightsStats({ jobs }: JobInsightsStatsProps) {
  // נתונים קיימים
  const cityData = useMemo(() => aggregateByCity(jobs), [jobs]);
  
  // נתונים חדשים
  const fieldData = useMemo(() => aggregateByField(jobs), [jobs]);
  const experienceData = useMemo(() => aggregateByExperience(jobs), [jobs]);
  const remoteData = useMemo(() => aggregateByWorkType(jobs), [jobs]);
  const trendingSkills = useMemo(() => extractTopSkills(jobs), [jobs]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Pie: Jobs by City */}
      <Card>...</Card>
      
      {/* Bar: Jobs by Field */}
      <Card>
        <CardHeader><CardTitle>Jobs by Field</CardTitle></CardHeader>
        <CardContent>
          <BarChart data={fieldData}>...</BarChart>
        </CardContent>
      </Card>
      
      {/* Donut: Remote vs Onsite */}
      <Card>
        <CardHeader><CardTitle>Work Type</CardTitle></CardHeader>
        <CardContent>
          <PieChart data={remoteData}>...</PieChart>
        </CardContent>
      </Card>
      
      {/* Trending Skills */}
      <Card>
        <CardHeader><CardTitle>Trending Skills</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {trendingSkills.map(s => (
              <Badge key={s.skill}>{s.skill} ({s.count})</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```
