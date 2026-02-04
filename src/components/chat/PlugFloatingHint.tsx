import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

interface PlugFloatingHintProps {
  contextPage?: 'dashboard' | 'cv-builder' | 'applications' | 'jobs' | 'default';
  onChatOpen?: () => void;
}

export const PlugFloatingHint = ({ contextPage = 'default', onChatOpen }: PlugFloatingHintProps) => {
  const { language, direction } = useLanguage();
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

  // Auto-hide after 8 seconds
  useEffect(() => {
    if (isVisible && !isDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 8000);
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

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  const handleClick = () => {
    onChatOpen?.();
    setIsVisible(false);
  };

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
          <div className="relative bg-card border border-primary/30 rounded-2xl shadow-xl p-4 plug-ai-highlight">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-2">
                  {getHintMessage()}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClick}
                  className="gap-2 text-xs"
                >
                  <MessageCircle className="w-3 h-3" />
                  {isRTL ? 'פתח צ\'אט' : 'Open Chat'}
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
