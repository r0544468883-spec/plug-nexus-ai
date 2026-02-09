import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationsStats } from './ApplicationsStats';
import { ApplicationsFilters, StatusFilter, StageFilter, SortOption } from './ApplicationsFilters';
import { ApplicationsInsights } from './ApplicationsInsights';
import VerticalApplicationCard from './VerticalApplicationCard';
import AddApplicationForm from './AddApplicationForm';
import { ApplicationDetailsSheet } from './ApplicationDetailsSheet';
import PlugBubble from './PlugBubble';
import { EmptyApplicationsState } from './EmptyApplicationsState';
import { BulkImportDialog } from './BulkImportDialog';
import { CompanyVouchModal } from '@/components/vouch/CompanyVouchModal';
import { CompanyVouchToast } from '@/components/vouch/CompanyVouchToast';
import { useCompanyVouchPrompts } from '@/hooks/useCompanyVouchPrompts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Loader2, Sparkles, BarChart3, X, FileSpreadsheet } from 'lucide-react';
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
    description: string | null;
    requirements: string | null;
    source_url: string | null;
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
  const [showInsights, setShowInsights] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  // Sheet state
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Company vouch prompt state
  const [showVouchModal, setShowVouchModal] = useState(false);
  const [directVouchPrompt, setDirectVouchPrompt] = useState<{
    applicationId: string;
    companyId: string;
    companyName: string;
    triggerType: 'time_based' | 'stage_change' | 'completion';
    triggerStage?: string;
  } | null>(null);

  // Company vouch prompts hook (for time-based triggers)
  const { pendingPrompt, triggerStagePrompt, clearPrompt } = useCompanyVouchPrompts(applications);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Note: Explicitly exclude internal_notes from candidate queries for security
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
            description,
            requirements,
            source_url,
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
  const handleViewDetails = useCallback((application: Application) => {
    setSelectedApplication(application);
    setSheetOpen(true);
  }, []);

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

  const handleStageChange = useCallback(async (id: string, newStage: string) => {
    // Stages that trigger vouch prompts
    const VOUCH_STAGES = ['interview', 'technical', 'offer'];
    const COMPLETION_STAGES = ['hired', 'rejected', 'withdrawn'];

    try {
      const updateData: Record<string, string> = {
        current_stage: newStage,
        last_interaction: new Date().toISOString(),
      };

      // Update status based on stage
      if (newStage === 'rejected' || newStage === 'withdrawn') {
        updateData.status = newStage;
      } else if (newStage === 'hired') {
        updateData.status = 'hired';
      } else {
        updateData.status = 'active';
      }

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', id)
        .eq('candidate_id', user?.id);

      if (error) throw error;

      // Find the application to get company info
      const app = applications.find(a => a.id === id);

      // Update local state
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id 
            ? { ...a, current_stage: newStage, status: updateData.status } 
            : a
        )
      );

      toast.success(isRTL ? 'השלב עודכן' : 'Stage updated');
      
      // Show vouch modal directly for relevant stage changes
      if (app?.job?.company?.id) {
        if (COMPLETION_STAGES.includes(newStage)) {
          setDirectVouchPrompt({
            applicationId: id,
            companyId: app.job.company.id,
            companyName: app.job.company.name,
            triggerType: 'completion',
            triggerStage: newStage,
          });
          setShowVouchModal(true);
        } else if (VOUCH_STAGES.includes(newStage)) {
          setDirectVouchPrompt({
            applicationId: id,
            companyId: app.job.company.id,
            companyName: app.job.company.name,
            triggerType: 'stage_change',
            triggerStage: newStage,
          });
          setShowVouchModal(true);
        }
      }
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error(t('common.error') || 'Failed to update stage');
    }
  }, [user?.id, isRTL, t, applications]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id)
        .eq('candidate_id', user?.id);

      if (error) throw error;

      setApplications((prev) => prev.filter((app) => app.id !== id));
      toast.success(isRTL ? 'המועמדות נמחקה' : 'Application deleted');
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error(t('common.error') || 'Failed to delete application');
    }
  }, [user?.id, isRTL, t]);

  const handlePlugAction = useCallback((action: string) => {
    if (action === 'interview_prep') {
      toast.info(isRTL ? 'הכנה לראיון - בקרוב!' : 'Interview prep - Coming soon!');
    } else if (action === 'update_resume') {
      toast.info(isRTL ? 'עדכון קו"ח - בקרוב!' : 'Resume update - Coming soon!');
    }
  }, [isRTL]);

  // Note: PlugBubble now generates suggestions internally based on applications

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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="font-medium">
                {isRTL ? 'הדבק לינק ופלאג יעשה את השאר' : 'Paste a link and Plug will do the rest'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkImport(true)}
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isRTL ? 'יבוא מרובה' : 'Bulk Import'}
            </Button>
          </div>
          <AddApplicationForm onApplicationAdded={fetchApplications} />
        </CardContent>
      </Card>

      {/* Stats with Insights Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <ApplicationsStats {...stats} />
        </div>
        
        <Button
          variant={showInsights ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowInsights(!showInsights)}
          className="gap-2"
        >
          {showInsights ? (
            <>
              <X className="h-4 w-4" />
              {isRTL ? 'הסתר ניתוח' : 'Hide Insights'}
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4" />
              {isRTL ? 'הצג ניתוח מפורט' : 'Show Detailed Insights'}
            </>
          )}
        </Button>

        {showInsights && applications.length > 0 && (
          <ApplicationsInsights applications={applications} />
        )}
      </div>

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
        applications.length === 0 ? (
          <EmptyApplicationsState onNavigateToJobs={() => {
            // Navigate to job search - this is handled by parent Dashboard
            window.dispatchEvent(new CustomEvent('plug:navigate', { detail: 'job-search' }));
          }} />
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">
                {isRTL ? 'לא נמצאו תוצאות' : 'No matching applications'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isRTL ? 'נסה לשנות את הסינון' : 'Try adjusting your filters'}
              </p>
            </CardContent>
          </Card>
        )
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
                onViewDetails={() => handleViewDetails(application)}
                onWithdraw={() => handleWithdraw(application.id)}
                onStageChange={(stage) => handleStageChange(application.id, stage)}
                onDelete={() => handleDelete(application.id)}
              />
            )
          ))}
        </div>
      )}

      {/* Application Details Sheet */}
      <ApplicationDetailsSheet
        application={selectedApplication}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={fetchApplications}
      />

      {/* Plug AI Bubble */}
      <PlugBubble 
        applications={applications}
        onActionClick={handlePlugAction}
      />
      
      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onComplete={fetchApplications}
      />

      {/* Company Vouch Toast (notification) */}
      <CompanyVouchToast
        visible={!!pendingPrompt && !showVouchModal}
        companyName={pendingPrompt?.companyName || ''}
        reward={pendingPrompt?.triggerType === 'completion' ? 50 : 10}
        onAccept={() => setShowVouchModal(true)}
        onDismiss={clearPrompt}
      />

      {/* Company Vouch Modal - Direct from stage change */}
      {directVouchPrompt && (
        <CompanyVouchModal
          open={showVouchModal}
          onOpenChange={(open) => {
            setShowVouchModal(open);
            if (!open) setDirectVouchPrompt(null);
          }}
          applicationId={directVouchPrompt.applicationId}
          companyId={directVouchPrompt.companyId}
          companyName={directVouchPrompt.companyName}
          triggerType={directVouchPrompt.triggerType}
          triggerStage={directVouchPrompt.triggerStage}
          onComplete={() => {
            setDirectVouchPrompt(null);
            setShowVouchModal(false);
            fetchApplications();
          }}
        />
      )}

      {/* Company Vouch Modal - From time-based prompts */}
      {pendingPrompt && !directVouchPrompt && (
        <CompanyVouchModal
          open={showVouchModal && !directVouchPrompt}
          onOpenChange={(open) => {
            setShowVouchModal(open);
            if (!open) clearPrompt();
          }}
          applicationId={pendingPrompt.applicationId}
          companyId={pendingPrompt.companyId}
          companyName={pendingPrompt.companyName}
          triggerType={pendingPrompt.triggerType}
          triggerStage={pendingPrompt.triggerStage}
          onComplete={() => {
            clearPrompt();
            fetchApplications();
          }}
        />
      )}
    </div>
  );
}
