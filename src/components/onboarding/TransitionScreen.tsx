import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlugLogo } from '@/components/PlugLogo';
import { useLanguage } from '@/contexts/LanguageContext';

interface TransitionScreenProps {
  tip: string;
  isActive: boolean;
  onComplete: () => void;
  duration?: number;
}

export function TransitionScreen({ 
  tip, 
  isActive, 
  onComplete, 
  duration = 2000 
}: TransitionScreenProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      return;
    }

    // Animate progress
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(interval);
        onComplete();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isActive, duration, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          dir={isHebrew ? 'rtl' : 'ltr'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Background with gradient and blur */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          
          {/* Animated background circles */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-primary/5 blur-3xl"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-accent/5 blur-3xl"
              animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.5, 0.3, 0.5],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-md text-center">
            {/* Plug Logo with animations */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: 1, 
                rotate: 0,
              }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: 0.1,
              }}
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative"
              >
                {/* Glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/30 blur-xl scale-150"
                  animate={{ 
                    scale: [1.5, 1.8, 1.5],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="w-20 h-20 flex items-center justify-center">
                  <PlugLogo />
                </div>
              </motion.div>
            </motion.div>

            {/* Tip text */}
            <motion.p
              className="text-xl font-medium text-foreground leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {tip}
            </motion.p>

            {/* Progress bar */}
            <motion.div
              className="w-48 h-1.5 bg-muted rounded-full overflow-hidden"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </motion.div>

            {/* Loading text */}
            <motion.span
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {isHebrew ? 'ממשיכים...' : 'Continuing...'}
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
