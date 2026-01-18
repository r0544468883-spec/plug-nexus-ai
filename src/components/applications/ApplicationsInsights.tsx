import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart3, TrendingUp, Clock, Target } from 'lucide-react';

interface Application {
  id: string;
  status: string | null;
  current_stage: string | null;
  created_at: string;
  job?: {
    title: string;
    company?: {
      name: string;
    };
  };
}

interface ApplicationsInsightsProps {
  applications: Application[];
}

const stageOrder = ['applied', 'screening', 'interview', 'offer', 'hired'];
const stageLabels: Record<string, { en: string; he: string }> = {
  applied: { en: 'Applied', he: 'הוגש' },
  screening: { en: 'Screening', he: 'סינון' },
  interview: { en: 'Interview', he: 'ראיון' },
  offer: { en: 'Offer', he: 'הצעה' },
  hired: { en: 'Hired', he: 'התקבל' },
  rejected: { en: 'Rejected', he: 'נדחה' },
};

export function ApplicationsInsights({ applications }: ApplicationsInsightsProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const insights = useMemo(() => {
    const total = applications.length;
    if (total === 0) return null;

    // Count by stage
    const stageCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const companyCounts: Record<string, number> = {};
    const roleCounts: Record<string, number> = {};

    applications.forEach((app) => {
      const stage = app.current_stage || 'applied';
      const status = app.status || 'active';
      const company = app.job?.company?.name || 'Unknown';
      const role = app.job?.title || 'Unknown';

      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      companyCounts[company] = (companyCounts[company] || 0) + 1;
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    // Calculate funnel data
    const funnel = stageOrder.map((stage) => {
      const count = stageCounts[stage] || 0;
      return {
        stage,
        count,
        percentage: Math.round((count / total) * 100),
      };
    });

    // Cumulative funnel (how many reached each stage or beyond)
    const cumulativeFunnel = stageOrder.map((stage, index) => {
      const reachedCount = stageOrder
        .slice(index)
        .reduce((sum, s) => sum + (stageCounts[s] || 0), 0);
      return {
        stage,
        count: reachedCount,
        percentage: Math.round((reachedCount / total) * 100),
      };
    });

    // Response rate (not rejected or still in applied)
    const responded = total - (stageCounts['applied'] || 0);
    const responseRate = Math.round((responded / total) * 100);

    // Top companies
    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top roles
    const topRoles = Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Rejected count
    const rejected = statusCounts['rejected'] || 0;
    const rejectionRate = Math.round((rejected / total) * 100);

    return {
      total,
      funnel,
      cumulativeFunnel,
      responseRate,
      rejectionRate,
      rejected,
      topCompanies,
      topRoles,
      stageCounts,
    };
  }, [applications]);

  if (!insights) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Funnel Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            {isHebrew ? 'משפך מועמדות' : 'Application Funnel'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.cumulativeFunnel.map((item) => (
            <div key={item.stage} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {isHebrew 
                    ? stageLabels[item.stage]?.he 
                    : stageLabels[item.stage]?.en}
                </span>
                <span className="font-medium">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <Progress 
                value={item.percentage} 
                className="h-2"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {insights.responseRate}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {isHebrew ? 'אחוז תגובה' : 'Response Rate'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Target className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {insights.rejected}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isHebrew ? 'נדחו' : 'Rejected'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Companies */}
      {insights.topCompanies.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isHebrew ? 'לפי חברה' : 'By Company'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.topCompanies.map(([company, count]) => (
              <div key={company} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {company}
                </span>
                <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top Roles */}
      {insights.topRoles.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isHebrew ? 'לפי תפקיד' : 'By Role'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.topRoles.map(([role, count]) => (
              <div key={role} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {role}
                </span>
                <span className="text-sm font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                  {count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
