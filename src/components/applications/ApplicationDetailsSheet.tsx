import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  Building2, 
  ExternalLink, 
  Save, 
  XCircle,
  Loader2,
  Calendar,
  FileText,
  Sparkles,
  Globe,
  Linkedin,
  Github,
  Phone,
  MessageSquare,
  User,
  Download
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InterviewScheduler } from './InterviewScheduler';
import { HomeAssignmentTab } from './HomeAssignmentTab';
import { ApplicationPlugChat } from './ApplicationPlugChat';
import MatchScoreCircle from './MatchScoreCircle';
import { CandidateVouchBadge } from '@/components/vouch/CandidateVouchBadge';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';

interface ApplicationDetails {
  id: string;
  status: string;
  current_stage: string;
  match_score: number | null;
  created_at: string;
  notes: string | null;
  candidate_id?: string;
  job: {
    id: string;
    title: string;
    location: string | null;
    job_type: string | null;
    description: string | null;
    requirements: string | null;
    source_url: string | null;
    salary_range: string | null;
    company: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

interface ApplicationDetailsSheetProps {
  application: ApplicationDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ApplicationDetailsSheet({
  application,
  open,
  onOpenChange,
  onUpdate,
}: ApplicationDetailsSheetProps) {
  const { language } = useLanguage();
  const { role } = useAuth();
  const isRTL = language === 'he';
  const isRecruiter = role === 'freelance_hr' || role === 'inhouse_hr';

  const [currentStage, setCurrentStage] = useState(application?.current_stage || 'applied');
  const [notes, setNotes] = useState(application?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch candidate profile for recruiters
  const { data: candidateProfile } = useQuery({
    queryKey: ['candidate-profile', application?.candidate_id],
    queryFn: async () => {
      if (!application?.candidate_id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', application.candidate_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!application?.candidate_id && isRecruiter,
  });

  // Fetch candidate resume
  const { data: candidateResume } = useQuery({
    queryKey: ['candidate-resume', application?.candidate_id],
    queryFn: async () => {
      if (!application?.candidate_id) return null;
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', application.candidate_id)
        .eq('doc_type', 'resume')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!application?.candidate_id && isRecruiter,
  });

  // Reset state when application changes
  useEffect(() => {
    if (application) {
      setCurrentStage(application.current_stage);
      setNotes(application.notes || '');
      setHasChanges(false);
    }
  }, [application]);

  // Track changes
  useEffect(() => {
    if (application) {
      const stageChanged = currentStage !== application.current_stage;
      const notesChanged = notes !== (application.notes || '');
      setHasChanges(stageChanged || notesChanged);
    }
  }, [currentStage, notes, application]);

  const handleStageChange = (stage: string) => {
    setCurrentStage(stage);
  };

  const handleSave = async () => {
    if (!application) return;

    try {
      setIsSaving(true);

      const oldStage = application.current_stage;
      const oldNotes = application.notes || '';

      const updateData: any = {
        current_stage: currentStage,
        notes: notes || null,
        last_interaction: new Date().toISOString(),
      };

      // If rejected or withdrawn, update status too
      if (currentStage === 'rejected' || currentStage === 'withdrawn') {
        updateData.status = currentStage;
      } else if (currentStage === 'hired') {
        updateData.status = 'hired';
      } else {
        updateData.status = 'active';
      }

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', application.id);

      if (error) throw error;

      // Add timeline events for changes
      const timelineEvents = [];

      if (currentStage !== oldStage) {
        timelineEvents.push({
          application_id: application.id,
          event_type: 'stage_change',
          old_value: oldStage,
          new_value: currentStage,
        });
      }

      if (notes !== oldNotes && notes.trim()) {
        timelineEvents.push({
          application_id: application.id,
          event_type: 'note_added',
          new_value: notes.substring(0, 100),
        });
      }

      if (timelineEvents.length > 0) {
        await supabase.from('application_timeline').insert(timelineEvents);
      }

      toast.success(isRTL ? 'השינויים נשמרו' : 'Changes saved');
      setHasChanges(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving application:', error);
      toast.error(isRTL ? 'שגיאה בשמירה' : 'Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (!application) return;

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('applications')
        .update({
          status: 'withdrawn',
          current_stage: 'withdrawn',
          last_interaction: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (error) throw error;

      toast.success(isRTL ? 'המועמדות בוטלה' : 'Application withdrawn');
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error(isRTL ? 'שגיאה בביטול' : 'Error withdrawing');
    } finally {
      setIsSaving(false);
    }
  };

  if (!application) return null;

  const job = application.job;
  const company = job?.company;
  const timeAgo = formatDistanceToNow(new Date(application.created_at), {
    addSuffix: true,
    locale: isRTL ? he : enUS,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isRTL ? 'left' : 'right'} 
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader className="text-start" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-start gap-4">
            {/* Company Logo or Match Score */}
            {application.match_score ? (
              <MatchScoreCircle score={application.match_score} size="lg" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl mb-1">
                {job?.title || (isRTL ? 'משרה לא ידועה' : 'Unknown Job')}
              </SheetTitle>
              <p className="text-primary font-medium">
                {company?.name || (isRTL ? 'חברה לא ידועה' : 'Unknown Company')}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {job?.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
            )}
            {job?.job_type && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {job.job_type}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {timeAgo}
            </span>
          </div>

          {/* Candidate Vouches Badge */}
          <CandidateVouchBadge 
            candidateId={application.candidate_id || ''} 
            candidateName={candidateProfile?.full_name}
          />

          {/* Candidate Profile Section (for recruiters) */}
          {isRecruiter && candidateProfile && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {isRTL ? 'פרופיל מועמד' : 'Candidate Profile'}
                </h3>
                
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={candidateProfile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {candidateProfile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{candidateProfile.full_name}</p>
                    <p className="text-sm text-muted-foreground">{candidateProfile.email}</p>
                  </div>
                </div>

                {/* Bio */}
                {candidateProfile.bio && (
                  <p className="text-sm text-muted-foreground">
                    {candidateProfile.bio}
                  </p>
                )}

                {/* Professional Links */}
                <div className="flex flex-wrap gap-2">
                  {candidateProfile.portfolio_url && (
                    <a
                      href={candidateProfile.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <Globe className="h-3 w-3" />
                        Portfolio
                      </Badge>
                    </a>
                  )}
                  {candidateProfile.linkedin_url && (
                    <a
                      href={candidateProfile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                      </Badge>
                    </a>
                  )}
                  {candidateProfile.github_url && (
                    <a
                      href={candidateProfile.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <Github className="h-3 w-3" />
                        GitHub
                      </Badge>
                    </a>
                  )}
                </div>

                {/* Resume Download */}
                {candidateResume && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={async () => {
                      const { data } = await supabase.storage
                        .from('documents')
                        .createSignedUrl(candidateResume.file_path, 60);
                      if (data?.signedUrl) {
                        window.open(data.signedUrl, '_blank');
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    {isRTL ? 'הורד קורות חיים' : 'Download Resume'}
                  </Button>
                )}

                {/* Contact Buttons */}
                <div className="flex gap-2">
                  {candidateProfile.phone && candidateProfile.allow_recruiter_contact && (
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        const phone = candidateProfile.phone?.replace(/[^0-9+]/g, '');
                        const message = encodeURIComponent(
                          isRTL 
                            ? `שלום ${candidateProfile.full_name}, ראיתי את המועמדות שלך למשרת ${job?.title} ואשמח לשוחח איתך.`
                            : `Hi ${candidateProfile.full_name}, I saw your application for ${job?.title} and would love to chat with you.`
                        );
                        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                      }}
                    >
                      <Phone className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  )}
                  
                  <SendMessageDialog
                    toUserId={application.candidate_id || ''}
                    toUserName={candidateProfile.full_name}
                    relatedJobId={job?.id}
                    relatedApplicationId={application.id}
                    trigger={
                      <Button variant="outline" size="sm" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {isRTL ? 'שלח הודעה' : 'Send Message'}
                      </Button>
                    }
                  />
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Tabs for Status, Interviews, Home Assignment, Plug */}
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="status" className="text-xs">
                {isRTL ? 'סטטוס' : 'Status'}
              </TabsTrigger>
              <TabsTrigger value="interviews" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {isRTL ? 'ראיונות' : 'Interviews'}
              </TabsTrigger>
              <TabsTrigger value="assignment" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {isRTL ? 'מטלה' : 'Assignment'}
              </TabsTrigger>
              <TabsTrigger value="plug" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Plug
              </TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4 mt-4">
              {/* Status Select */}
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {isRTL ? 'סטטוס מועמדות' : 'Application Status'}
                </h3>
                <Select 
                  value={currentStage} 
                  onValueChange={handleStageChange}
                  disabled={isSaving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applied">
                      {isRTL ? 'הוגש' : 'Applied'}
                    </SelectItem>
                    <SelectItem value="screening">
                      {isRTL ? 'סינון' : 'Screening'}
                    </SelectItem>
                    <SelectItem value="interview">
                      {isRTL ? 'ראיון' : 'Interview'}
                    </SelectItem>
                    <SelectItem value="offer">
                      {isRTL ? 'הצעה' : 'Offer'}
                    </SelectItem>
                    <SelectItem value="hired">
                      {isRTL ? 'התקבל' : 'Hired'}
                    </SelectItem>
                    <SelectItem value="rejected">
                      {isRTL ? 'נדחה' : 'Rejected'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {isRTL ? 'הערות' : 'Notes'}
                </h3>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRTL ? 'הוסף הערות על המועמדות...' : 'Add notes about this application...'}
                  className="min-h-[100px] resize-none"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </TabsContent>

            <TabsContent value="interviews" className="mt-4">
              <InterviewScheduler
                applicationId={application.id}
                onInterviewScheduled={onUpdate}
              />
            </TabsContent>

            <TabsContent value="assignment" className="mt-4">
              <HomeAssignmentTab applicationId={application.id} />
            </TabsContent>

            <TabsContent value="plug" className="mt-4">
              <ApplicationPlugChat 
                applicationId={application.id}
                context={{
                  jobTitle: job?.title || '',
                  companyName: company?.name || '',
                  status: currentStage,
                  matchScore: application.match_score,
                  location: job?.location || null,
                  jobType: job?.job_type || null,
                }}
              />
            </TabsContent>
          </Tabs>

          {/* Job Description */}
          {job?.description && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {isRTL ? 'תיאור המשרה' : 'Job Description'}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
                  {job.description}
                </p>
              </div>
            </>
          )}

          {/* Source URL */}
          {job?.source_url && (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {isRTL ? 'צפה במשרה המקורית' : 'View Original Job Posting'}
            </a>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3 pb-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isRTL ? 'שמור שינויים' : 'Save Changes'}
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleWithdraw}
              disabled={isSaving || currentStage === 'withdrawn'}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {isRTL ? 'בטל מועמדות' : 'Withdraw'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
