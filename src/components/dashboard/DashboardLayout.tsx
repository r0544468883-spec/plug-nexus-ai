import { ReactNode, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PlugLogo } from '@/components/PlugLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { GiveVouchDialog } from '@/components/vouch/GiveVouchDialog';
import { MessageBadge } from '@/components/messaging/MessageBadge';
import { CreditHUD } from '@/components/credits/CreditHUD';
import { NavTooltip } from '@/components/ui/nav-tooltip';
import { VisibleToHRBanner } from '@/components/sidebar/VisibleToHRBanner';
import { PlugFloatingHint } from '@/components/chat/PlugFloatingHint';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileText, 
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Search,
  ArrowLeft,
  ArrowRight,
  Heart,
  FileEdit,
  Route,
  Sparkles,
  Mic,
  Newspaper,
  Video,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export type DashboardSection = 'overview' | 'profile-docs' | 'applications' | 'candidates' | 'jobs' | 'job-search' | 'chat' | 'settings' | 'messages' | 'post-job' | 'saved-jobs' | 'cv-builder' | 'interview-prep' | 'feed' | 'create-feed-post' | 'create-webinar' | 'communities' | 'create-community' | 'community-view';

interface NavItemConfig {
  icon: typeof LayoutDashboard;
  label: string;
  section: DashboardSection;
  tooltipHe: string;
  tooltipEn: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  currentSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  onChatOpen?: (initialMessage?: string, sourceSection?: DashboardSection) => void;
}

