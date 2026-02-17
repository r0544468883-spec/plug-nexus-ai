import { useMemo, useRef, useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { PreferencesSettings } from '@/components/settings/PreferencesSettings';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { PortfolioLinks } from '@/components/settings/PortfolioLinks';
import { MessageInbox } from '@/components/messaging/MessageInbox';
import { CandidatesPage } from '@/components/candidates/CandidatesPage';
import { PostJobForm } from '@/components/jobs/PostJobForm';
import { JobSeekerTour } from '@/components/onboarding/JobSeekerTour';
import { RecruiterTour } from '@/components/onboarding/RecruiterTour';
import { CVBuilder } from '@/components/cv-builder/CVBuilder';
import { CompanyRecommendations } from '@/components/jobs/CompanyRecommendations';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { PlugTipContainer } from '@/components/tips/PlugTipContainer';
import { PersonalCardEditor } from '@/components/profile/PersonalCardEditor';
import { MobileWelcomeStats } from '@/components/dashboard/MobileWelcomeStats';
import { InterviewPrepContent } from '@/components/interview/InterviewPrepContent';
import { FeedPage } from '@/components/feed/FeedPage';
import { CreateFeedPost } from '@/components/feed/CreateFeedPost';
import { CreateWebinar } from '@/components/feed/CreateWebinar';
import { CommunityHubsList } from '@/components/communities/CommunityHubsList';
import { CreateCommunityHub } from '@/components/communities/CreateCommunityHub';
import { CommunityHubView } from '@/components/communities/CommunityHubView';
import { ContentDashboard } from '@/components/feed/ContentDashboard';
import { NegotiationSandbox } from '@/components/interview/NegotiationSandbox';
import { PlacementRevenue } from '@/components/dashboard/PlacementRevenue';
import { SLAMonitor } from '@/components/dashboard/SLAMonitor';
import { VacancyCalculator } from '@/components/jobs/VacancyCalculator';
import { PersonalizedFeedWidget } from '@/components/feed/PersonalizedFeedWidget';
import { RecruiterProfileEditor } from '@/components/profile/RecruiterProfileEditor';
import { ClientsPage } from '@/components/clients/ClientsPage';
import { ClientProfilePage } from '@/components/clients/ClientProfilePage';
import { MissionBoard } from '@/components/missions/MissionBoard';
import { CreateMissionForm } from '@/components/missions/CreateMissionForm';
import { MyMissions } from '@/components/missions/MyMissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Briefcase, FileText, TrendingUp, Plus, Upload, Search, Zap, MessageSquare, Settings, FolderOpen, Heart, Sparkles, Route, Flag, FileEdit, Building2, User, Mic, Newspaper, ArrowLeft, ArrowRight, BarChart3, Video, Globe, DollarSign } from 'lucide-react';
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
  const [pendingMessageKey, setPendingMessageKey] = useState(0);
  const [chatContextSection, setChatContextSection] = useState<DashboardSection>('overview');
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [viewingHubId, setViewingHubId] = useState<string | null>(null);
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const isRTL = language === 'he';

  const mapSectionToPlugContext = (section: DashboardSection) => {
    if (section === 'cv-builder') return 'cv-builder' as const;
    if (section === 'applications') return 'applications' as const;
    if (section === 'job-search') return 'jobs' as const;
    return 'dashboard' as const;
  };

  // Map section to Plug context.
  // IMPORTANT: when viewing the dedicated Chat section, keep the *source* section
  // (chatContextSection) so Plug's greeting matches where the user came from.
  const plugContextPage = useMemo(() => {
    const sectionForContext = currentSection === 'chat' ? chatContextSection : currentSection;
    return mapSectionToPlugContext(sectionForContext);
  }, [currentSection, chatContextSection]);

  // Scroll to top on mount
  useEffect(() => {
    const scrollToTop = () => {
      const el = document.getElementById('dashboard-scroll');
      if (el) {
        el.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
      window.scrollTo(0, 0);
    };
    
    scrollToTop();
    // Also after a short delay to ensure render is complete
    const timer = setTimeout(scrollToTop, 100);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to top on section change
  useEffect(() => {
    const el = document.getElementById('dashboard-scroll');
    if (el) {
      el.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
    window.scrollTo(0, 0);
  }, [currentSection]);

  // Fetch real statistics from database
  const { data: dashboardData, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get applications count - explicit column selection for security
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
            title: isRTL ? 'בניית קו״ח' : 'CV Builder', 
            icon: FileEdit,
            onClick: () => setCurrentSection('cv-builder'),
          },
          { 
            title: isRTL ? 'הכנה לראיון' : 'Interview Prep', 
            icon: Mic,
            onClick: () => setCurrentSection('interview-prep'),
          },
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
    setChatContextSection(currentSection);
    setPendingMessage(message);
    setPendingMessageKey((k) => k + 1);
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
      {/* Mobile Welcome Stats Popup */}
      {role === 'job_seeker' && (
        <MobileWelcomeStats
          totalApplications={dashboardData?.totalApplications || 0}
          interviews={dashboardData?.interviews || 0}
          activeApplications={dashboardData?.activeApplications || 0}
        />
      )}

      {/* Contextual Plug Tips for job seekers */}
      {role === 'job_seeker' && (
        <PlugTipContainer context="dashboard" maxTips={1} />
      )}

      {/* Onboarding Checklist for job seekers */}
      {role === 'job_seeker' && (
        <OnboardingChecklist 
          onNavigate={setCurrentSection}
          onShowResumeDialog={() => setShowResumeDialog(true)}
        />
      )}

      {/* PLUG Feed Entry Card - job seekers only */}
      {role === 'job_seeker' && (
        <Card 
          className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 cursor-pointer plug-card-hover"
          onClick={() => setCurrentSection('feed')}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Newspaper className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">PLUG Feed</h3>
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? 'טיפים, תרבות ארגונית וסקרים – הרוויחו דלק מכל אינטראקציה ⚡'
                  : 'Tips, culture & polls – earn fuel from every interaction ⚡'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Welcome Card with Plug CTA */}
      <WelcomeCard onSendMessage={handleWelcomeMessage} />

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-tour="stats-row">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content - Chat Centered with Actions on Sides */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Actions - Left Side - Sticky */}
        <div className="lg:col-span-1 space-y-3" data-tour="quick-actions">
          <div className="lg:sticky lg:top-4">
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
        </div>

        {/* PLUG Chat - Center (Large) */}
        <div className="lg:col-span-2" ref={chatRef}>
          <PlugChat 
            initialMessage={pendingMessage || undefined}
            initialMessageKey={pendingMessageKey}
            onMessageSent={handleMessageSent}
            contextPage={plugContextPage}
          />
        </div>

        {/* AI Insights + Vouch Widget + Company Recommendations - Right Side - Sticky */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4 space-y-4">
            {/* Vouch Widget */}
            <VouchWidget />

            {/* Company Recommendations - Only for job seekers */}
            {role === 'job_seeker' && (
              <CompanyRecommendations />
            )}

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
    </div>
  );

  const renderProfileDocsContent = () => (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <User className="w-6 h-6 text-primary" />
        {isRTL ? 'פרופיל ומסמכים' : 'Profile & documents'}
      </h2>

      {/* Personal Card Editor - First for job seekers */}
      {role === 'job_seeker' && <PersonalCardEditor />}

      {/* Portfolio Links Section */}
      <PortfolioLinks />

      {/* Resume Upload Section */}
      {role === 'job_seeker' && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              {isRTL ? 'קורות חיים' : 'Resume / CV'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResumeUpload onSuccess={() => refetchStats()} />
          </CardContent>
        </Card>
      )}

      {/* Other Documents */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            {isRTL ? 'מסמכים נוספים' : 'Other Documents'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {isRTL ? 'אין מסמכים נוספים' : 'No additional documents yet'}
          </p>
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            {isRTL ? 'העלה מסמך' : 'Upload Document'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderChatContent = () => (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-primary" />
        {t('plug.title') || 'Chat with Plug'}
      </h2>
      <PlugChat
        initialMessage={pendingMessage || undefined}
        initialMessageKey={pendingMessageKey}
        onMessageSent={handleMessageSent}
        contextPage={plugContextPage}
      />
    </div>
  );

  const renderSettingsContent = () => (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary" />
        {t('dashboard.settings') || 'Settings'}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <ProfileSettings />

        {/* Preferences Settings */}
        <PreferencesSettings />

        {/* Privacy Settings */}
        <PrivacySettings />

        {/* Account Settings */}
        <AccountSettings />
      </div>
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


  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // Wrapper for non-overview sections with back button
  const withBackButton = (content: React.ReactNode, backTo: DashboardSection = 'overview') => (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => setCurrentSection(backTo)}>
        <BackIcon className="w-4 h-4" />
        {isRTL ? 'חזרה' : 'Back'}
      </Button>
      {content}
    </div>
  );

  // Content Hub for recruiters
  const renderContentHub = () => (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'} data-tour="content-hub">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Newspaper className="w-6 h-6 text-primary" />
        {isRTL ? 'תוכן וקהילה' : 'Content & Community'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { icon: BarChart3, label: isRTL ? 'דאשבורד תוכן' : 'Content Dashboard', desc: isRTL ? 'צפיות, לייקים ואנליטיקס' : 'Views, likes & analytics', section: 'content-dashboard' as DashboardSection },
          { icon: Newspaper, label: isRTL ? 'יצירת תוכן' : 'Create Content', desc: isRTL ? 'טיפים, סקרים, וידאו ועוד' : 'Tips, polls, video & more', section: 'create-feed-post' as DashboardSection },
          { icon: Video, label: isRTL ? 'וובינרים' : 'Webinars', desc: isRTL ? 'יצירה וניהול וובינרים' : 'Create & manage webinars', section: 'create-webinar' as DashboardSection },
          { icon: Globe, label: isRTL ? 'קהילות' : 'Communities', desc: isRTL ? 'קהילות מקצועיות' : 'Professional communities', section: 'communities' as DashboardSection },
        ].map((item) => (
          <Card key={item.section} className="bg-card border-border cursor-pointer plug-card-hover" onClick={() => setCurrentSection(item.section)}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><item.icon className="w-6 h-6 text-primary" /></div>
              <div><h3 className="font-semibold">{item.label}</h3><p className="text-sm text-muted-foreground">{item.desc}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  

  const renderSectionContent = () => {
    switch (currentSection) {
      case 'overview':
        return renderOverviewContent();
      case 'profile-docs':
        return withBackButton(renderProfileDocsContent());
      case 'chat':
        return withBackButton(renderChatContent());
      case 'settings':
        return withBackButton(renderSettingsContent());
      case 'applications':
        return withBackButton(<ApplicationsPage />);
      case 'job-search':
        return withBackButton(<JobSearchPage />);
      case 'messages':
        return withBackButton(<MessageInbox />);
      case 'candidates':
        return withBackButton(<CandidatesPage />);
      case 'post-job':
        return withBackButton(<PostJobForm onSuccess={() => setCurrentSection('overview')} />);
      case 'cv-builder':
        return withBackButton(<CVBuilder />);
      case 'interview-prep':
        return withBackButton(<InterviewPrepContent />);
      case 'feed':
        return withBackButton(<FeedPage />);
      case 'create-feed-post':
        return withBackButton(<CreateFeedPost />, 'content-hub' as DashboardSection);
      case 'create-webinar':
        return withBackButton(<CreateWebinar />, 'content-hub' as DashboardSection);
      case 'content-dashboard':
        return withBackButton(<ContentDashboard onNavigate={(s) => setCurrentSection(s as DashboardSection)} />, 'content-hub' as DashboardSection);
      case 'content-hub' as DashboardSection:
        return withBackButton(renderContentHub());
      
      case 'recruiter-profile' as DashboardSection:
        return withBackButton(<RecruiterProfileEditor />);
      case 'negotiation-sandbox':
        return withBackButton(<NegotiationSandbox />);
      case 'clients':
        return withBackButton(<ClientsPage onViewClient={(id) => { setViewingClientId(id); setCurrentSection('client-profile' as DashboardSection); }} />);
      case 'client-profile':
        return viewingClientId ? withBackButton(
          <ClientProfilePage companyId={viewingClientId} onBack={() => setCurrentSection('clients')} />,
          'clients'
        ) : null;
      case 'communities':
        return withBackButton(<CommunityHubsList 
          onViewHub={(hubId) => { setViewingHubId(hubId); setCurrentSection('community-view'); }} 
          onCreateHub={() => setCurrentSection('create-community')} 
        />, 'content-hub' as DashboardSection);
      case 'create-community':
        return withBackButton(<CreateCommunityHub 
          onSuccess={(hubId) => { setViewingHubId(hubId); setCurrentSection('community-view'); }} 
          onCancel={() => setCurrentSection('communities')} 
        />, 'communities');
      case 'community-view':
        return viewingHubId ? withBackButton(
          <CommunityHubView hubId={viewingHubId} onBack={() => setCurrentSection('communities')} />,
          'communities'
        ) : null;
      case 'missions':
        return withBackButton(
          <MissionBoard 
            onCreateMission={() => setCurrentSection('create-mission' as DashboardSection)} 
            onMyMissions={() => setCurrentSection('my-missions' as DashboardSection)} 
          />
        );
      case 'create-mission':
        return withBackButton(
          <CreateMissionForm 
            onSuccess={() => setCurrentSection('missions' as DashboardSection)} 
            onCancel={() => setCurrentSection('missions' as DashboardSection)} 
          />,
          'missions' as DashboardSection
        );
      case 'my-missions':
        return withBackButton(
          <MyMissions onBack={() => setCurrentSection('missions' as DashboardSection)} />,
          'missions' as DashboardSection
        );
        return renderOverviewContent();
    }
  };

  const scrollToChat = () => {
    setCurrentSection('overview');
    setTimeout(() => {
      chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const startTour = () => {
    setCurrentSection('overview');
    setTimeout(() => {
      if (role === 'job_seeker') {
        window.dispatchEvent(new CustomEvent('plug:start-job-seeker-tour'));
      } else if (role === 'freelance_hr' || role === 'inhouse_hr') {
        window.dispatchEvent(new CustomEvent('plug:start-recruiter-tour'));
      } else {
        toast.info(isRTL 
          ? 'סיור מודרך לתפקיד שלך יהיה זמין בקרוב!' 
          : 'Guided tour for your role coming soon!');
      }
    }, 100);
  };

  // Route with flag icon for guided tour
  const TourGuideIcon = () => (
    <div className="relative">
      <Route className="w-6 h-6" />
      <Flag className="w-3 h-3 absolute -top-1 -right-1 text-primary" />
    </div>
  );

  return (
    <DashboardLayout 
      currentSection={currentSection} 
      onSectionChange={(next) => {
        // Track last non-chat section so Plug can greet per page
        if (next !== 'chat') setChatContextSection(next);
        setCurrentSection(next);
      }}
      onChatOpen={(initialMessage, sourceSection) => {
        if (sourceSection && sourceSection !== 'chat') {
          setChatContextSection(sourceSection);
        }
        if (initialMessage) {
          setPendingMessage(initialMessage);
          setPendingMessageKey((k) => k + 1);
        }
        // Navigate to chat section when opened via Quick Actions
        setCurrentSection('chat');
      }}
    >
      {/* Interactive tours */}
      <JobSeekerTour 
        currentSection={currentSection}
        onNavigate={setCurrentSection}
      />
      <RecruiterTour 
        currentSection={currentSection}
        onNavigate={setCurrentSection}
      />
      
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

      {/* Floating Action Buttons - Available for all roles */}
      <>
        {/* Onboarding Tour Button - Bottom Left */}
        <button
          onClick={startTour}
          className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-secondary text-secondary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center group"
          title={isRTL ? 'התחל סיור מודרך' : 'Start guided tour'}
        >
          <TourGuideIcon />
          <span className="absolute bottom-full mb-2 px-3 py-1.5 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {isRTL ? 'סיור מודרך' : 'Guided Tour'}
          </span>
        </button>

        {/* Plug Chat Button - Bottom Right */}
        <button
          onClick={scrollToChat}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center group animate-pulse hover:animate-none"
          title={isRTL ? 'שוחח עם Plug' : 'Chat with Plug'}
        >
          <Sparkles className="w-6 h-6" />
          <span className="absolute bottom-full mb-2 px-3 py-1.5 bg-popover text-popover-foreground text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {isRTL ? 'שוחח עם Plug' : 'Chat with Plug'}
          </span>
        </button>
      </>
    </DashboardLayout>
  );
}
