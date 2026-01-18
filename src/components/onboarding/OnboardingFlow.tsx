import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, 
  Users, 
  Briefcase, 
  Search, 
  Heart, 
  Bell,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  icon: React.ReactNode;
  titleHe: string;
  titleEn: string;
  descriptionHe: string;
  descriptionEn: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    icon: <Sparkles className="w-12 h-12 text-primary" />,
    titleHe: 'ברוכים הבאים ל-Plug!',
    titleEn: 'Welcome to Plug!',
    descriptionHe: 'הפלטפורמה שמחברת בין מחפשי עבודה, מגייסים וחברות. בואו נכיר את הפיצ\'רים העיקריים.',
    descriptionEn: 'The platform that connects job seekers, recruiters, and companies. Let\'s explore the main features.',
  },
  {
    icon: <Search className="w-12 h-12 text-primary" />,
    titleHe: 'חיפוש משרות',
    titleEn: 'Job Search',
    descriptionHe: 'מצאו משרות חדשות, סננו לפי מיקום, קטגוריה וסוג משרה. הגישו מועמדות בקליק אחד!',
    descriptionEn: 'Find new jobs, filter by location, category, and job type. Apply with one click!',
  },
  {
    icon: <MessageSquare className="w-12 h-12 text-primary" />,
    titleHe: 'הודעות פנימיות',
    titleEn: 'Internal Messaging',
    descriptionHe: 'תקשרו ישירות עם מגייסים או מועמדים דרך מערכת ההודעות המובנית. כל השיחות במקום אחד!',
    descriptionEn: 'Communicate directly with recruiters or candidates through the built-in messaging system. All conversations in one place!',
  },
  {
    icon: <Heart className="w-12 h-12 text-primary" />,
    titleHe: 'המלצות (Vouches)',
    titleEn: 'Vouches',
    descriptionHe: 'קבלו ותנו המלצות מקולגות, מנהלים ואנשי קשר מקצועיים. בנו את הרפוטציה שלכם!',
    descriptionEn: 'Give and receive recommendations from colleagues, managers, and professional contacts. Build your reputation!',
  },
  {
    icon: <Users className="w-12 h-12 text-primary" />,
    titleHe: 'ניהול מועמדים',
    titleEn: 'Candidate Management',
    descriptionHe: 'למגייסים: צפו במועמדים, גשו לפרופילים המלאים, קורות חיים וקישורים מקצועיים.',
    descriptionEn: 'For recruiters: View candidates, access full profiles, resumes, and professional links.',
  },
  {
    icon: <Briefcase className="w-12 h-12 text-primary" />,
    titleHe: 'פרסום משרות',
    titleEn: 'Post Jobs',
    descriptionHe: 'פרסמו משרות חדשות וקבלו מועמדויות ממחפשי עבודה איכותיים.',
    descriptionEn: 'Post new jobs and receive applications from quality job seekers.',
  },
  {
    icon: <Bell className="w-12 h-12 text-primary" />,
    titleHe: 'התראות בזמן אמת',
    titleEn: 'Real-time Notifications',
    descriptionHe: 'קבלו התראות על הודעות חדשות, סטטוס מועמדויות ועדכונים חשובים.',
    descriptionEn: 'Get notifications about new messages, application status, and important updates.',
  },
  {
    icon: <FileText className="w-12 h-12 text-primary" />,
    titleHe: 'מסמכים',
    titleEn: 'Documents',
    descriptionHe: 'העלו קורות חיים ומסמכים נוספים. המסמכים יהיו זמינים למגייסים כשתגישו מועמדות.',
    descriptionEn: 'Upload resumes and additional documents. Documents will be available to recruiters when you apply.',
  },
];

const ONBOARDING_KEY = 'plug_onboarding_completed';

export function OnboardingFlow() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (user && profile) {
      const completed = localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`);
      if (!completed) {
        // Small delay to let the dashboard render first
        setTimeout(() => setOpen(true), 500);
      }
    }
  }, [user, profile]);

  const handleComplete = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, 'true');
    }
    setOpen(false);
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const PrevIcon = isHebrew ? ChevronRight : ChevronLeft;
  const NextIcon = isHebrew ? ChevronLeft : ChevronRight;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className="sm:max-w-lg" 
        dir={isHebrew ? 'rtl' : 'ltr'}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            {step.icon}
          </div>
          <DialogTitle className="text-xl">
            {isHebrew ? step.titleHe : step.titleEn}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isHebrew ? step.descriptionHe : step.descriptionEn}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Progress value={progress} className="h-2" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            {currentStep + 1} / {onboardingSteps.length}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 mb-4">
          {onboardingSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <PrevIcon className="w-4 h-4" />
            {isHebrew ? 'הקודם' : 'Previous'}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleComplete}
              className="text-muted-foreground"
            >
              {isHebrew ? 'דלג' : 'Skip'}
            </Button>
            <Button onClick={handleNext} className="gap-1">
              {currentStep === onboardingSteps.length - 1 
                ? (isHebrew ? 'בואו נתחיל!' : 'Let\'s Start!')
                : (isHebrew ? 'הבא' : 'Next')}
              {currentStep < onboardingSteps.length - 1 && <NextIcon className="w-4 h-4" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}