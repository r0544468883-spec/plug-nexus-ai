import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardSection } from '@/components/dashboard/DashboardLayout';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { 
  Sparkles, Search, FileText, Upload, MessageSquare, 
  Zap, Share2, Brain, Bell, Heart 
} from 'lucide-react';

interface TourStep {
  section: DashboardSection;
  targetSelector: string;
  titleHe: string;
  titleEn: string;
  descriptionHe: string;
  descriptionEn: string;
  icon: React.ElementType;
}

const TOUR_STEPS: TourStep[] = [
  // Step 1: Welcome - Plug Chat
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'היי! אני Plug 👋',
    titleEn: 'Hey! I\'m Plug 👋',
    descriptionHe: 'אני ה-AI שלך לחיפוש עבודה! שאל אותי על משרות, קבל עזרה בהכנה לראיונות, או בקש טיפים לשיפור קורות החיים שלך.',
    descriptionEn: 'I\'m your AI job search assistant! Ask me about positions, get help preparing for interviews, or request tips to improve your resume.',
    icon: Sparkles,
  },
  // Step 2: Overview - Quick Actions
  {
    section: 'overview',
    targetSelector: '[data-tour="quick-actions"]',
    titleHe: 'פעולות מהירות ⚡',
    titleEn: 'Quick Actions ⚡',
    descriptionHe: 'קיצורי דרך לפעולות נפוצות! העלה קו"ח, חפש משרות, או עבור ישר למועמדויות שלך - הכל בלחיצה אחת.',
    descriptionEn: 'Shortcuts to common actions! Upload your CV, search for jobs, or jump straight to your applications - all in one click.',
    icon: Zap,
  },
  // Step 3: Overview - Stats
  {
    section: 'overview',
    targetSelector: '[data-tour="stats-row"]',
    titleHe: 'מעקב התקדמות 📊',
    titleEn: 'Track Your Progress 📊',
    descriptionHe: 'כאן תראה סטטיסטיקות בזמן אמת: כמה מועמדויות הגשת, ראיונות שמתקרבים, ומועמדויות פעילות.',
    descriptionEn: 'See real-time stats here: how many applications you\'ve submitted, upcoming interviews, and active applications.',
    icon: FileText,
  },
  // Step 4: Job Search - Filters
  {
    section: 'job-search',
    targetSelector: '[data-tour="job-filters"]',
    titleHe: 'חיפוש משרות חכם 🔍',
    titleEn: 'Smart Job Search 🔍',
    descriptionHe: 'סנן משרות לפי מיקום, קטגוריה, סוג משרה ושכר. הפעל GPS כדי למצוא משרות קרובות אליך!',
    descriptionEn: 'Filter jobs by location, category, job type, and salary. Enable GPS to find jobs near you!',
    icon: Search,
  },
  // Step 5: Job Search - Share Job
  {
    section: 'job-search',
    targetSelector: '[data-tour="share-job"]',
    titleHe: 'שתף עם הקהילה 🤝',
    titleEn: 'Share with Community 🤝',
    descriptionHe: 'מצאת משרה מעניינת? שתף אותה עם הקהילה! עזור לאחרים למצוא עבודה ובנה רשת קשרים מקצועית.',
    descriptionEn: 'Found an interesting job? Share it with the community! Help others find work and build your professional network.',
    icon: Share2,
  },
  // Step 6: Applications - Add Application
  {
    section: 'applications',
    targetSelector: '[data-tour="add-application"]',
    titleHe: 'הוסף מועמדות בקלות 📋',
    titleEn: 'Add Applications Easily 📋',
    descriptionHe: 'הדבק לינק למשרה מכל אתר - AI ישלוף את כל הפרטים אוטומטית! אפשר גם להוסיף ידנית.',
    descriptionEn: 'Paste a job link from any site - AI will extract all details automatically! You can also add manually.',
    icon: FileText,
  },
  // Step 7: Documents - Resume Upload
  {
    section: 'documents',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'ניתוח קו"ח עם AI 🧠',
    titleEn: 'AI Resume Analysis 🧠',
    descriptionHe: 'העלה את קורות החיים שלך ו-AI ינתח אותם: יזהה מיומנויות, ידרג את הפרופיל שלך, ויציע תפקידים מתאימים!',
    descriptionEn: 'Upload your resume and AI will analyze it: identify skills, rate your profile, and suggest matching roles!',
    icon: Brain,
  },
  // Step 8: Messages - Inbox
  {
    section: 'messages',
    targetSelector: '[data-tour="message-inbox"]',
    titleHe: 'תקשורת ישירה 💬',
    titleEn: 'Direct Communication 💬',
    descriptionHe: 'קבל הודעות ממגייסים, שלח הודעות, וצרף קבצים. כל התקשורת המקצועית שלך במקום אחד!',
    descriptionEn: 'Receive messages from recruiters, send messages, and attach files. All your professional communication in one place!',
    icon: MessageSquare,
  },
  // Step 9: Vouches
  {
    section: 'overview',
    targetSelector: '[data-tour="vouch-widget"]',
    titleHe: 'המלצות וערבויות ❤️',
    titleEn: 'Vouches & Recommendations ❤️',
    descriptionHe: 'קבל המלצות מעמיתים ומנהלים! ה-Vouches מחזקים את הפרופיל שלך ומגדילים את הסיכוי להתקבל.',
    descriptionEn: 'Get recommendations from colleagues and managers! Vouches strengthen your profile and increase your chances.',
    icon: Heart,
  },
];

export const TOUR_STORAGE_KEY = 'plug_onboarding_job_seeker_completed';

interface JobSeekerTourProps {
  currentSection: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
}

export function JobSeekerTour({ currentSection, onNavigate }: JobSeekerTourProps) {
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Start tour function - can be called externally
  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  // Check if tour should be shown automatically
  useEffect(() => {
    if (!user || role !== 'job_seeker') return;

    const hasCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!hasCompleted) {
      // Delay start to let dashboard render
      const timer = setTimeout(startTour, 1200);
      return () => clearTimeout(timer);
    }
  }, [user, role, startTour]);

  // Navigate to correct section when step changes
  useEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStep];
    if (step && step.section !== currentSection) {
      onNavigate(step.section);
    }
  }, [currentStep, isActive, currentSection, onNavigate]);

  // Expose startTour function globally for settings
  useEffect(() => {
    (window as any).__startJobSeekerTour = startTour;
    return () => {
      delete (window as any).__startJobSeekerTour;
    };
  }, [startTour]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsActive(false);
    // Return to overview
    onNavigate('overview');
  };

  if (!isActive || role !== 'job_seeker') return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <>
      <TourOverlay
        targetSelector={step.targetSelector}
        isActive={isActive}
      />
      <TourTooltip
        targetSelector={step.targetSelector}
        title={isHebrew ? step.titleHe : step.titleEn}
        description={isHebrew ? step.descriptionHe : step.descriptionEn}
        currentStep={currentStep}
        totalSteps={TOUR_STEPS.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
        isFirst={currentStep === 0}
        isLast={currentStep === TOUR_STEPS.length - 1}
        icon={step.icon}
      />
    </>
  );
}
