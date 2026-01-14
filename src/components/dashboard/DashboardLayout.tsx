import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PlugLogo } from '@/components/PlugLogo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileText, 
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, role, signOut } = useAuth();
  const { t, direction } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getRoleLabel = () => {
    switch (role) {
      case 'job_seeker': return t('identity.job_seeker');
      case 'freelance_hr': return t('identity.freelance_hr');
      case 'inhouse_hr': return t('identity.inhouse_hr');
      case 'company_employee': return t('identity.company_employee');
      default: return '';
    }
  };

  // Navigation items based on role
  const getNavItems = () => {
    const common = [
      { icon: LayoutDashboard, label: t('dashboard.overview'), href: '#overview' },
      { icon: FileText, label: 'Documents', href: '#documents' },
      { icon: MessageSquare, label: 'Chat with Plug', href: '#chat' },
      { icon: Settings, label: 'Settings', href: '#settings' },
    ];

    if (role === 'job_seeker') {
      return [
        { icon: LayoutDashboard, label: t('dashboard.overview'), href: '#overview' },
        { icon: Briefcase, label: 'My Applications', href: '#applications' },
        { icon: FileText, label: 'My Documents', href: '#documents' },
        { icon: MessageSquare, label: 'Chat with Plug', href: '#chat' },
        { icon: Settings, label: 'Settings', href: '#settings' },
      ];
    }

    if (role === 'freelance_hr' || role === 'inhouse_hr') {
      return [
        { icon: LayoutDashboard, label: t('dashboard.overview'), href: '#overview' },
        { icon: Users, label: 'Candidates', href: '#candidates' },
        { icon: Briefcase, label: 'Jobs', href: '#jobs' },
        { icon: FileText, label: 'Documents', href: '#documents' },
        { icon: MessageSquare, label: 'Chat with Plug', href: '#chat' },
        { icon: Settings, label: 'Settings', href: '#settings' },
      ];
    }

    return common;
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 z-50 w-64 bg-sidebar-background border-e border-sidebar-border flex flex-col transition-transform duration-300',
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
            <a
              key={index}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/10 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{getRoleLabel()}</p>
            </div>
          </div>
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
          <button 
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex-1 lg:flex-initial" />
          
          <div className="flex items-center gap-4">
            <LanguageToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
