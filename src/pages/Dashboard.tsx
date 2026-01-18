import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout, DashboardSection } from '@/components/dashboard/DashboardLayout';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { PlugChat } from '@/components/chat/PlugChat';
import { ApplicationsPage } from '@/components/applications/ApplicationsPage';
import { JobSearchPage } from '@/components/jobs/JobSearchPage';
import { ResumeUpload } from '@/components/documents/ResumeUpload';
import { VouchWidget } from '@/components/vouch/VouchWidget';
import { GiveVouchDialog } from '@/components/vouch/GiveVouchDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Briefcase, FileText, TrendingUp, Plus, Upload, Search, Zap, MessageSquare, Settings, FolderOpen, Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
}

function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="bg-card border-border plug-card-hover">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend && (
              <p className="text-xs text-primary flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" />
                {trend}
              </p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

function QuickAction({ title, icon: Icon, onClick }: QuickActionProps) {
  return (
    <Button
      variant="outline"
      className="w-full justify-start gap-3 h-12 bg-card/50 border-border hover:bg-primary/10 hover:border-primary/50 transition-all"
      onClick={onClick}
    >
      <Icon className="w-5 h-5 text-primary" />
      <span>{title}</span>
    </Button>
  );
}

export default function Dashboard() {
  const { profile, role, user } = useAuth();
  const { t, language } = useLanguage();
  const [currentSection, setCurrentSection] = useState<DashboardSection>('overview');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const isRTL = language === 'he';

  // Fetch real statistics from database
  const { data: dashboardData, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get applications count
      const { data: applications } = await supabase
        .from('applications')
        .select('id, status, current_stage')
        .eq('candidate_id', user.id);

      // Get upcoming interviews (interview_reminders with future dates)
      const { data: interviews } = await supabase
        .from('interview_reminders')
        .select('id, application_id, interview_date')
        .gte('interview_date', new Date().toISOString());

      // Filter interviews for user's applications
      const applicationIds = applications?.map(a => a.id) || [];
      const userInterviews = interviews?.filter(i => applicationIds.includes(i.application_id)) || [];

      return {
        totalApplications: applications?.length || 0,
        activeApplications: applications?.filter(a => a.status === 'active').length || 0,
        interviews: userInterviews.length,
      };
    },
    enabled: !!user?.id && role === 'job_seeker',
  });

  // Role-specific stats with real data
  const getStats = () => {
    switch (role) {
      case 'job_seeker':
        return [
          { title: t('dashboard.applications') || 'Applications', value: String(dashboardData?.totalApplications || 0), icon: FileText },
          { title: t('dashboard.interviews') || 'Interviews', value: String(dashboardData?.interviews || 0), icon: Users },
          { title: t('dashboard.active') || 'Active', value: String(dashboardData?.activeApplications || 0), icon: Zap },
        ];
      case 'freelance_hr':
      case 'inhouse_hr':
        return [
          { title: t('dashboard.candidates') || 'Candidates', value: '0', icon: Users },
          { title: t('dashboard.openPositions') || 'Open Positions', value: '0', icon: Briefcase },
          { title: t('dashboard.interviews') || 'Interviews', value: '0', icon: FileText },
        ];
      case 'company_employee':
        return [
          { title: t('dashboard.referrals') || 'Referrals', value: '0', icon: Users },
          { title: t('dashboard.openPositions') || 'Open Positions', value: '0', icon: Briefcase },
          { title: t('dashboard.bonus') || 'Bonus', value: '₪0', icon: TrendingUp },
        ];
      default:
        return [];
    }
  };

  // Role-specific quick actions with handlers
  const getQuickActions = () => {
    // Vouch action available for all roles
    const vouchAction = { 
      title: isRTL ? 'ה-Vouches שלי' : 'My Vouches', 
      icon: Heart,
      onClick: () => window.location.href = '/profile',
    };

    switch (role) {
      case 'job_seeker':
        return [
          { 
            title: t('actions.uploadCV') || 'Upload CV', 
            icon: Upload,
            onClick: () => setShowResumeDialog(true),
          },
          { 
            title: isRTL ? 'חיפוש משרות' : 'Search Jobs', 
            icon: Search,
            onClick: () => setCurrentSection('job-search'),
          },
          { 
            title: isRTL ? 'המשרות שלי' : 'My Applications', 
            icon: FileText,
            onClick: () => setCurrentSection('applications'),
          },
          vouchAction,
        ];
      case 'freelance_hr':
      case 'inhouse_hr':
        return [
          { title: t('actions.postJob') || 'Post Job', icon: Plus, onClick: () => {} },
          { title: t('actions.searchCandidates') || 'Search Candidates', icon: Search, onClick: () => {} },
          { title: t('actions.viewPipeline') || 'View Pipeline', icon: Users, onClick: () => {} },
          vouchAction,
        ];
      case 'company_employee':
        return [
          { title: t('actions.referCandidate') || 'Refer Candidate', icon: Plus, onClick: () => {} },
          { title: t('actions.viewOpenings') || 'View Openings', icon: Briefcase, onClick: () => {} },
          { title: t('actions.trackReferrals') || 'Track Referrals', icon: TrendingUp, onClick: () => {} },
          vouchAction,
        ];
      default:
        return [];
    }
  };

  const stats = getStats();
  const quickActions = getQuickActions();

  const handleWelcomeMessage = (message: string) => {
    setPendingMessage(message);
    // Scroll to chat after a brief delay
    setTimeout(() => {
      chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleMessageSent = () => {
    setPendingMessage(null);
  };

  // Section-specific content renderers
  const renderOverviewContent = () => (
    <div className="space-y-6">
      {/* Welcome Card with Plug CTA */}
      <WelcomeCard onSendMessage={handleWelcomeMessage} />

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content - Chat Centered with Actions on Sides */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Actions - Left Side */}
        <div className="lg:col-span-1 space-y-3">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                {t('dashboard.quickActions') || 'Quick Actions'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action, index) => (
                <QuickAction key={index} {...action} />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* PLUG Chat - Center (Large) */}
        <div className="lg:col-span-2" ref={chatRef}>
          <PlugChat 
            initialMessage={pendingMessage || undefined}
            onMessageSent={handleMessageSent}
          />
        </div>

        {/* AI Insights + Vouch Widget - Right Side */}
        <div className="lg:col-span-1 space-y-4">
          {/* Vouch Widget */}
          <VouchWidget />

          {/* AI Insights */}
          <Card className="bg-card border-border plug-ai-highlight">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                {t('dashboard.aiInsights') || 'AI Insights'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-sm text-muted-foreground">
                  {role === 'job_seeker' 
                    ? t('insights.jobSeeker') || 'Based on your profile, I found 5 new positions that match your skills.'
                    : role === 'company_employee'
                    ? t('insights.employee') || 'There are 4 open positions in your company that match your network.'
                    : t('insights.hr') || 'You have 12 candidates waiting for review.'
                  }
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-primary mb-1">{t('insights.tip') || 'Pro Tip'}</p>
                <p className="text-sm text-muted-foreground">
                  {t('insights.tipText') || 'Complete your profile to get better AI recommendations.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderChatContent = () => (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-primary" />
        {t('plug.title') || 'Chat with Plug'}
      </h2>
      <PlugChat />
    </div>
  );

  const renderDocumentsContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <FileText className="w-6 h-6 text-primary" />
        {t('dashboard.documents') || 'Documents'}
      </h2>
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{t('documents.empty') || 'No documents yet'}</p>
          <Button className="gap-2">
            <Upload className="w-4 h-4" />
            {t('actions.uploadDocument') || 'Upload Document'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettingsContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary" />
        {t('dashboard.settings') || 'Settings'}
      </h2>
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <p className="text-muted-foreground">{t('settings.comingSoon') || 'Settings panel coming soon...'}</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderPlaceholderContent = (title: string, icon: React.ComponentType<{ className?: string }>) => {
    const Icon = icon;
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Icon className="w-6 h-6 text-primary" />
          {title}
        </h2>
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Icon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('common.comingSoon') || 'Coming soon...'}</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSectionContent = () => {
    switch (currentSection) {
      case 'overview':
        return renderOverviewContent();
      case 'chat':
        return renderChatContent();
      case 'documents':
        return renderDocumentsContent();
      case 'settings':
        return renderSettingsContent();
      case 'applications':
        return <ApplicationsPage />;
      case 'job-search':
        return <JobSearchPage />;
      case 'candidates':
        return renderPlaceholderContent(t('dashboard.candidates') || 'Candidates', Users);
      case 'jobs':
        return renderPlaceholderContent(t('dashboard.jobs') || 'Jobs', Briefcase);
      default:
        return renderOverviewContent();
    }
  };

  return (
    <DashboardLayout 
      currentSection={currentSection} 
      onSectionChange={setCurrentSection}
    >
      {renderSectionContent()}

      {/* Resume Upload Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'העלאת קורות חיים' : 'Upload Resume'}
            </DialogTitle>
          </DialogHeader>
          <ResumeUpload 
            onSuccess={() => {
              setShowResumeDialog(false);
              refetchStats();
            }} 
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
