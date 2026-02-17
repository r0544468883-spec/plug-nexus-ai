import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronRight, ChevronUp, ChevronDown, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { DashboardSection } from '@/components/dashboard/DashboardLayout';

interface TodaysFocusProps {
  onNavigate: (section: DashboardSection) => void;
  onShowResumeDialog?: () => void;
}

interface FocusItem {
  id: string;
  label: string;
  section: DashboardSection;
  isOnboarding?: boolean;
  completed?: boolean;
  action?: () => void;
}

export function TodaysFocus({ onNavigate, onShowResumeDialog }: TodaysFocusProps) {
  const { role, user, profile } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'he';
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(true);

  // Onboarding checks for job seekers
  const { data: hasCV } = useQuery({
    queryKey: ['has-cv', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('documents')
        .select('id')
        .eq('owner_id', user.id)
        .eq('doc_type', 'cv')
        .limit(1);
      return (data && data.length > 0) || false;
    },
    enabled: !!user?.id && role === 'job_seeker',
  });

  const { data: profileData } = useQuery({
    queryKey: ['profile-completion', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles_secure')
        .select('bio, linkedin_url, github_url, portfolio_url')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id && role === 'job_seeker',
  });

  const { data: hasApplication } = useQuery({
    queryKey: ['has-application', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', user.id)
        .limit(1);
      return (data && data.length > 0) || false;
    },
    enabled: !!user?.id && role === 'job_seeker',
  });

  const isProfileComplete = !!(
    profile?.full_name &&
    profileData?.bio &&
    (profileData?.linkedin_url || profileData?.github_url || profileData?.portfolio_url)
  );

  const getFocusItems = (): FocusItem[] => {
    if (role === 'job_seeker') {
      const onboardingItems: FocusItem[] = [];

      if (!hasCV) {
        onboardingItems.push({
          id: 'onboard-cv',
          label: isRTL ? 'העלה קורות חיים' : 'Upload your CV',
          section: 'overview',
          isOnboarding: true,
          completed: false,
          action: onShowResumeDialog,
        });
      }
      if (!isProfileComplete) {
        onboardingItems.push({
          id: 'onboard-profile',
          label: isRTL ? 'השלם את הפרופיל' : 'Complete your profile',
          section: 'overview',
          isOnboarding: true,
          completed: false,
          action: () => navigate('/profile'),
        });
      }
      if (!hasApplication) {
        onboardingItems.push({
          id: 'onboard-apply',
          label: isRTL ? 'הגש מועמדות ראשונה' : 'Submit your first application',
          section: 'job-search',
          isOnboarding: true,
          completed: false,
        });
      }

      const dailyItems: FocusItem[] = [
        { id: 'apply', label: isRTL ? 'הגש ל-3 משרות היום' : 'Apply to 3 jobs today', section: 'job-search' },
        { id: 'cv', label: isRTL ? 'עדכן את קורות החיים' : 'Update your CV', section: 'cv-builder' },
        { id: 'interview', label: isRTL ? 'תרגל ראיון' : 'Practice an interview', section: 'interview-prep' },
      ];

      return [...onboardingItems, ...dailyItems].slice(0, 4);
    }
    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return [
        { id: 'candidates', label: isRTL ? 'סקור 5 מועמדים חדשים' : 'Review 5 new candidates', section: 'candidates' },
        { id: 'crm', label: isRTL ? 'עדכן סטטוס לקוח' : 'Update client status', section: 'clients' },
        { id: 'mission', label: isRTL ? 'צור Mission חדש' : 'Create a new Mission', section: 'missions' },
      ];
    }
    return [
      { id: 'view', label: isRTL ? 'צפה במועמדים חדשים' : 'View new candidates', section: 'candidates' },
      { id: 'job', label: isRTL ? 'עדכן תיאור משרה' : 'Update job description', section: 'post-job' as DashboardSection },
      { id: 'vouch', label: isRTL ? 'בדוק Vouches שהתקבלו' : 'Check received Vouches', section: 'overview' },
    ];
  };

  const items = getFocusItems();
  const completedCount = items.filter(item => item.completed || completed.has(item.id)).length;
  const allDone = completedCount === items.length;
  const progressPercent = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const toggleComplete = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleItemClick = (item: FocusItem) => {
    if (item.action) {
      item.action();
    } else {
      onNavigate(item.section);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-background to-secondary/30 border-border overflow-hidden">
      <CardContent className="p-5" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">
            🎯 {isRTL ? 'הפוקוס של היום' : "Today's Focus"}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {completedCount}/{items.length}
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md hover:bg-secondary/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progressPercent} className="h-2 mb-4" />

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-2">
                {items.map((item) => {
                  const isDone = item.completed || completed.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg transition-all',
                        isDone ? 'bg-primary/5' : 'hover:bg-secondary/50',
                        item.isOnboarding && !isDone && 'border border-primary/20 bg-primary/5'
                      )}
                    >
                      <button
                        onClick={() => !item.isOnboarding && toggleComplete(item.id)}
                        className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                          isDone ? 'bg-primary border-primary' : 'border-muted-foreground/30 hover:border-primary/50'
                        )}
                      >
                        <AnimatePresence>
                          {isDone && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Check className="w-3.5 h-3.5 text-primary-foreground" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                      <button
                        onClick={() => !isDone && handleItemClick(item)}
                        disabled={isDone}
                        className={cn(
                          'flex-1 text-sm transition-all text-start',
                          isDone ? 'line-through text-muted-foreground' : 'hover:text-primary cursor-pointer'
                        )}
                      >
                        {item.label}
                      </button>
                      {!isDone && (
                        <button onClick={() => handleItemClick(item)}>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <AnimatePresence>
                {allDone && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-3 rounded-lg bg-primary/10 text-center"
                  >
                    <PartyPopper className="w-6 h-6 text-primary mx-auto mb-1" />
                    <p className="text-sm font-medium text-primary">
                      {isRTL ? 'כל הכבוד! סיימת את הפוקוס של היום 🎉' : 'Great job! You finished today\'s focus 🎉'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
