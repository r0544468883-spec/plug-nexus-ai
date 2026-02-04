

# תוכנית: CV Builder משודרג עם יצירת עיצוב AI ושיפורי UX

## סיכום
שיפור מקיף ל-CV Builder שכולל:
1. יצירת עיצוב קורות חיים באמצעות AI (Gemini Canvas-style בתוך האפליקציה)
2. Skills & Soft Skills עם רובריקות לבחירה מרובה
3. Languages עם רובריקות ותיקון בעיית הצבע הלבן
4. שילוב Smart Import עם יצירת העיצוב

---

## שלב 1: רובריקות Skills עם בחירה מרובה

### מה ישתנה
במקום שדה טקסט חופשי, יוצגו רשימות מוכנות של מיומנויות לבחירה:

**Technical Skills** - רובריקות לפי קטגוריות:
- Programming: JavaScript, Python, TypeScript, Java, C++, Go, Ruby, PHP
- Frontend: React, Vue, Angular, HTML/CSS, Tailwind, Next.js
- Backend: Node.js, Django, FastAPI, Spring Boot, .NET
- Database: PostgreSQL, MongoDB, MySQL, Redis, Elasticsearch
- Cloud: AWS, Azure, GCP, Docker, Kubernetes
- Tools: Git, CI/CD, Jira, Figma, Slack

**Soft Skills** - רובריקות:
- Leadership, Communication, Teamwork, Problem Solving
- Time Management, Creativity, Adaptability, Critical Thinking
- Negotiation, Presentation, Conflict Resolution, Decision Making

### עיצוב UI
- כפתורי Chip/Badge לכל מיומנות
- סימון מרובה בלחיצה
- אפשרות להוסיף מיומנות custom
- צבע שונה למיומנויות נבחרות

---

## שלב 2: רובריקות שפות + תיקון צבע

### שפות מוכנות לבחירה
- עברית, English, Arabic, Russian, French, Spanish, German, Chinese, Portuguese, Italian, Hindi, Japanese, Korean

### תיקון בעיית הצבע הלבן
ה-select הנוכחי:
```html
<select className="border rounded px-2 py-2 text-sm">
```
חסר עיצוב לטקסט - יתוקן ל:
```html
<Select> component מ-shadcn עם סגנון נכון
```

---

## שלב 3: יצירת עיצוב AI (Canvas-style בתוך האפליקציה)

### Flow חדש
1. משתמש ממלא את הטופס (או מייבא דרך Smart Import)
2. לוחץ על **"צור עיצוב עם AI"**
3. נפתח Dialog עם:
   - תצוגה מקדימה של ה-Prompt שיישלח
   - אפשרות לערוך את ה-Prompt
   - בחירת סגנון (Professional, Creative, Modern, Minimal)
4. AI מייצר **עיצוב HTML/CSS** מותאם אישית
5. התוצאה מוצגת לעריכה בתוך האפליקציה
6. אפשרות להוריד כ-PDF או לשמור לפרופיל

### Edge Function: cv-generate-design
במקום ייצור תמונה, ה-AI ייצר:
```json
{
  "html": "<div class='cv-container'>...</div>",
  "css": ".cv-container { ... }",
  "metadata": { "style": "professional", "colors": [...] }
}
```

### עורך תוצאה
- תצוגה WYSIWYG של ה-HTML שנוצר
- אפשרות לערוך טקסט ישירות
- כפתור "בקש שינוי" לשליחת הוראה נוספת ל-AI
- Export ל-PDF

---

## שלב 4: שילוב Smart Import עם יצירת AI

### Flow משופר
```text
1. Smart Import → ניתוח קובץ
2. הצגת נתונים שחולצו → שאלות עיצוב
3. לחיצה על "צור עם AI"
4. פתיחת עורך Prompt → עריכה
5. יצירה → תצוגה מקדימה → עריכה
6. Export / Save
```

---

## שינויים טכניים

### קבצים חדשים
| קובץ | תיאור |
|------|--------|
| `src/components/cv-builder/SkillsSelector.tsx` | רובריקות Skills עם בחירה מרובה |
| `src/components/cv-builder/LanguageSelector.tsx` | רובריקות שפות עם Select מתוקן |
| `src/components/cv-builder/AIDesignDialog.tsx` | Dialog ליצירת עיצוב AI |
| `src/components/cv-builder/AIDesignPreview.tsx` | תצוגה ועריכה של עיצוב שנוצר |

### קבצים שיעודכנו
| קובץ | שינוי |
|------|-------|
| `src/components/cv-builder/CVEditorPanel.tsx` | החלפת שדות Skills ו-Languages ברכיבים החדשים |
| `src/components/cv-builder/CVBuilder.tsx` | הוספת כפתור "צור עיצוב AI" ו-Dialog |
| `src/components/cv-builder/CVImportWizard.tsx` | הוספת אפשרות "צור עם AI" בסיום |
| `supabase/functions/cv-generate-visual/index.ts` | שינוי ליצירת HTML במקום תמונה |

### מבנה נתונים חדש לרובריקות
```typescript
// src/lib/cv-skills-taxonomy.ts
export const TECHNICAL_SKILLS = {
  programming: ['JavaScript', 'Python', 'TypeScript', ...],
  frontend: ['React', 'Vue', 'Angular', ...],
  backend: ['Node.js', 'Django', ...],
  // ...
};

export const SOFT_SKILLS = [
  'Leadership', 'Communication', 'Teamwork', ...
];

export const LANGUAGES = [
  { code: 'he', name: 'עברית', nameEn: 'Hebrew' },
  { code: 'en', name: 'English', nameEn: 'English' },
  // ...
];
```

---

## Prompt ל-AI Design

```text
You are a professional CV/resume designer. Create a clean, ATS-friendly CV design.

CANDIDATE INFO:
- Name: {fullName}
- Title: {title}
- Summary: {summary}

EXPERIENCE:
{experience formatted}

EDUCATION:
{education formatted}

SKILLS:
Technical: {technical skills}
Soft: {soft skills}

DESIGN PREFERENCES:
- Style: {style - Professional/Creative/Modern/Minimal}
- Color: {accentColor}
- Font: {fontFamily}
- Layout: {orientation}

Generate a complete HTML document with inline CSS for a printable A4 resume.
Use modern, clean design. Ensure good contrast and readability.
Support both LTR and RTL text.
```

---

## אבטחה ו-RLS
- ללא שינויים נדרשים - ה-Edge Function קיים ואין גישה ל-DB

---

## סיכום יתרונות
1. **UX משופר** - רובריקות במקום טקסט חופשי = מהיר יותר ופחות שגיאות
2. **עיצוב AI אמיתי** - לא תמונה אלא HTML ניתן לעריכה
3. **תיקון באגים** - צבע לבן ב-Languages נפתר
4. **Flow אחיד** - Smart Import → AI Design → Export

