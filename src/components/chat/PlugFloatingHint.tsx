import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, FileText, Search, BarChart3, Upload, Briefcase, PenLine } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  labelHe: string;
  action: string;
}

interface PlugFloatingHintProps {
  contextPage?: 'dashboard' | 'cv-builder' | 'applications' | 'jobs' | 'default';
  onChatOpen?: () => void;
  onQuickAction?: (action: string) => void;
}

export const PlugFloatingHint = ({ contextPage = 'default', onChatOpen, onQuickAction }: PlugFloatingHintProps) => {
  const { direction } = useLanguage();
  const isRTL = direction === 'rtl';
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Show hint after a short delay on page load
  useEffect(() => {
    const sessionKey = `plug-hint-shown-${contextPage}`;
    const alreadyShown = sessionStorage.getItem(sessionKey);
    
    if (!alreadyShown) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        sessionStorage.setItem(sessionKey, 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [contextPage]);

  // Auto-hide after 10 seconds (extended for quick actions)
  useEffect(() => {
    if (isVisible && !isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isDismissed]);

  const getHintMessage = () => {
    switch (contextPage) {
      case 'cv-builder':
        return isRTL 
          ? '💡 צריך עזרה עם קורות החיים? אני כאן!'
          : '💡 Need help with your CV? I\'m here!';
      case 'applications':
        return isRTL 
          ? '📊 רוצה שאסכם את ההתקדמות שלך?'
          : '📊 Want me to summarize your progress?';
      case 'jobs':
        return isRTL 
          ? '🎯 אני יכול לעזור למצוא משרות מתאימות!'
          : '🎯 I can help find matching jobs!';
      case 'dashboard':
      default:
        return isRTL 
          ? '👋 היי! אני Plug, ואני כאן לעזור לך'
          : '👋 Hey! I\'m Plug, here to help you';
    }
  };

  const getQuickActions = (): QuickAction[] => {
    switch (contextPage) {
      case 'cv-builder':
        return [
          { icon: <PenLine className="w-3 h-3" />, label: 'Improve CV', labelHe: 'שפר קו״ח', action: 'improve-cv' },
          { icon: <Upload className="w-3 h-3" />, label: 'Import', labelHe: 'ייבוא', action: 'import-cv' },
        ];
      case 'applications':
        return [
          { icon: <BarChart3 className="w-3 h-3" />, label: 'Summary', labelHe: 'סיכום', action: 'summarize-applications' },
          { icon: <FileText className="w-3 h-3" />, label: 'Follow-ups', labelHe: 'מעקב', action: 'follow-ups' },
        ];
      case 'jobs':
        return [
          { icon: <Search className="w-3 h-3" />, label: 'Match me', labelHe: 'התאם לי', action: 'match-jobs' },
          { icon: <Briefcase className="w-3 h-3" />, label: 'Trending', labelHe: 'טרנדים', action: 'trending-jobs' },
        ];
      case 'dashboard':
      default:
        return [
          { icon: <FileText className="w-3 h-3" />, label: 'My status', labelHe: 'הסטטוס שלי', action: 'my-status' },
          { icon: <Search className="w-3 h-3" />, label: 'Find jobs', labelHe: 'חפש משרות', action: 'find-jobs' },
        ];
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  const handleClick = () => {
    onChatOpen?.();
    setIsVisible(false);
  };

  const handleQuickAction = (action: string) => {
    onQuickAction?.(action);
    onChatOpen?.();
    setIsVisible(false);
  };

  const quickActions = getQuickActions();

  return (
    <AnimatePresence>
      {isVisible && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, x: isRTL ? -100 : 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: isRTL ? -50 : 50, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`fixed bottom-24 ${isRTL ? 'left-4' : 'right-4'} z-50 max-w-xs`}
        >
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40 blur-xl"
            animate={{
              opacity: [0.4, 0.8, 0.4],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          <div className="relative bg-card border border-primary/30 rounded-2xl shadow-xl p-4">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors z-10"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0"
                animate={{
                  boxShadow: [
                    '0 0 10px hsl(var(--primary) / 0.3)',
                    '0 0 20px hsl(var(--primary) / 0.5)',
                    '0 0 10px hsl(var(--primary) / 0.3)',
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </motion.div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-3">
                  {getHintMessage()}
                </p>
                
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {quickActions.map((qa, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant="secondary"
                      onClick={() => handleQuickAction(qa.action)}
                      className="gap-1.5 text-xs h-7 px-2"
                    >
                      {qa.icon}
                      {isRTL ? qa.labelHe : qa.label}
                    </Button>
                  ))}
                </div>
                
                {/* Open Chat button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClick}
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="w-3 h-3" />
                  {isRTL ? 'או שאל אותי כל דבר...' : 'Or ask me anything...'}
                </Button>
              </div>
            </div>

            {/* Decorative tail */}
            <div className={`absolute bottom-4 ${isRTL ? '-left-2' : '-right-2'} w-4 h-4 bg-card border-r border-b border-primary/30 transform rotate-45`} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
