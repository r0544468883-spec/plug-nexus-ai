import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationsStats } from './ApplicationsStats';
import { ApplicationsFilters, StatusFilter, StageFilter, SortOption } from './ApplicationsFilters';
import VerticalApplicationCard from './VerticalApplicationCard';
import AddApplicationForm from './AddApplicationForm';
import PlugBubble from './PlugBubble';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Loader2, Link2, FolderOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Application {
  id: string;
  status: string;
  current_stage: string;
  match_score: number | null;
  created_at: string;
  last_interaction: string;
  notes: string | null;
  job: {
    id: string;
    title: string;
    location: string | null;
    job_type: string | null;
    salary_range: string | null;
    company: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

export function ApplicationsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          current_stage,
          match_score,
          created_at,
          last_interaction,
          notes,
          job:jobs (
            id,
            title,
            location,
            job_type,
            salary_range,
            company:companies (
              id,
              name,
              logo_url
            )
          )
        `)
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = (data || []).map((app: any) => ({
        ...app,
        job: app.job ? {
          ...app.job,
          company: Array.isArray(app.job.company) ? app.job.company[0] : app.job.company
        } : null
      }));

      setApplications(transformedData);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error(t('common.error') || 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter((a) => a.status === 'active').length;
    const interviews = applications.filter((a) => 
      ['interview', 'technical'].includes(a.current_stage || '')
    ).length;
    const rejected = applications.filter((a) => 
      a.current_stage === 'rejected' || a.status === 'rejected'
    ).length;

    return { total, active, interviews, rejected };
  }, [applications]);

  // Filtered and sorted applications
  const filteredApplications = useMemo(() => {
    let result = [...applications];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((app) =>
        app.job?.title?.toLowerCase().includes(searchLower) ||
        app.job?.company?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((app) => app.status === statusFilter);
    }

    // Stage filter
    if (stageFilter !== 'all') {
      result = result.filter((app) => app.current_stage === stageFilter);
    }

    // Sort - prioritize interviews first, then by selected sort
    result.sort((a, b) => {
      // Urgent items first (interviews)
      const aUrgent = a.current_stage === 'interview' ? 1 : 0;
      const bUrgent = b.current_stage === 'interview' ? 1 : 0;
      if (bUrgent !== aUrgent) return bUrgent - aUrgent;

      // Then by selected sort
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'match_score') {
        return (b.match_score || 0) - (a.match_score || 0);
      }
      return 0;
    });

    return result;
  }, [applications, search, statusFilter, stageFilter, sortBy]);

  // Handlers
  const handleViewDetails = useCallback((id: string) => {
    toast.info(t('common.comingSoon') || 'Coming soon');
  }, [t]);

  const handleWithdraw = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'withdrawn', current_stage: 'withdrawn' })
        .eq('id', id)
        .eq('candidate_id', user?.id);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: 'withdrawn', current_stage: 'withdrawn' } : app
        )
      );

      toast.success(isRTL ? 'המועמדות בוטלה' : 'Application withdrawn');
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error(t('common.error') || 'Failed to withdraw application');
    }
  }, [user?.id, isRTL, t]);

  const handlePlugAction = useCallback((action: string) => {
    if (action === 'interview_prep') {
      toast.info(isRTL ? 'הכנה לראיון - בקרוב!' : 'Interview prep - Coming soon!');
    } else if (action === 'update_resume') {
      toast.info(isRTL ? 'עדכון קו"ח - בקרוב!' : 'Resume update - Coming soon!');
    }
  }, [isRTL]);

  // Generate AI suggestions based on applications
  const plugSuggestions = useMemo(() => {
    const suggestions = [];
    
    // Find high match application
    const highMatch = applications.find(a => (a.match_score || 0) >= 80);
    if (highMatch) {
      suggestions.push({
        id: 'high-match',
        message: isRTL 
          ? `היי! ראיתי ${highMatch.match_score}% התאמה ל${highMatch.job?.company?.name}. רוצה שאכין אותך לראיון?`
          : `Hey! I see ${highMatch.match_score}% match for ${highMatch.job?.company?.name}. Want me to prep you for the interview?`,
        action: 'interview_prep',
        priority: 'high' as const,
      });
    }

    // Find interview stage
    const hasInterview = applications.find(a => a.current_stage === 'interview');
    if (hasInterview) {
      suggestions.push({
        id: 'interview',
        message: isRTL
          ? `יש לך ראיון ב-${hasInterview.job?.company?.name}! בוא נתרגל שאלות נפוצות`
          : `You have an interview at ${hasInterview.job?.company?.name}! Let's practice common questions`,
        action: 'interview_prep',
        priority: 'high' as const,
      });
    }

    return suggestions;
  }, [applications, isRTL]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Briefcase className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">
          {t('dashboard.applications') || 'My Applications'}
        </h2>
      </div>

      {/* Add Application Form - Always Visible */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="font-medium">
              {isRTL ? 'הדבק לינק ופלאג יעשה את השאר' : 'Paste a link and Plug will do the rest'}
            </span>
          </div>
          <AddApplicationForm onApplicationAdded={fetchApplications} />
        </CardContent>
      </Card>

      {/* Stats */}
      <ApplicationsStats {...stats} />

      {/* Filters */}
      <ApplicationsFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        stageFilter={stageFilter}
        onStageChange={setStageFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {applications.length === 0
                ? (isRTL ? 'עדיין אין מועמדויות' : 'No applications yet')
                : (isRTL ? 'לא נמצאו תוצאות' : 'No matching applications')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {applications.length === 0
                ? (isRTL ? 'הדבק לינק למשרה והתחל!' : 'Paste a job link to get started!')
                : (isRTL ? 'נסה לשנות את הסינון' : 'Try adjusting your filters')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((application) => (
            application.job && (
              <VerticalApplicationCard
                key={application.id}
                application={{
                  ...application,
                  job: {
                    ...application.job,
                    company: application.job.company || null
                  },
                  hasUpcomingInterview: application.current_stage === 'interview',
                }}
                onViewDetails={() => handleViewDetails(application.id)}
                onWithdraw={() => handleWithdraw(application.id)}
              />
            )
          ))}
        </div>
      )}

      {/* Plug AI Bubble */}
      <PlugBubble 
        suggestions={plugSuggestions}
        onActionClick={handlePlugAction}
      />
    </div>
  );
}
