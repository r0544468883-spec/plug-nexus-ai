import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import { Star, ThumbsUp, MessageSquare, BarChart3 } from 'lucide-react';

export function SurveyResults({ jobId }: { jobId?: string }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ['survey-results', user?.id, jobId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase.from('candidate_surveys').select('*');
      if (jobId) query = query.eq('job_id', jobId);
      else {
        // Recruiter sees surveys for their jobs
        const { data: myJobs } = await supabase.from('jobs').select('id').eq('created_by', user.id);
        const ids = (myJobs || []).map((j: any) => j.id);
        if (ids.length === 0) return [];
        query = query.in('job_id', ids);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  if (surveys.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">{isHebrew ? 'אין סקרים עדיין' : 'No surveys yet'}</p>
        </CardContent>
      </Card>
    );
  }

  const avg = (key: string) => {
    const vals = surveys.filter((s: any) => s[key]).map((s: any) => s[key] as number);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  const nps = (() => {
    const withRec = surveys.filter((s: any) => s.would_recommend !== null);
    if (!withRec.length) return null;
    const promoters = withRec.filter((s: any) => s.would_recommend === true).length;
    return Math.round((promoters / withRec.length) * 100);
  })();

  const radarData = [
    { name: isHebrew ? 'כללי' : 'Overall', value: parseFloat(avg('overall_rating') as string) || 0, fill: 'hsl(var(--primary))' },
    { name: isHebrew ? 'תקשורת' : 'Communication', value: parseFloat(avg('communication_rating') as string) || 0, fill: 'hsl(var(--accent))' },
    { name: isHebrew ? 'תהליך' : 'Process', value: parseFloat(avg('process_rating') as string) || 0, fill: '#8B5CF6' },
  ];

  return (
    <div className="space-y-4" dir={isHebrew ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <div className="text-2xl font-bold">{avg('overall_rating')}</div>
            <p className="text-xs text-muted-foreground">{isHebrew ? 'חוויה כללית' : 'Overall'}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Star className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <div className="text-2xl font-bold">{avg('communication_rating')}</div>
            <p className="text-xs text-muted-foreground">{isHebrew ? 'תקשורת' : 'Communication'}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Star className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <div className="text-2xl font-bold">{avg('process_rating')}</div>
            <p className="text-xs text-muted-foreground">{isHebrew ? 'תהליך' : 'Process'}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <ThumbsUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <div className="text-2xl font-bold">{nps !== null ? `${nps}%` : '—'}</div>
            <p className="text-xs text-muted-foreground">NPS</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            {isHebrew ? `הערות אחרונות (${surveys.length} סקרים)` : `Recent Comments (${surveys.length} surveys)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {surveys.filter((s: any) => s.feedback_text).slice(0, 5).map((s: any, i: number) => (
            <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-foreground">{s.feedback_text}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">{s.overall_rating}/5 ⭐</Badge>
                <Badge variant="outline" className="text-xs capitalize">{s.trigger_event?.replace('_', ' ')}</Badge>
              </div>
            </div>
          ))}
          {surveys.filter((s: any) => !s.feedback_text).length > 0 && surveys.filter((s: any) => s.feedback_text).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">{isHebrew ? 'אין הערות טקסטואליות עדיין' : 'No text comments yet'}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
