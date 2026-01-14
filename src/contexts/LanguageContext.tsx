import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'he';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // General
    'app.name': 'PLUG',
    'app.tagline': 'The AI-Driven HR Operating System',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.continue': 'Continue',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.or': 'or',
    
    // Identity Selection
    'identity.title': 'How do you want to use PLUG?',
    'identity.subtitle': 'Choose your role to get a personalized experience',
    'identity.job_seeker': 'Job Seeker',
    'identity.job_seeker_desc': 'Find your dream job with AI-powered matching and interview prep',
    'identity.freelance_hr': 'Freelance HR',
    'identity.freelance_hr_desc': 'Manage multiple clients and candidates with smart automation',
    'identity.inhouse_hr': 'In-house HR',
    'identity.inhouse_hr_desc': 'Streamline your company\'s hiring pipeline and employee management',
    'identity.company_employee': 'Company Employee',
    'identity.company_employee_desc': 'Access documents, policies, and communicate with HR seamlessly',
    
    // Auth
    'auth.login': 'Sign In',
    'auth.register': 'Create Account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.full_name': 'Full Name',
    'auth.phone': 'Phone Number',
    'auth.confirm_password': 'Confirm Password',
    'auth.forgot_password': 'Forgot password?',
    'auth.no_account': 'Don\'t have an account?',
    'auth.have_account': 'Already have an account?',
    'auth.sign_up': 'Sign up',
    'auth.sign_in': 'Sign in',
    'auth.logout': 'Sign Out',
    'auth.welcome_back': 'Welcome back to PLUG',
    'auth.create_account_title': 'Join PLUG',
    'auth.create_account_subtitle': 'Create your account to get started',
    
    // Dashboard
    'dashboard.welcome': 'Welcome',
    'dashboard.overview': 'Overview',
    'dashboard.recent_activity': 'Recent Activity',
    
    // Plug AI
    'plug.greeting': 'Hey there! I\'m Plug, your AI HR assistant.',
    'plug.placeholder': 'Ask me anything...',
    'plug.thinking': 'Analyzing...',
  },
  he: {
    // General
    'app.name': 'PLUG',
    'app.tagline': 'מערכת ההפעלה המונעת ב-AI למשאבי אנוש',
    'common.loading': 'טוען...',
    'common.error': 'משהו השתבש',
    'common.save': 'שמור',
    'common.cancel': 'ביטול',
    'common.continue': 'המשך',
    'common.back': 'חזור',
    'common.next': 'הבא',
    'common.submit': 'שלח',
    'common.or': 'או',
    
    // Identity Selection
    'identity.title': 'איך אתה רוצה להשתמש ב-PLUG?',
    'identity.subtitle': 'בחר את התפקיד שלך לחוויה מותאמת אישית',
    'identity.job_seeker': 'מחפש עבודה',
    'identity.job_seeker_desc': 'מצא את עבודת החלומות שלך עם התאמה מונעת AI והכנה לראיונות',
    'identity.freelance_hr': 'HR פרילנס',
    'identity.freelance_hr_desc': 'נהל מספר לקוחות ומועמדים עם אוטומציה חכמה',
    'identity.inhouse_hr': 'HR פנים-ארגוני',
    'identity.inhouse_hr_desc': 'ייעל את תהליך הגיוס ואת ניהול העובדים בחברה שלך',
    'identity.company_employee': 'עובד חברה',
    'identity.company_employee_desc': 'גישה למסמכים, מדיניות ותקשורת עם HR בצורה חלקה',
    
    // Auth
    'auth.login': 'התחברות',
    'auth.register': 'צור חשבון',
    'auth.email': 'אימייל',
    'auth.password': 'סיסמה',
    'auth.full_name': 'שם מלא',
    'auth.phone': 'מספר טלפון',
    'auth.confirm_password': 'אישור סיסמה',
    'auth.forgot_password': 'שכחת סיסמה?',
    'auth.no_account': 'אין לך חשבון?',
    'auth.have_account': 'כבר יש לך חשבון?',
    'auth.sign_up': 'הירשם',
    'auth.sign_in': 'התחבר',
    'auth.logout': 'התנתק',
    'auth.welcome_back': 'ברוך הבא חזרה ל-PLUG',
    'auth.create_account_title': 'הצטרף ל-PLUG',
    'auth.create_account_subtitle': 'צור את החשבון שלך כדי להתחיל',
    
    // Dashboard
    'dashboard.welcome': 'ברוך הבא',
    'dashboard.overview': 'סקירה כללית',
    'dashboard.recent_activity': 'פעילות אחרונה',
    
    // Plug AI
    'plug.greeting': 'היי! אני Plug, עוזר ה-AI שלך למשאבי אנוש.',
    'plug.placeholder': 'שאל אותי כל דבר...',
    'plug.thinking': 'מנתח...',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  const direction: Direction = language === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    // Check for stored preference
    const stored = localStorage.getItem('plug-language') as Language;
    if (stored && (stored === 'en' || stored === 'he')) {
      setLanguageState(stored);
    }
  }, []);

  useEffect(() => {
    // Update document direction
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    localStorage.setItem('plug-language', language);
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
