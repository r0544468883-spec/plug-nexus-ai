import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Suggestion {
  id: string;
  message: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

interface PlugBubbleProps {
  suggestions?: Suggestion[];
  onActionClick?: (action: string) => void;
}

const BUBBLE_STORAGE_KEY = 'plug_bubble_last_shown';
const BUBBLE_DISMISSED_KEY = 'plug_bubble_dismissed_ids';
const MIN_HOURS_BETWEEN_BUBBLES = 4; // Don't show more than once every 4 hours
const SHOW_PROBABILITY = 0.3; // 30% chance to show when triggered

const PlugBubble = ({ suggestions = [], onActionClick }: PlugBubbleProps) => {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);
  const [shouldShowProactive, setShouldShowProactive] = useState(false);

  const isRTL = language === 'he';

  // Default suggestions based on context
  const defaultSuggestions: Suggestion[] = [
    {
      id: '1',
      message: isRTL 
        ? 'היי! ראיתי שיש לך מועמדויות פתוחות. רוצה שאעזור לך להתכונן לראיון?' 
        : 'Hey! I see you have open applications. Want me to help you prepare for an interview?',
      action: 'interview_prep',
      priority: 'high',
    },
    {
      id: '2',
      message: isRTL
        ? 'טיפ: עדכון קורות החיים שלך יכול להעלות את אחוז ההתאמה שלך'
        : 'Tip: Updating your resume can increase your match score',
      action: 'update_resume',
      priority: 'medium',
    },
    {
      id: '3',
      message: isRTL
        ? 'גיליתי משרות חדשות שיכולות להתאים לך! רוצה לראות?'
        : 'I found new jobs that might match you! Want to see?',
      action: 'view_jobs',
      priority: 'high',
    },
    {
      id: '4',
      message: isRTL
        ? 'השלמת הפרופיל שלך תגדיל את הסיכויים שמגייסים ימצאו אותך'
        : 'Completing your profile will increase chances of recruiters finding you',
      action: 'complete_profile',
      priority: 'medium',
    },
  ];

  const activeSuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

  // Check if we should show the proactive bubble
  const shouldShowBubble = useCallback(() => {
    if (!user) return false;
    
    // Check last shown time
    const lastShown = localStorage.getItem(BUBBLE_STORAGE_KEY);
    if (lastShown) {
      const hoursSince = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60);
      if (hoursSince < MIN_HOURS_BETWEEN_BUBBLES) return false;
    }

    // Get dismissed suggestion IDs
    const dismissed = JSON.parse(localStorage.getItem(BUBBLE_DISMISSED_KEY) || '[]');
    
    // Filter out dismissed suggestions
    const availableSuggestions = activeSuggestions.filter(s => !dismissed.includes(s.id));
    if (availableSuggestions.length === 0) return false;

    // Random chance to show (to avoid being annoying)
    return Math.random() < SHOW_PROBABILITY;
  }, [user, activeSuggestions]);

  // Proactive bubble logic - appears occasionally
  useEffect(() => {
    if (!user || currentSuggestion) return;

    // Initial delay before considering showing
    const initialDelay = setTimeout(() => {
      if (shouldShowBubble()) {
        // Get a random available suggestion
        const dismissed = JSON.parse(localStorage.getItem(BUBBLE_DISMISSED_KEY) || '[]');
        const available = activeSuggestions.filter(s => !dismissed.includes(s.id));
        
        if (available.length > 0) {
          // Prioritize high priority suggestions
          const highPriority = available.filter(s => s.priority === 'high');
          const suggestion = highPriority.length > 0 
            ? highPriority[Math.floor(Math.random() * highPriority.length)]
            : available[Math.floor(Math.random() * available.length)];
          
          setShouldShowProactive(true);
          setCurrentSuggestion(suggestion);
          localStorage.setItem(BUBBLE_STORAGE_KEY, Date.now().toString());
        }
      }
    }, 10000); // Wait 10 seconds before potentially showing

    return () => clearTimeout(initialDelay);
  }, [user, activeSuggestions, shouldShowBubble, currentSuggestion]);

  // Auto-hide after some time if not interacted with
  useEffect(() => {
    if (currentSuggestion && shouldShowProactive) {
      const autoHideTimer = setTimeout(() => {
        dismissSuggestion();
      }, 20000); // Hide after 20 seconds

      return () => clearTimeout(autoHideTimer);
    }
  }, [currentSuggestion, shouldShowProactive]);

  const handleAction = (action: string) => {
    setIsOpen(false);
    setCurrentSuggestion(null);
    setShouldShowProactive(false);
    onActionClick?.(action);
  };

  const dismissSuggestion = () => {
    if (currentSuggestion) {
      // Store dismissed suggestion
      const dismissed = JSON.parse(localStorage.getItem(BUBBLE_DISMISSED_KEY) || '[]');
      if (!dismissed.includes(currentSuggestion.id)) {
        dismissed.push(currentSuggestion.id);
        localStorage.setItem(BUBBLE_DISMISSED_KEY, JSON.stringify(dismissed));
      }
    }
    setCurrentSuggestion(null);
    setShouldShowProactive(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating suggestion bubble - appears proactively */}
      <AnimatePresence>
        {currentSuggestion && !isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`fixed bottom-24 z-50 max-w-xs ${
              isRTL ? 'left-4' : 'right-4'
            }`}
          >
            <Card className="border-accent/30 bg-card/95 backdrop-blur shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <motion.div 
                    className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="h-4 w-4 text-accent" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground" dir={isRTL ? 'rtl' : 'ltr'}>
                      {currentSuggestion.message}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={dismissSuggestion}
                      >
                        {isRTL ? 'לא עכשיו' : 'Not now'}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleAction(currentSuggestion.action)}
                      >
                        {isRTL ? 'בוא נתחיל' : "Let's go"}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={dismissSuggestion}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat bubble */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 z-50 h-14 w-14 rounded-full bg-accent shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          isRTL ? 'left-6' : 'right-6'
        }`}
        style={{
          boxShadow: '0 0 20px hsl(270 91% 65% / 0.4), 0 4px 12px rgba(0,0,0,0.3)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6 text-accent-foreground" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="h-6 w-6 text-accent-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Breathing animation - only when not open and no suggestion showing */}
        {!isOpen && !currentSuggestion && (
          <motion.span 
            className="absolute inset-0 rounded-full bg-accent"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Notification dot when suggestion is available */}
        {currentSuggestion && !isOpen && (
          <motion.span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 z-50 w-80 max-h-96 ${
              isRTL ? 'left-4' : 'right-4'
            }`}
          >
            <Card className="border-border bg-card/95 backdrop-blur shadow-xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Plug</p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'העוזר החכם שלך' : 'Your smart assistant'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground" dir={isRTL ? 'rtl' : 'ltr'}>
                    {isRTL ? 'מה אתה רוצה לעשות?' : 'What would you like to do?'}
                  </p>
                  
                  {activeSuggestions.slice(0, 4).map((suggestion) => (
                    <motion.button
                      key={suggestion.id}
                      onClick={() => handleAction(suggestion.action)}
                      className="w-full text-start p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground"
                      dir={isRTL ? 'rtl' : 'ltr'}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {suggestion.message}
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PlugBubble;
