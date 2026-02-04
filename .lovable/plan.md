
# תוכנית תיקון: Plug אינטואיטיבי ו-CV Builder עם נתונים מלאים

## סקירת הבעיות

### בעיה 1: ניסיון ולימודים לא מופיעים ב-CV Builder
- ה-AI מחזיר `positions` ו-`institutions` אבל הם לא נשמרים ב-database
- הפורמט שנשמר חסר את הרשימות המפורטות

### בעיה 2: הודעת פתיחה של Plug לא מתחלפת במעבר עמודים  
- `chatContextSection` לא מתעדכן בזמן מעבר בין sections
- `plugContextPage` לא משקף את הסקשן הנוכחי

### בעיה 3: Quick Actions לא עובדים כמצופה
- לחיצה על Quick Action לא פותחת את הצ'אט עם ההודעה

---

## פתרון מוצע

### שלב 1: תיקון Edge Function `analyze-resume`
**קובץ:** `supabase/functions/analyze-resume/index.ts`

- לוודא שה-prompt מחזיר `positions` ו-`institutions` בפורמט הנכון
- להוסיף לוגים לבדיקה שהנתונים מגיעים מה-AI
- לוודא שכל הנתונים נשמרים ב-database ב-`ai_summary`

### שלב 2: תיקון זרימת Context של Plug
**קובץ:** `src/pages/Dashboard.tsx`

- לשנות את `plugContextPage` להיות תלוי ב-`currentSection` ישירות (לא ב-`chatContextSection`)
- לוודא שכש-section משתנה, ה-Plug יודע על כך

**קובץ:** `src/components/chat/PlugChat.tsx`

- לתקן את הלוגיקה שמזהה מעבר בין pages
- להוסיף הודעת context חדשה בכל מעבר section

### שלב 3: תיקון Quick Actions Flow
**קובץ:** `src/components/dashboard/DashboardLayout.tsx`

- לוודא שב-Quick Action לחיצה:
  1. נשמרת ההודעה
  2. ה-section עובר ל-'chat'
  3. הצ'אט מקבל את ההודעה

**קובץ:** `src/pages/Dashboard.tsx`

- לוודא ש-`pendingMessage` מועבר ל-PlugChat בכל מקום
- לנווט ל-section chat אחרי לחיצה על Quick Action

### שלב 4: תיקון PlugFloatingHint
**קובץ:** `src/components/chat/PlugFloatingHint.tsx`

- לוודא שכפתור ה-Sparkles באמת מציג את ההינט מחדש
- לבדוק את ה-`forceShowSignal` effect

---

## פרטים טכניים

### שינוי ב-Dashboard.tsx (זרימת context):
```text
// לפני:
const plugContextPage = useMemo(() => {
  if (chatContextSection === 'cv-builder') return 'cv-builder';
  // ...
}, [chatContextSection]);

// אחרי:
const plugContextPage = useMemo(() => {
  if (currentSection === 'cv-builder') return 'cv-builder';
  if (currentSection === 'applications') return 'applications';
  if (currentSection === 'job-search') return 'jobs';
  return 'dashboard';
}, [currentSection]);
```

### שינוי ב-DashboardLayout.tsx (Quick Actions):
```text
// ב-PlugFloatingHint:
onChatOpen={(initialMessage) => {
  onChatOpen?.(initialMessage, currentSection);
  // לא מחליפים ל-'chat' כאן - נותנים ל-Dashboard לטפל
}}
```

### שינוי ב-Dashboard.tsx (פתיחת צ'אט):
```text
onChatOpen={(initialMessage, sourceSection) => {
  if (sourceSection) setChatContextSection(sourceSection);
  if (initialMessage) setPendingMessage(initialMessage);
  // לנווט לצ'אט
  setCurrentSection('chat');
}}
```

### שינוי ב-PlugChat.tsx (מעבר pages):
```text
useEffect(() => {
  if (!user) return;
  // תמיד להוסיף הודעה כשה-context משתנה
  if (lastContextPageRef.current !== contextPage) {
    lastContextPageRef.current = contextPage;
    // הוסף הודעת פתיחה חדשה
    const g = getContextualGreeting();
    // ...
  }
}, [contextPage]);
```

---

## בדיקות נדרשות לאחר התיקון

1. **CV Builder:** העלאת קובץ חדש ובדיקה שניסיון והשכלה מופיעים עם תאריכים
2. **Plug Context:** מעבר בין Dashboard → CV Builder → Applications ובדיקה שהודעת הפתיחה משתנה
3. **Quick Actions:** לחיצה על "שפר קו״ח" ובדיקה שהצ'אט נפתח עם ההודעה
4. **Sparkles Button:** לחיצה על ✨ ובדיקה שהנוטיפיקציה מופיעה שוב

---

## הערות
- התיקונים לא ישברו פונקציונליות קיימת
- נדרש Deploy מחדש של ה-Edge Function
- מומלץ לבדוק end-to-end אחרי כל שלב
