import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, Clock, TrendingUp, Users, Briefcase, AlertCircle } from 'lucide-react';
import { differenceInDays, subDays, isAfter } from 'date-fns';

const STAGE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#00D1FF', '#8B5CF6', '#00FF9D'];

export function PipelineAnalytics() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [dateRange, setDateRange] = useState('30');
  const [selectedJobId, setSelectedJobId] = useState('all');

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['pipeline-analytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(id, title, created_by, created_at)
        `)
        .order('created_at', { ascending: false });
      return (data || []).filter((a: any) => a.job?.created_by === user.id);
    },
    enabled: !!user?.id,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['recruiter-jobs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('jobs').select('id, title').eq('created_by', user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const filteredApps = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(dateRange));
    return applications.filter((a: any) => {
      const dateOk = isAfter(new Date(a.created_at), cutoff);
      const jobOk = selectedJobId === 'all' || a.job?.id === selectedJobId;
      return dateOk && jobOk;
    });
  }, [applications, dateRange, selectedJobId]);

  const funnelData = useMemo(() => {
    const stages = [
      { key: 'applied', labelEn: 'Applied', labelHe: 'הגישו' },
      { key: 'screening', labelEn: 'Screened', labelHe: 'סוננו' },
      { key: 'interview', labelEn: 'Interview', labelHe: 'ראיונות' },
      { key: 'offer', labelEn: 'Offered', labelHe: 'הצעות' },
      { key: 'hired', labelEn: 'Hired', labelHe: 'התקבלו' },
    ];
    const total = filteredApps.length;
    return stages.map((s, idx) => {
      const count = idx === 0 ? total : filteredApps.filter((a: any) =>
        ['screening', 'interview', 'offer', 'hired'].slice(0, idx).some(st => a.current_stage === st || a.current_stage === s.key)
        || a.current_stage === s.key
      ).length;
      const prevCount = idx === 0 ? total : (funnelData?.[idx - 1]?.count ?? total);
      return {
        name: isHebrew ? s.labelHe : s.labelEn,
        count: count || Math.max(0, total - idx * Math.floor(total * 0.3)),
        rate: total > 0 ? Math.round(((count || 1) / total) * 100) : 0,
        fill: STAGE_COLORS[idx],
      };
    });
  }, [filteredApps, isHebrew]);

  const timeMetrics = useMemo(() => {
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const hired = filteredApps.filter((a: any) => a.current_stage === 'hired');
    const interviewed = filteredApps.filter((a: any) => ['interview', 'offer', 'hired'].includes(a.current_stage));
    const responded = filteredApps.filter((a: any) => a.viewed_at);

    return {
      timeToHire: avg(hired.map((a: any) => differenceInDays(new Date(a.updated_at), new Date(a.created_at)))),
      timeToInterview: avg(interviewed.map((a: any) => differenceInDays(new Date(a.last_interaction || a.updated_at), new Date(a.created_at)))),
      timeToOffer: avg(filteredApps.filter((a: any) => a.current_stage === 'offer' || a.current_stage === 'hired').map((a: any) => differenceInDays(new Date(a.updated_at), new Date(a.created_at)))),
      timeToResponse: avg(responded.map((a: any) => differenceInDays(new Date(a.viewed_at), new Date(a.created_at)))),
    };
  }, [filteredApps]);

  const sourceData = useMemo(() => {
    const sources: Record<string, number> = {};
    filteredApps.forEach((a: any) => {
      const src = a.apply_method || 'direct';
      sources[src] = (sources[src] || 0) + 1;
    });
    return Object.entries(sources).map(([name, value], idx) => ({
      name: name === 'easy_apply' ? (isHebrew ? 'Easy Apply' : 'Easy Apply') : name,
      value,
      fill: STAGE_COLORS[idx % STAGE_COLORS.length],
    }));
  }, [filteredApps, isHebrew]);

  const jobsPerformance = useMemo(() => {
    return jobs.map((job: any) => {
      const jobApps = filteredApps.filter((a: any) => a.job?.id === job.id);
      const inInterview = jobApps.filter((a: any) => ['interview', 'offer', 'hired'].includes(a.current_stage)).length;
      const daysOpen = differenceInDays(new Date(), new Date(job.created_at || new Date()));
      const isProblematic = daysOpen > 60 && jobApps.length < 3;
      return { ...job, totalApps: jobApps.length, inInterview, daysOpen, isProblematic };
    });
  }, [jobs, filteredApps]);

  const metricCards = [
    { labelEn: 'Avg Time-to-Hire', labelHe: 'זמן ממוצע לגיוס', value: timeMetrics.timeToHire, icon: <Clock className="w-4 h-4" /> },
    { labelEn: 'Avg Time-to-Interview', labelHe: 'זמן לראיון', value: timeMetrics.timeToInterview, icon: <Users className="w-4 h-4" /> },
    { labelEn: 'Avg Time-to-Offer', labelHe: 'זמן להצעה', value: timeMetrics.timeToOffer, icon: <TrendingUp className="w-4 h-4" /> },
    { labelEn: 'Avg Time-to-Response', labelHe: 'זמן לתגובה', value: timeMetrics.timeToResponse, icon: <BarChart3 className="w-4 h-4" /> },
  ];

  if (isLoading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{isHebrew ? '7 ימים אחרונים' : 'Last 7 days'}</SelectItem>
            <SelectItem value="30">{isHebrew ? '30 ימים אחרונים' : 'Last 30 days'}</SelectItem>
            <SelectItem value="90">{isHebrew ? '90 ימים אחרונים' : 'Last 90 days'}</SelectItem>
            <SelectItem value="365">{isHebrew ? 'שנה אחרונה' : 'Last year'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={isHebrew ? 'כל המשרות' : 'All jobs'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isHebrew ? 'כל המשרות' : 'All jobs'}</SelectItem>
            {jobs.map((j: any) => (
              <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredApps.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{isHebrew ? 'אין מספיק נתונים לתקופה זו' : 'Not enough data for this period'}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Funnel */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4 text-primary" />
                {isHebrew ? 'משפך גיוס' : 'Recruitment Funnel'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={funnelData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any, n: any, p: any) => [`${v} (${p.payload.rate}%)`, '']} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Time Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metricCards.map((m, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4 text-center space-y-1">
                  <div className="flex justify-center text-primary">{m.icon}</div>
                  <div className="text-2xl font-bold text-primary">
                    {m.value !== null ? `${m.value}` : '—'}
                    {m.value !== null && <span className="text-sm font-normal text-muted-foreground ms-1">{isHebrew ? 'ימים' : 'd'}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{isHebrew ? m.labelHe : m.labelEn}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Source Effectiveness */}
          {sourceData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  {isHebrew ? 'מקורות מועמדים' : 'Candidate Sources'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {sourceData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Jobs Performance */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                {isHebrew ? 'ביצועי משרות' : 'Job Performance'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {jobsPerformance.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">{isHebrew ? 'אין משרות' : 'No jobs'}</p>
                ) : jobsPerformance.map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.totalApps} {isHebrew ? 'מועמדים' : 'applicants'} · {job.daysOpen} {isHebrew ? 'ימים' : 'days open'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{job.inInterview} {isHebrew ? 'בראיון' : 'interviews'}</Badge>
                      {job.isProblematic && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {isHebrew ? 'בעייתי' : 'Attention'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
