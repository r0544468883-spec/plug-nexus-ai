import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, X, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TourTooltipProps {
  targetSelector: string;
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
  icon?: React.ElementType;
}

export function TourTooltip({
  targetSelector,
  title,
  description,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  icon: Icon,
}: TourTooltipProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    
    const updatePosition = () => {
      const element = document.querySelector(targetSelector);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const tooltipHeight = 240;
      const tooltipWidth = 360;
      const padding = 20;

      // Determine placement
      const spaceBelow = window.innerHeight - rect.bottom;

      if (spaceBelow > tooltipHeight + padding) {
        setPlacement('bottom');
        setPosition({
          top: rect.bottom + padding,
          left: Math.max(padding, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        });
      } else {
        setPlacement('top');
        setPosition({
          top: rect.top - tooltipHeight - padding,
          left: Math.max(padding, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        });
      }
      
      setIsVisible(true);
    };

    const timer = setTimeout(updatePosition, 400);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
    };
  }, [targetSelector]);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={currentStep}
          className="fixed z-[9999] w-[360px]"
          style={{ top: position.top, left: position.left }}
          dir={isHebrew ? 'rtl' : 'ltr'}
          initial={{ opacity: 0, y: placement === 'bottom' ? -20 : 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: placement === 'bottom' ? -10 : 10, scale: 0.95 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 25,
            duration: 0.4,
          }}
        >
          <Card className="bg-card/95 backdrop-blur-md border-primary/40 shadow-2xl overflow-hidden">
            {/* Gradient header */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
            
            <CardContent className="p-5">
              {/* Skip button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="absolute top-3 end-3 h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mb-4">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i === currentStep
                        ? 'bg-primary'
                        : i < currentStep
                        ? 'bg-primary/50'
                        : 'bg-muted-foreground/20'
                    }`}
                    initial={false}
                    animate={{ 
                      width: i === currentStep ? 20 : 8,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>

              {/* Icon and Content */}
              <div className="space-y-3 mb-5">
                {Icon && (
                  <motion.div 
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <Icon className="w-6 h-6 text-primary" />
                  </motion.div>
                )}
                
                <motion.h3 
                  className="font-bold text-xl text-foreground text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {title}
                </motion.h3>
                
                <motion.p 
                  className="text-sm text-muted-foreground leading-relaxed text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {description}
                </motion.p>
              </div>

              {/* Navigation */}
              <motion.div 
                className="flex items-center justify-between gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrev}
                  disabled={isFirst}
                  className="gap-1.5"
                >
                  {isHebrew ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  {isHebrew ? 'הקודם' : 'Back'}
                </Button>

                <span className="text-xs text-muted-foreground font-medium">
                  {currentStep + 1} / {totalSteps}
                </span>

                <Button
                  size="sm"
                  onClick={onNext}
                  className="gap-1.5 min-w-[100px]"
                >
                  {isLast ? (
                    <>
                      <Check className="w-4 h-4" />
                      {isHebrew ? 'סיום' : 'Finish'}
                    </>
                  ) : (
                    <>
                      {isHebrew ? 'הבא' : 'Next'}
                      {isHebrew ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </>
                  )}
                </Button>
              </motion.div>
            </CardContent>
          </Card>

          {/* Arrow pointing to element */}
          <motion.div
            className={`absolute w-4 h-4 bg-card/95 border-primary/40 transform rotate-45 ${
              placement === 'bottom'
                ? '-top-2 border-t border-s'
                : '-bottom-2 border-b border-e'
            }`}
            style={{ left: '50%', marginLeft: '-8px' }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
