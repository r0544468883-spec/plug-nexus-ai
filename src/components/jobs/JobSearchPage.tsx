import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { JobFilters, JobFiltersState } from './JobFilters';
import { JobCard } from './JobCard';
import { JobDetailsSheet } from './JobDetailsSheet';
import { ShareJobForm } from './ShareJobForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, Briefcase, Users, Share2, Sparkles, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const defaultFilters: JobFiltersState = {
  search: '',
  location: '',
  jobType: '',
  salaryRange: '',
  companySearch: '',
  category: '',
  fieldSlug: '',
  roleSlug: '',
  experienceLevelSlug: '',
  userLatitude: null,
  userLongitude: null,
  maxDistance: 25,
};

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

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
          company:companies(id, name, logo_url, description, website),
          sharer:profiles!jobs_shared_by_user_id_fkey(full_name),
          job_field:job_fields(id, slug, name_en, name_he),
          job_role:job_roles(id, slug, name_en, name_he),
          experience_level:experience_levels(id, slug, name_en, name_he)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Apply search filter
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // Apply location filter
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      // Apply job type filter
      if (filters.jobType) {
        query = query.eq('job_type', filters.jobType);
      }

      // Apply salary range filter
      if (filters.salaryRange && filters.salaryRange !== 'any') {
        query = query.eq('salary_range', filters.salaryRange);
      }

      // Apply field filter (hierarchical)
      if (filters.fieldSlug) {
        // Get field_id from slug
        const { data: fieldData } = await supabase
          .from('job_fields')
          .select('id')
          .eq('slug', filters.fieldSlug)
          .single();
        
        if (fieldData) {
          query = query.eq('field_id', fieldData.id);
        }
      }

      // Apply role filter (hierarchical)
      if (filters.roleSlug) {
        const { data: roleData } = await supabase
          .from('job_roles')
          .select('id')
          .eq('slug', filters.roleSlug)
          .single();
        
        if (roleData) {
          query = query.eq('role_id', roleData.id);
        }
      }

      // Apply experience level filter
      if (filters.experienceLevelSlug) {
        const { data: expData } = await supabase
          .from('experience_levels')
          .select('id')
          .eq('slug', filters.experienceLevelSlug)
          .single();
        
        if (expData) {
          query = query.eq('experience_level_id', expData.id);
        }
      }

      // Legacy category filter (backward compatibility)
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query.limit(50);
      
      if (error) throw error;

      let filteredData = data || [];

      // Client-side filter for company search
      if (filters.companySearch) {
        const searchLower = filters.companySearch.toLowerCase();
        filteredData = filteredData.filter(job => 
          (job.company as any)?.name?.toLowerCase().includes(searchLower)
        );
      }

      // Client-side filter for distance (GPS)
      if (filters.userLatitude && filters.userLongitude) {
        filteredData = filteredData.map(job => {
          const jobData = job as any;
          if (jobData.latitude && jobData.longitude) {
            const distance = calculateDistance(
              filters.userLatitude!,
              filters.userLongitude!,
              jobData.latitude,
              jobData.longitude
            );
            return { ...job, distance: Math.round(distance) };
          }
          return { ...job, distance: null };
        }).filter(job => {
          // Keep jobs without coordinates or within distance
          const jobData = job as any;
          return jobData.distance === null || jobData.distance <= filters.maxDistance;
        });
      }

      return filteredData;
    },
  });

  // Count community shared jobs
  const communityJobsCount = jobs.filter(j => j.is_community_shared).length;

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
      {/* Community Sharing Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isHebrew ? 'הכרת משרה טובה? שתף אותה עם הקהילה!' : 'Know a great job? Share it with the community!'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isHebrew 
                  ? 'כל משרה שתשתף תהיה זמינה לכל מחפשי העבודה במערכת' 
                  : 'Every job you share will be available to all job seekers'}
              </p>
            </div>
          </div>
          <ShareJobForm 
            trigger={
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg">
                <Share2 className="w-4 h-4" />
                {isHebrew ? 'שתף משרה עכשיו' : 'Share a Job Now'}
              </Button>
            }
          />
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Search className="w-6 h-6 text-primary" />
            {isHebrew ? 'חיפוש משרות' : 'Job Search'}
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            {isHebrew 
              ? `${jobs.length} משרות נמצאו` 
              : `${jobs.length} jobs found`}
            {communityJobsCount > 0 && (
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                <Users className="w-3 h-3" />
                {isHebrew 
                  ? `${communityJobsCount} משיתוף קהילתי`
                  : `${communityJobsCount} community shared`}
              </Badge>
            )}
            {filters.userLatitude && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="w-3 h-3" />
                {isHebrew ? 'מסונן לפי מיקום' : 'Filtered by location'}
              </Badge>
            )}
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
              isCommunityShared={job.is_community_shared}
              sharerName={(job as any).sharer?.full_name}
              distance={(job as any).distance}
              category={(job as any).category}
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
