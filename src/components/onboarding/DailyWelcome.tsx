import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import { X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function DailyWelcome() {
  const { profile, role, user } = useAuth();
  const { language } = useLanguage();
  const { totalCredits } = useCredits();
  const isRTL = language === 'he';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const lastVisit = localStorage.getItem('plug_last_visit_date');
    if (lastVisit !== today) {
      setOpen(true);
    }
  }, [user]);

  const handleClose = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('plug_last_visit_date', today);
    setOpen(false);
  };

  const firstName = profile?.full_name?.split(' ')[0] || '';

  const getContent = () => {
    if (role === 'job_seeker') {
      return {
        greeting: isRTL ? `בוקר טוב ${firstName}! 👋` : `Good morning ${firstName}! 👋`,
        title: isRTL ? 'הנה מה שמחכה לך היום:' : "Here's what awaits you today:",
        items: isRTL
          ? ['משרות חדשות שמתאימות לפרופיל שלך', 'בדוק את קורות החיים שלך', `${totalCredits} קרדיטים פעילים`]
          : ['New jobs matching your profile', 'Check your resume', `${totalCredits} active credits`],
        tip: isRTL
          ? 'טיפ: תעקוב אחרי ההמלצות היומיות שלנו — ככל שתתקדם, המערכת תלמד אותך טוב יותר והכל יהיה לך יותר קל ומהיר!'
          : 'Tip: Follow our daily recommendations — the more you progress, the better the system learns and everything gets easier!',
      };
    }
    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return {
        greeting: isRTL ? `בוקר טוב ${firstName}! 👋` : `Good morning ${firstName}! 👋`,
        title: isRTL ? 'מה חדש אצלך היום:' : "What's new for you today:",
        items: isRTL
          ? ['מועמדים חדשים ממתינים לסקירה', 'Missions פתוחים', 'בדוק עדכוני לקוחות']
          : ['New candidates awaiting review', 'Open Missions', 'Check client updates'],
        tip: isRTL
          ? 'טיפ: תעקוב אחרי ההמלצות היומיות — ככל שתשתמש, המערכת תלמד את הצרכים שלך ותחסוך לך יותר ויותר זמן!'
          : 'Tip: Follow daily recommendations — the more you use, the system learns your needs and saves you more time!',
      };
    }
    return {
      greeting: isRTL ? `בוקר טוב ${firstName}! 👋` : `Good morning ${firstName}! 👋`,
      title: isRTL ? 'עדכונים:' : 'Updates:',
      items: isRTL
        ? ['מועמדים חדשים הגישו למשרות שלכם', 'בדקו Vouches חדשים']
        : ['New candidates applied to your jobs', 'Check new Vouches'],
      tip: isRTL
        ? 'טיפ: תעקבו אחרי הצעדים שלנו — המערכת מתאימה את עצמה אליכם!'
        : 'Tip: Follow our steps — the system adapts to you!',
    };
  };

  const content = getContent();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={handleClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[480px] rounded-2xl border border-primary/15 bg-background p-8"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 end-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold mb-1">{content.greeting}</h2>
            <p className="text-muted-foreground mb-4">{content.title}</p>

            <ul className="space-y-2 mb-4">
              {content.items.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="rounded-lg bg-primary/5 p-3 mb-6">
              <p className="text-sm text-muted-foreground">💡 {content.tip}</p>
            </div>

            <Button onClick={handleClose} className="w-full gap-2 font-bold">
              {isRTL ? 'התחל את היום →' : 'Start your day →'}
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
