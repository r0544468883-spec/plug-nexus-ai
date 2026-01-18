import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardSection } from '@/components/dashboard/DashboardLayout';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { Sparkles, Search, FileText, Upload, MessageSquare } from 'lucide-react';

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
  {
    section: 'overview',
    targetSelector: '[data-tour="plug-chat"]',
    titleHe: 'היי! אני Plug 👋',
    titleEn: 'Hey! I\'m Plug 👋',
    descriptionHe: 'אני העוזר האישי שלך! אשמח לעזור לך למצוא עבודה, להתכונן לראיונות, ולשפר את קורות החיים שלך. פשוט שאל אותי כל שאלה!',
    descriptionEn: 'I\'m your personal assistant! I\'ll help you find jobs, prepare for interviews, and improve your resume. Just ask me anything!',
    icon: Sparkles,
  },
  {
    section: 'job-search',
    targetSelector: '[data-tour="job-filters"]',
    titleHe: 'חיפוש משרות 🔍',
    titleEn: 'Job Search 🔍',
    descriptionHe: 'כאן תוכל לחפש משרות חדשות! סנן לפי מיקום, קטגוריה וסוג משרה. אפשר גם להפעיל GPS למציאת משרות קרובות אליך.',
    descriptionEn: 'Search for new jobs here! Filter by location, category, and job type. You can also enable GPS to find jobs near you.',
    icon: Search,
  },
  {
    section: 'applications',
    targetSelector: '[data-tour="add-application"]',
    titleHe: 'ניהול מועמדויות 📋',
    titleEn: 'Manage Applications 📋',
    descriptionHe: 'הדבק לינק למשרה שמצאת ו-AI ישלוף את כל הפרטים אוטומטית! עקוב אחר כל המועמדויות שלך במקום אחד.',
    descriptionEn: 'Paste a job link and AI will extract all details automatically! Track all your applications in one place.',
    icon: FileText,
  },
  {
    section: 'documents',
    targetSelector: '[data-tour="resume-upload"]',
    titleHe: 'העלאת קורות חיים 📄',
    titleEn: 'Resume Upload 📄',
    descriptionHe: 'העלה את קורות החיים שלך ו-AI ינתח אותם, יזהה מיומנויות, ויציע משרות מתאימות לפרופיל שלך!',
    descriptionEn: 'Upload your resume and AI will analyze it, identify skills, and suggest jobs that match your profile!',
    icon: Upload,
  },
  {
    section: 'messages',
    targetSelector: '[data-tour="message-inbox"]',
    titleHe: 'הודעות 💬',
    titleEn: 'Messages 💬',
    descriptionHe: 'כאן תקבל הודעות ממגייסים ותוכל לשלוח הודעות ישירות. כל התקשורת המקצועית שלך במקום אחד!',
    descriptionEn: 'Receive messages from recruiters and send direct messages. All your professional communication in one place!',
    icon: MessageSquare,
  },
];

const STORAGE_KEY = 'plug_onboarding_completed';

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

  // Check if tour should be shown
  useEffect(() => {
    if (!user || role !== 'job_seeker') return;

    const hasCompleted = localStorage.getItem(STORAGE_KEY);
    if (!hasCompleted) {
      // Delay start to let dashboard render
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, role]);

  // Navigate to correct section when step changes
  useEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStep];
    if (step && step.section !== currentSection) {
      onNavigate(step.section);
    }
  }, [currentStep, isActive, currentSection, onNavigate]);

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
    localStorage.setItem(STORAGE_KEY, 'true');
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
      />
    </>
  );
}