export function DashboardLayout({ children, currentSection, onSectionChange, onChatOpen }: DashboardLayoutProps) {
  const { profile, role, signOut } = useAuth();
  const { t, direction } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [plugHintSignal, setPlugHintSignal] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we can go back (not at initial page)
  const canGoBack = location.key !== 'default';
  const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  const handleNavClick = (section: DashboardSection) => {
    onSectionChange(section);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'job_seeker': return t('identity.job_seeker');
      case 'freelance_hr': return t('identity.freelance_hr');
      case 'inhouse_hr': return t('identity.inhouse_hr');
      case 'company_employee': return t('identity.company_employee');
      default: return '';
    }
  };

  // Navigation items based on role with tooltips
  const getNavItems = (): NavItemConfig[] => {
    if (role === 'job_seeker') {
      return [
        { icon: LayoutDashboard, label: t('dashboard.overview'), section: 'overview', tooltipHe: 'מבט כללי על החשבון, סטטיסטיקות והודעות מ-Plug', tooltipEn: 'Overview of your account, stats, and Plug messages' },
        { icon: User, label: 'Profile & documents', section: 'profile-docs', tooltipHe: 'כרטיס אישי, קו"ח ולינקים מקצועיים', tooltipEn: 'Personal card, resume, and professional links' },
        { icon: Search, label: t('dashboard.jobSearch') || 'Job Search', section: 'job-search', tooltipHe: 'חיפוש משרות חדשות וסינון לפי מיקום, קטגוריה וסוג', tooltipEn: 'Search new jobs and filter by location, category, and type' },
        { icon: Briefcase, label: 'My Applications', section: 'applications', tooltipHe: 'ניהול ומעקב אחר כל המועמדויות שהגשת', tooltipEn: 'Manage and track all your submitted applications' },
        { icon: FileEdit, label: 'CV Builder', section: 'cv-builder', tooltipHe: 'בניית קורות חיים מקצועיים עם תבניות ו-AI', tooltipEn: 'Build professional CVs with templates and AI' },
        { icon: Mic, label: 'Interview Prep', section: 'interview-prep', tooltipHe: 'הכנה לראיון עבודה עם שאלות ותרגול AI', tooltipEn: 'Interview preparation with AI questions and practice' },
        { icon: Newspaper, label: 'PLUG Feed', section: 'feed', tooltipHe: 'פיד תוכן מותאם אישית – הרוויחו דלק מכל אינטראקציה', tooltipEn: 'Personalized content feed – earn fuel from every interaction' },
        { icon: Globe, label: 'Communities', section: 'communities', tooltipHe: 'קהילות מקצועיות לחיפוש עבודה', tooltipEn: 'Professional job search communities' },
        { icon: MessageSquare, label: 'Messages', section: 'messages', tooltipHe: 'הודעות פנימיות מקבלים ומגייסים', tooltipEn: 'Internal messages from recruiters and contacts' },
        { icon: Settings, label: 'Settings', section: 'settings', tooltipHe: 'הגדרות פרופיל, פרטיות והעדפות', tooltipEn: 'Profile settings, privacy, and preferences' },
      ];
    }

    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return [
        { icon: LayoutDashboard, label: t('dashboard.overview'), section: 'overview', tooltipHe: 'מבט כללי על הפעילות שלך', tooltipEn: 'Overview of your activity' },
        { icon: Users, label: 'Candidates', section: 'candidates', tooltipHe: 'צפייה ומעקב אחר מועמדים למשרות שפרסמת', tooltipEn: 'View and track candidates for your posted jobs' },
        { icon: Briefcase, label: 'Post Job', section: 'post-job', tooltipHe: 'פרסום משרה חדשה וקבלת מועמדויות', tooltipEn: 'Post a new job and receive applications' },
        { icon: Newspaper, label: 'Create Feed Content', section: 'create-feed-post', tooltipHe: 'יצירת תוכן לפיד – טיפים, תרבות וסקרים למועמדים', tooltipEn: 'Create feed content – tips, culture & polls for candidates' },
        { icon: Video, label: 'Webinars', section: 'create-webinar', tooltipHe: 'יצירת וניהול וובינרים למועמדים', tooltipEn: 'Create and manage webinars for candidates' },
        { icon: Globe, label: 'Communities', section: 'communities', tooltipHe: 'קהילות מקצועיות – יצירה וניהול', tooltipEn: 'Professional communities – create & manage' },
        { icon: MessageSquare, label: 'Messages', section: 'messages', tooltipHe: 'הודעות פנימיות עם מועמדים ואנשי קשר', tooltipEn: 'Internal messages with candidates and contacts' },
        { icon: FileText, label: 'Documents', section: 'profile-docs', tooltipHe: 'מסמכים וקבצים', tooltipEn: 'Documents and files' },
        { icon: Settings, label: 'Settings', section: 'settings', tooltipHe: 'הגדרות פרופיל והעדפות', tooltipEn: 'Profile settings and preferences' },
      ];
    }

    // Default for company_employee and others
    return [
      { icon: LayoutDashboard, label: t('dashboard.overview'), section: 'overview', tooltipHe: 'מבט כללי', tooltipEn: 'Overview' },
      { icon: FileText, label: 'Documents', section: 'profile-docs', tooltipHe: 'מסמכים', tooltipEn: 'Documents' },
      { icon: MessageSquare, label: 'Chat with Plug', section: 'chat', tooltipHe: 'צ\'אט עם העוזר האישי Plug', tooltipEn: 'Chat with Plug AI assistant' },
      { icon: Settings, label: 'Settings', section: 'settings', tooltipHe: 'הגדרות', tooltipEn: 'Settings' },
    ];
  };

  const navItems = getNavItems();

  const hintContextPage = useMemo(() => {
    return (
      currentSection === 'cv-builder' ? 'cv-builder' :
      currentSection === 'applications' ? 'applications' :
      currentSection === 'job-search' ? 'jobs' :
      'dashboard'
    );
  }, [currentSection]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Added bg-background to fix transparency issue on mobile */}
      <aside className={cn(
        'fixed lg:static inset-y-0 z-50 w-64 bg-background border-e border-sidebar-border flex flex-col transition-transform duration-300',
        direction === 'rtl' ? 'right-0' : 'left-0',
        sidebarOpen ? 'translate-x-0' : direction === 'rtl' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <PlugLogo size="sm" />
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <NavTooltip 
              key={index} 
              content={direction === 'rtl' ? item.tooltipHe : item.tooltipEn}
              side={direction === 'rtl' ? 'left' : 'right'}
            >
              <button
                onClick={() => handleNavClick(item.section)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-start",
                  currentSection === item.section 
                    ? "bg-primary/10 text-primary plug-row-active" 
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/10"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </NavTooltip>
          ))}
        </nav>

        {/* Visible to HR Banner for job seekers */}
        <VisibleToHRBanner />
        {/* User info */}
        <div className="p-4 border-t border-sidebar-border">
          <Link 
            to="/profile"
            className="flex items-center gap-3 mb-3 p-2 -m-2 rounded-lg hover:bg-sidebar-accent/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{getRoleLabel()}</p>
            </div>
            <User className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            {t('auth.logout')}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-2">
            {/* Back button */}
            {canGoBack && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground"
              >
                <BackIcon className="w-5 h-5" />
              </Button>
            )}
            
            {/* Mobile menu button */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 lg:flex-initial" />
          
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Credit HUD */}
            <CreditHUD />
            
            {/* Realtime Message Badge */}
            <NavTooltip content={direction === 'rtl' ? 'תיבת הודעות - צפה בשיחות ושלח הודעות' : 'Inbox - View conversations and send messages'} side="bottom">
              <span>
                <MessageBadge onClick={() => onSectionChange('messages')} />
              </span>
            </NavTooltip>
            
            {/* Global Give Vouch button */}
            <NavTooltip content={direction === 'rtl' ? 'תן המלצה (Vouch) - המלץ על אנשי קשר מקצועיים' : 'Give Vouch - Recommend professional contacts'} side="bottom">
              <span>
                <GiveVouchDialog 
                  trigger={
                    <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                      <Heart className="h-5 w-5" />
                    </Button>
                  }
                />
              </span>
            </NavTooltip>
            
            <NavTooltip content={direction === 'rtl' ? 'התראות - עדכונים חשובים ופעילות' : 'Notifications - Important updates and activity'} side="bottom">
              <span>
                <NotificationBell />
              </span>
            </NavTooltip>

            {/* Re-show Plug hint */}
            <NavTooltip content={direction === 'rtl' ? 'הצג מחדש את Plug' : 'Show Plug hint again'} side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPlugHintSignal((v) => v + 1)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={direction === 'rtl' ? 'הצג מחדש את Plug' : 'Show Plug hint again'}
              >
                <Sparkles className="h-5 w-5" />
              </Button>
            </NavTooltip>
            
            <NavTooltip content={direction === 'rtl' ? 'החלף שפה - עברית/אנגלית' : 'Language Toggle - Hebrew/English'} side="bottom">
              <span>
                <LanguageToggle />
              </span>
            </NavTooltip>

            {/* Prominent Logout Button */}
            <NavTooltip content={direction === 'rtl' ? 'התנתק מהמערכת' : 'Sign out'} side="bottom">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </NavTooltip>
          </div>
        </header>

        {/* Page content */}
        <main id="dashboard-scroll" className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>

        {/* Floating Plug Hint - contextual based on current section */}
        <PlugFloatingHint 
          contextPage={hintContextPage}
          forceShowSignal={plugHintSignal}
          onChatOpen={(initialMessage) => {
            // Let the parent decide how/when to navigate to chat.
            // We pass the source section so Plug can keep correct context.
            onChatOpen?.(initialMessage, currentSection);
          }}
        />
      </div>
    </div>
  );
}
