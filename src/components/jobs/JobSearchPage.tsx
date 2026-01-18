import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { JobFilters, JobFiltersState } from './JobFilters';
import { JobCard } from './JobCard';
import { JobDetailsSheet } from './JobDetailsSheet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Briefcase, Plus } from 'lucide-react';
import { toast } from 'sonner';

const defaultFilters: JobFiltersState = {
  search: '',
  location: '',
  jobType: '',
  salaryMin: 0,
  salaryMax: 100000,
};

export function JobSearchPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<JobFiltersState>(defaultFilters);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch jobs with filters
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          company:companies(id, name, logo_url, description, website)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters.jobType) {
        query = query.eq('job_type', filters.jobType);
      }

      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('applications')
        .insert({
          job_id: jobId,
          candidate_id: user!.id,
          status: 'active',
          current_stage: 'applied',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'המועמדות הוגשה בהצלחה!' : 'Application submitted!');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDetailsOpen(false);
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error(isHebrew ? 'כבר הגשת מועמדות למשרה זו' : 'You already applied to this job');
      } else {
        toast.error(isHebrew ? 'שגיאה בהגשת המועמדות' : 'Failed to apply');
      }
    },
  });

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
    setDetailsOpen(true);
  };

  const handleApply = (job: any) => {
    if (!user) {
      toast.error(isHebrew ? 'יש להתחבר כדי להגיש מועמדות' : 'Please sign in to apply');
      return;
    }
    applyMutation.mutate(job.id);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Search className="w-6 h-6 text-primary" />
            {isHebrew ? 'חיפוש משרות' : 'Job Search'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isHebrew 
              ? `${jobs.length} משרות נמצאו` 
              : `${jobs.length} jobs found`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <JobFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Job List */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {isHebrew ? 'לא נמצאו משרות' : 'No jobs found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isHebrew 
                ? 'נסה לשנות את הפילטרים או לחפש מונח אחר'
                : 'Try adjusting your filters or search term'}
            </p>
            <Button variant="outline" onClick={handleClearFilters}>
              {isHebrew ? 'נקה פילטרים' : 'Clear filters'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onViewDetails={handleViewDetails}
              onApply={handleApply}
            />
          ))}
        </div>
      )}

      {/* Job Details Sheet */}
      <JobDetailsSheet
        job={selectedJob}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onApply={handleApply}
      />
    </div>
  );
}
