import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WelcomeCard } from '@/components/dashboard/WelcomeCard';
import { PlugChat } from '@/components/chat/PlugChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Briefcase, FileText, TrendingUp, Plus, Upload, Search, Zap } from 'lucide-react';

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
  const { profile, role } = useAuth();
  const { t } = useLanguage();

  // Role-specific stats
  const getStats = () => {
    switch (role) {
      case 'job_seeker':
        return [
          { title: t('dashboard.applications') || 'Applications', value: '12', icon: FileText, trend: '+3 this week' },
          { title: t('dashboard.interviews') || 'Interviews', value: '4', icon: Users },
          { title: t('dashboard.matches') || 'Matches', value: '28', icon: Zap, trend: '+8 new' },
        ];
      case 'freelance_hr':
      case 'inhouse_hr':
        return [
          { title: t('dashboard.candidates') || 'Candidates', value: '156', icon: Users, trend: '+23 this week' },
          { title: t('dashboard.openPositions') || 'Open Positions', value: '8', icon: Briefcase },
          { title: t('dashboard.interviews') || 'Interviews', value: '12', icon: FileText },
        ];
      case 'company_employee':
        return [
          { title: t('dashboard.referrals') || 'Referrals', value: '5', icon: Users },
          { title: t('dashboard.openPositions') || 'Open Positions', value: '12', icon: Briefcase },
          { title: t('dashboard.bonus') || 'Bonus', value: '₪2,500', icon: TrendingUp },
        ];
      default:
        return [];
    }
  };

  // Role-specific quick actions
  const getQuickActions = () => {
    switch (role) {
      case 'job_seeker':
        return [
          { title: t('actions.uploadCV') || 'Upload CV', icon: Upload },
          { title: t('actions.searchJobs') || 'Search Jobs', icon: Search },
          { title: t('actions.viewMatches') || 'View Matches', icon: Zap },
        ];
      case 'freelance_hr':
      case 'inhouse_hr':
        return [
          { title: t('actions.postJob') || 'Post Job', icon: Plus },
          { title: t('actions.searchCandidates') || 'Search Candidates', icon: Search },
          { title: t('actions.viewPipeline') || 'View Pipeline', icon: Users },
        ];
      case 'company_employee':
        return [
          { title: t('actions.referCandidate') || 'Refer Candidate', icon: Plus },
          { title: t('actions.viewOpenings') || 'View Openings', icon: Briefcase },
          { title: t('actions.trackReferrals') || 'Track Referrals', icon: TrendingUp },
        ];
      default:
        return [];
    }
  };

  const stats = getStats();
  const quickActions = getQuickActions();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Card */}
        <WelcomeCard />

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
          <div className="lg:col-span-2">
            <PlugChat />
          </div>

          {/* AI Insights - Right Side */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border plug-ai-highlight h-full">
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
    </DashboardLayout>
  );
}
