import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationsStats } from './ApplicationsStats';
import { ApplicationsFilters, StatusFilter, StageFilter, SortOption } from './ApplicationsFilters';
import { ApplicationCard } from './ApplicationCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Loader2, Search, FolderOpen } from 'lucide-react';
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

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Fetch applications
  useEffect(() => {
    async function fetchApplications() {
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
    }

    fetchApplications();
  }, [user, t]);

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

    // Sort
    result.sort((a, b) => {
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
  const handleViewDetails = (id: string) => {
    toast.info(t('common.comingSoon') || 'Coming soon');
  };

  const handleWithdraw = async (id: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'withdrawn' })
        .eq('id', id)
        .eq('candidate_id', user?.id);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: 'withdrawn' } : app
        )
      );

      toast.success(
        language === 'he' ? 'המועמדות בוטלה' : 'Application withdrawn'
      );
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error(t('common.error') || 'Failed to withdraw application');
    }
  };

  const handleAddNote = (id: string) => {
    toast.info(t('common.comingSoon') || 'Coming soon');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-primary" />
          {t('dashboard.applications') || 'My Applications'}
        </h2>
        <Button className="gap-2" variant="outline">
          <Search className="w-4 h-4" />
          {t('actions.searchJobs') || 'Find Jobs'}
        </Button>
      </div>

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
                ? t('applications.noApplications') || 'No applications yet'
                : t('applications.noResults') || 'No matching applications'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {applications.length === 0
                ? t('applications.startSearching') || 'Start searching for jobs to apply'
                : t('applications.tryDifferentFilters') || 'Try adjusting your filters'}
            </p>
            {applications.length === 0 && (
              <Button className="gap-2">
                <Search className="w-4 h-4" />
                {t('actions.searchJobs') || 'Search Jobs'}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onViewDetails={handleViewDetails}
              onWithdraw={handleWithdraw}
              onAddNote={handleAddNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
