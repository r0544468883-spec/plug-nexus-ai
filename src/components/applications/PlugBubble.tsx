import { useState, useEffect } from 'react';
import { MessageCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

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

const PlugBubble = ({ suggestions = [], onActionClick }: PlugBubbleProps) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);

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
  ];

  const activeSuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

  useEffect(() => {
    // Show a suggestion after a delay
    const timer = setTimeout(() => {
      if (activeSuggestions.length > 0 && !currentSuggestion) {
        setCurrentSuggestion(activeSuggestions[0]);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeSuggestions, currentSuggestion]);

  const handleAction = (action: string) => {
    setIsOpen(false);
    setCurrentSuggestion(null);
    onActionClick?.(action);
  };

  const dismissSuggestion = () => {
    setCurrentSuggestion(null);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating suggestion bubble */}
      {currentSuggestion && !isOpen && (
        <div 
          className={`fixed bottom-24 z-50 max-w-xs animate-in slide-in-from-bottom-4 ${
            isRTL ? 'left-4' : 'right-4'
          }`}
        >
          <Card className="border-accent/30 bg-card/95 backdrop-blur shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
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
        </div>
      )}

      {/* Main chat bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 z-50 h-14 w-14 rounded-full bg-accent shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          isRTL ? 'left-6' : 'right-6'
        }`}
        style={{
          boxShadow: '0 0 20px hsl(270 91% 65% / 0.4), 0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-accent-foreground" />
        ) : (
          <MessageCircle className="h-6 w-6 text-accent-foreground" />
        )}
        
        {/* Breathing animation */}
        {!isOpen && (
          <span 
            className="absolute inset-0 rounded-full bg-accent animate-ping opacity-20"
            style={{ animationDuration: '3s' }}
          />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div 
          className={`fixed bottom-24 z-50 w-80 max-h-96 animate-in slide-in-from-bottom-4 ${
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
                
                {activeSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleAction(suggestion.action)}
                    className="w-full text-right p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    {suggestion.message}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default PlugBubble;
