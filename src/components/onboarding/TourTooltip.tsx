import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, X, Check } from 'lucide-react';
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
}: TourTooltipProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(targetSelector);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const tooltipHeight = 200;
      const tooltipWidth = 320;
      const padding = 16;

      // Determine placement
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

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
    };

    const timer = setTimeout(updatePosition, 350);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
    };
  }, [targetSelector]);

  return (
    <div
      className="fixed z-[9999] w-80"
      style={{ top: position.top, left: position.left }}
      dir={isHebrew ? 'rtl' : 'ltr'}
    >
      <Card className="bg-card border-primary/30 shadow-2xl">
        <CardContent className="p-4">
          {/* Skip button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="absolute top-2 end-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep
                    ? 'bg-primary w-4'
                    : i < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="space-y-2 mb-4">
            <h3 className="font-semibold text-lg text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              disabled={isFirst}
              className="gap-1"
            >
              {isHebrew ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {isHebrew ? 'הקודם' : 'Back'}
            </Button>

            <span className="text-xs text-muted-foreground">
              {currentStep + 1} / {totalSteps}
            </span>

            <Button
              size="sm"
              onClick={onNext}
              className="gap-1"
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
          </div>
        </CardContent>
      </Card>

      {/* Arrow */}
      <div
        className={`absolute w-4 h-4 bg-card border-primary/30 transform rotate-45 ${
          placement === 'bottom'
            ? '-top-2 border-t border-s'
            : '-bottom-2 border-b border-e'
        }`}
        style={{ left: '50%', marginLeft: '-8px' }}
      />
    </div>
  );
}
