import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Route, X, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import type { DashboardSection } from '@/components/dashboard/DashboardLayout';

interface TourGuideFABProps {
  onNavigate?: (section: DashboardSection) => void;
  onStartTour?: () => void;
}

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  section?: DashboardSection;
}

interface ToolItem {
  icon: string;
  label: string;
  desc: string;
}

export function TourGuideFAB({ onNavigate, onStartTour }: TourGuideFABProps) {
  const { role, profile, user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  // Determine checklist completion based on profile data
  const hasCV = !!(profile as any)?.cv_data && Object.keys((profile as any)?.cv_data || {}).length > 0;
  const hasAvatar = !!profile?.avatar_url;
  const hasFullProfile = !!(profile?.full_name && profile?.phone);

  const getChecklist = (): ChecklistItem[] => {
    if (role === 'job_seeker') {
      return [
        { key: 'account', label: isRTL ? 'יצירת חשבון' : 'Create account', done: true },
        { key: 'profile', label: isRTL ? 'מילוי פרופיל' : 'Complete profile', done: hasFullProfile, section: 'profile-docs' },
        { key: 'cv', label: isRTL ? 'העלאת קורות חיים' : 'Upload CV', done: hasCV, section: 'cv-builder' },
        { key: 'apply', label: isRTL ? 'הגשת מועמדות ראשונה' : 'Submit first application', done: false, section: 'job-search' },
      ];
    }
    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return [
        { key: 'account', label: isRTL ? 'יצירת חשבון' : 'Create account', done: true },
        { key: 'profile', label: isRTL ? 'הגדרת פרופיל מגייס' : 'Setup recruiter profile', done: hasFullProfile, section: 'recruiter-profile' as DashboardSection },
        { key: 'client', label: isRTL ? 'הוספת לקוח ראשון' : 'Add first client', done: false, section: 'clients' },
        { key: 'search', label: isRTL ? 'חיפוש מועמדים ראשון' : 'First candidate search', done: false, section: 'candidates' },
      ];
    }
    return [
      { key: 'account', label: isRTL ? 'יצירת חשבון חברה' : 'Create company account', done: true },
      { key: 'profile', label: isRTL ? 'הגדרת פרופיל' : 'Setup profile', done: hasFullProfile, section: 'profile-docs' },
      { key: 'job', label: isRTL ? 'פרסום משרה ראשונה' : 'Post first job', done: false, section: 'post-job' as DashboardSection },
      { key: 'view', label: isRTL ? 'צפייה במועמדים' : 'View candidates', done: false, section: 'candidates' },
    ];
  };

  const getTools = (): ToolItem[] => {
    if (role === 'job_seeker') {
      return [
        { icon: '🔍', label: isRTL ? 'חיפוש משרות' : 'Job Search', desc: isRTL ? 'מצא משרות עם AI Match' : 'Find jobs with AI Match' },
        { icon: '📄', label: isRTL ? 'בונה קורות חיים' : 'CV Builder', desc: isRTL ? '10 תבניות מקצועיות' : '10 professional templates' },
        { icon: '🎤', label: isRTL ? 'סימולציית ראיונות' : 'Interview Prep', desc: isRTL ? 'תרגול לפי חברה ותפקיד' : 'Practice by company & role' },
        { icon: '💬', label: 'Plug Chat', desc: isRTL ? 'קואצ\'ר קריירה AI' : 'AI career coach' },
        { icon: '⭐', label: 'Vouches', desc: isRTL ? 'המלצות ממנהלים' : 'Manager recommendations' },
        { icon: '👥', label: isRTL ? 'קהילות' : 'Communities', desc: isRTL ? 'נטוורקינג מקצועי' : 'Professional networking' },
        { icon: '🎯', label: 'Missions', desc: isRTL ? 'פרויקטים קצרים' : 'Short projects' },
        { icon: '🔥', label: isRTL ? 'קרדיטים' : 'Credits', desc: isRTL ? '20 יומיים חינם' : '20 free daily' },
      ];
    }
    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return [
        { icon: '🔍', label: isRTL ? 'חיפוש מועמדים' : 'Candidate Search', desc: isRTL ? 'AI Match חכם' : 'Smart AI Match' },
        { icon: '💼', label: 'CRM', desc: isRTL ? 'ניהול לקוחות ותהליכים' : 'Client & process management' },
        { icon: '🎯', label: 'Missions', desc: isRTL ? 'פרסום משימות גיוס' : 'Post recruitment missions' },
        { icon: '📊', label: isRTL ? 'אנליטיקס' : 'Analytics', desc: isRTL ? 'סטטיסטיקות ביצועים' : 'Performance stats' },
        { icon: '👥', label: isRTL ? 'קהילות' : 'Communities', desc: isRTL ? 'בניית רשת מועמדים' : 'Build candidate network' },
        { icon: '⭐', label: 'Vouches', desc: isRTL ? 'המלצות על מועמדים' : 'Candidate recommendations' },
        { icon: '💬', label: isRTL ? 'הודעות' : 'Messages', desc: isRTL ? 'תקשורת ישירה' : 'Direct communication' },
      ];
    }
    return [
      { icon: '📝', label: isRTL ? 'פרסום משרות' : 'Post Jobs', desc: isRTL ? 'הגדרה מפורטת עם AI' : 'Detailed setup with AI' },
      { icon: '👤', label: isRTL ? 'צפייה במועמדים' : 'View Candidates', desc: isRTL ? 'ציוני התאמה חכמים' : 'Smart match scores' },
      { icon: '⭐', label: 'Vouches', desc: isRTL ? 'בנו מותג מעסיק' : 'Build employer brand' },
      { icon: '📊', label: isRTL ? 'סטטיסטיקות' : 'Statistics', desc: isRTL ? 'מעקב אחר תהליכי גיוס' : 'Track hiring processes' },
    ];
  };

  const getTips = (): string[] => {
    if (role === 'job_seeker') {
      return isRTL
        ? ['ככל שתשתמש יותר, ה-AI מדייק יותר', 'קו"ח מעודכן = יותר חשיפה למגייסים', 'Vouches מעלים את הדירוג שלך']
        : ['The more you use, the more accurate AI gets', 'Updated CV = more visibility to recruiters', 'Vouches boost your ranking'];
    }
    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return isRTL
        ? ['סקירת מועמדים יומית משפרת תוצאות', 'עדכון CRM שוטף חוסך זמן', 'Missions מביאים מועמדים אליך']
        : ['Daily candidate review improves results', 'Regular CRM updates save time', 'Missions bring candidates to you'];
    }
    return isRTL
      ? ['תיאור משרה מפורט = מועמדים טובים יותר', 'תגובה מהירה משפרת מותג מעסיק', 'Vouches בונים אמון']
      : ['Detailed job description = better candidates', 'Fast response improves employer brand', 'Vouches build trust'];
  };

  const checklist = getChecklist();
  const tools = getTools();
  const tips = getTips();
  const completedCount = checklist.filter(c => c.done).length;

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed z-40 w-12 h-12 rounded-full bg-secondary border border-accent/30 shadow-lg flex items-center justify-center transition-all hover:scale-105 hover:border-accent',
          'bottom-6 lg:bottom-6',
          isRTL ? 'right-6 lg:right-[calc(256px+1.5rem)]' : 'left-6 lg:left-[calc(256px+1.5rem)]',
          isMobile && 'bottom-[88px]'
        )}
        aria-label={isRTL ? 'מדריך המערכת' : 'System Guide'}
      >
        <Route className="w-[22px] h-[22px] text-accent" />
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[55]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                'fixed top-0 z-[56] h-full bg-background border-e border-border/50',
                isRTL ? 'right-0' : 'left-0',
                isMobile ? 'w-full' : 'w-[360px]'
              )}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  📋 {isRTL ? 'מדריך המערכת' : 'System Guide'}
                </h2>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ScrollArea className="h-[calc(100%-60px)]">
                <div className="p-4 space-y-6">
                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        {isRTL ? `השלמת ${completedCount} מתוך ${checklist.length} שלבים` : `Completed ${completedCount} of ${checklist.length} steps`}
                      </span>
                      <span className="font-bold text-primary">{Math.round((completedCount / checklist.length) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${(completedCount / checklist.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Checklist */}
                  <div>
                    <h3 className="font-semibold mb-3">{isRTL ? 'שלבים ראשונים:' : 'First steps:'}</h3>
                    <div className="space-y-2">
                      {checklist.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => {
                            if (!item.done && item.section && onNavigate) {
                              onNavigate(item.section);
                              setOpen(false);
                            }
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-start',
                            item.done ? 'text-muted-foreground' : 'hover:bg-secondary/50 text-foreground cursor-pointer'
                          )}
                          disabled={item.done}
                        >
                          {item.done ? (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded border border-border flex-shrink-0" />
                          )}
                          <span className={item.done ? 'line-through' : ''}>{item.label}</span>
                          {!item.done && <ChevronRight className="w-4 h-4 ms-auto text-muted-foreground" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tools */}
                  <div>
                    <h3 className="font-semibold mb-3">{isRTL ? 'כלים שלך:' : 'Your tools:'}</h3>
                    <div className="space-y-2">
                      {tools.map((tool, i) => (
                        <div key={i} className="flex items-start gap-3 p-2">
                          <span className="text-lg">{tool.icon}</span>
                          <div>
                            <p className="font-medium text-sm">{tool.label}</p>
                            <p className="text-xs text-muted-foreground">{tool.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tips */}
                  <div>
                    <h3 className="font-semibold mb-3">{isRTL ? 'טיפים:' : 'Tips:'}</h3>
                    <div className="space-y-2">
                      {tips.map((tip, i) => (
                        <p key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span>💡</span>
                          {tip}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Start Tour Button */}
                  {onStartTour && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        setOpen(false);
                        onStartTour();
                      }}
                    >
                      🗺️ {isRTL ? 'התחל סיור מודרך' : 'Start Guided Tour'}
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
