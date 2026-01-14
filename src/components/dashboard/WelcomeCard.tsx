import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles } from 'lucide-react';

export function WelcomeCard() {
  const { profile, role } = useAuth();
  const { t } = useLanguage();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleDescription = () => {
    switch (role) {
      case 'job_seeker':
        return "Ready to find your next opportunity? I'm here to help with your job search.";
      case 'freelance_hr':
        return "Managing multiple clients? Let's streamline your HR operations today.";
      case 'inhouse_hr':
        return "Your hiring pipeline awaits. Let's find great talent together.";
      case 'company_employee':
        return "Need help with documents or policies? I've got you covered.";
      default:
        return "How can I help you today?";
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-accent/10 border border-border p-6 md:p-8">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 rtl:-translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-start gap-4">
          {/* AI Avatar */}
          <div className="hidden sm:flex w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent items-center justify-center flex-shrink-0">
            <Sparkles className="w-7 h-7 text-primary-foreground" />
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-muted-foreground text-lg">
              {getRoleDescription()}
            </p>
          </div>
        </div>

        {/* Quick stats or CTA could go here */}
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-primary text-sm font-medium">
              ✨ Plug is ready to assist
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
