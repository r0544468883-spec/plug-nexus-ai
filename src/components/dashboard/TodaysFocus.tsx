import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ChevronRight, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { DashboardSection } from '@/components/dashboard/DashboardLayout';

interface TodaysFocusProps {
  onNavigate: (section: DashboardSection) => void;
}

interface FocusItem {
  id: string;
  label: string;
  section: DashboardSection;
}

export function TodaysFocus({ onNavigate }: TodaysFocusProps) {
  const { role } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const getFocusItems = (): FocusItem[] => {
    if (role === 'job_seeker') {
      return [
        { id: 'apply', label: isRTL ? 'הגש ל-3 משרות היום' : 'Apply to 3 jobs today', section: 'job-search' },
        { id: 'cv', label: isRTL ? 'עדכן את קורות החיים' : 'Update your CV', section: 'cv-builder' },
        { id: 'interview', label: isRTL ? 'תרגל ראיון' : 'Practice an interview', section: 'interview-prep' },
      ];
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
  const allDone = completed.size === items.length;

  const toggleComplete = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card className="bg-gradient-to-r from-background to-secondary/30 border-border overflow-hidden">
      <CardContent className="p-5" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">
            🎯 {isRTL ? 'הפוקוס של היום' : "Today's Focus"}
          </h3>
          <span className="text-sm text-muted-foreground">
            {completed.size}/{items.length}
          </span>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const isDone = completed.has(item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer',
                  isDone ? 'bg-primary/5' : 'hover:bg-secondary/50'
                )}
              >
                <button
                  onClick={() => toggleComplete(item.id)}
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
                <span
                  className={cn(
                    'flex-1 text-sm transition-all',
                    isDone && 'line-through text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
                {!isDone && (
                  <button onClick={() => onNavigate(item.section)}>
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
      </CardContent>
    </Card>
  );
}
