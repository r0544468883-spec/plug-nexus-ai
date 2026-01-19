import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';
import { VouchCard } from '@/components/vouch/VouchCard';
import { ApplicationDetailsSheet } from '@/components/applications/ApplicationDetailsSheet';

import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Globe,
  Linkedin,
  Github,
  Phone,
  Mail,
  MessageSquare,
  User,
  Briefcase,
  FileText,
  Download,
  Calendar,
  Building2,
  Eye,
  Clock,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Stage colors for application history
const stageColors: Record<string, string> = {
  applied: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  screening: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  interview: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  offer: 'bg-green-500/10 text-green-500 border-green-500/20',
  hired: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  withdrawn: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const stageLabels: Record<string, { en: string; he: string }> = {
  applied: { en: 'Applied', he: 'הוגש' },
  screening: { en: 'Screening', he: 'סינון' },
  interview: { en: 'Interview', he: 'ראיון' },
  offer: { en: 'Offer', he: 'הצעה' },
  hired: { en: 'Hired', he: 'התקבל' },
  rejected: { en: 'Rejected', he: 'נדחה' },
  withdrawn: { en: 'Withdrawn', he: 'בוטל' },
};

export default function CandidateProfile() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const isRecruiter = role === 'freelance_hr' || role === 'inhouse_hr';

  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [applicationSheetOpen, setApplicationSheetOpen] = useState(false);

  // Fetch candidate profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['candidate-full-profile', candidateId],
    queryFn: async () => {
      if (!candidateId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', candidateId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!candidateId && isRecruiter,
  });

  // Fetch career preferences (job fields, roles, experience level)
  const { data: careerPrefs } = useQuery({
    queryKey: ['candidate-career-prefs', candidateId, profile?.preferred_fields, profile?.preferred_roles, profile?.preferred_experience_level_id],
    queryFn: async () => {
      if (!profile) return null;

      const [fieldsResult, rolesResult, expResult] = await Promise.all([
        profile.preferred_fields?.length 
          ? supabase.from('job_fields').select('id, name_en, name_he').in('id', profile.preferred_fields)
          : { data: [] },
        profile.preferred_roles?.length
          ? supabase.from('job_roles').select('id, name_en, name_he').in('id', profile.preferred_roles)
          : { data: [] },
        profile.preferred_experience_level_id
          ? supabase.from('experience_levels').select('id, name_en, name_he').eq('id', profile.preferred_experience_level_id).maybeSingle()
          : { data: null },
      ]);

      return {
        fields: fieldsResult.data || [],
        roles: rolesResult.data || [],
        experienceLevel: expResult.data,
      };
    },
    enabled: !!profile,
  });

  // Fetch applications history (only for recruiter's jobs)
  const { data: applications = [], refetch: refetchApplications } = useQuery({
    queryKey: ['candidate-applications-history', candidateId, user?.id],
    queryFn: async () => {
      if (!candidateId || !user?.id) return [];

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          current_stage,
          match_score,
          created_at,
          updated_at,
          notes,
          candidate_id,
          job:jobs (
            id,
            title,
            location,
            job_type,
            description,
            requirements,
            source_url,
            salary_range,
            company:companies (
              id,
              name,
              logo_url
            )
          )
        `)
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!candidateId && !!user?.id && isRecruiter,
  });

  // Fetch documents (resume and home assignments)
  const { data: documents = [] } = useQuery({
    queryKey: ['candidate-documents', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', candidateId)
        .in('doc_type', ['resume', 'cover_letter'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!candidateId && isRecruiter,
  });

  // Fetch home assignments for recruiter's job applications
  const { data: homeAssignments = [] } = useQuery({
    queryKey: ['candidate-home-assignments', candidateId, applications],
    queryFn: async () => {
      if (!applications.length) return [];
      
      const applicationIds = applications.map(a => a.id);
      
      const { data, error } = await supabase
        .from('home_assignments')
        .select('*')
        .in('application_id', applicationIds)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: applications.length > 0 && isRecruiter,
  });

  // Fetch vouches
  const { data: vouches = [] } = useQuery({
    queryKey: ['candidate-vouches', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];

      const { data, error } = await supabase
        .from('vouches')
        .select(`
          id,
          from_user_id,
          vouch_type,
          relationship,
          message,
          skills,
          created_at,
          is_public
        `)
        .eq('to_user_id', candidateId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for vouch senders
      if (data?.length) {
        const senderIds = [...new Set(data.map(v => v.from_user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', senderIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        return data.map(vouch => ({
          ...vouch,
          from_profile: profileMap.get(vouch.from_user_id) || null,
        }));
      }

      return data || [];
    },
    enabled: !!candidateId && isRecruiter,
  });

  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage
      .from('resumes')
      .createSignedUrl(filePath, 60);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleDownloadAssignment = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('home-assignments')
      .createSignedUrl(filePath, 60);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const openWhatsApp = () => {
    if (!profile?.phone) return;
    const phone = profile.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      isHebrew
        ? `שלום ${profile.full_name}, אני מגייס/ת ואשמח לשוחח איתך על הזדמנויות תעסוקה.`
        : `Hi ${profile.full_name}, I'm a recruiter and would love to discuss job opportunities with you.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  // Access check
  if (!isRecruiter) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isHebrew ? 'אין גישה' : 'Access Denied'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isHebrew 
                ? 'רק מגייסים יכולים לצפות בפרופילי מועמדים'
                : 'Only recruiters can view candidate profiles'}
            </p>
            <Button onClick={() => navigate('/')}>
              {isHebrew ? 'חזרה לדף הבית' : 'Back to Home'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8" dir={isHebrew ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isHebrew ? 'מועמד לא נמצא' : 'Candidate Not Found'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isHebrew 
                ? 'לא הצלחנו למצוא את המועמד המבוקש'
                : 'We could not find the requested candidate'}
            </p>
            <Button onClick={() => navigate(-1)}>
              {isHebrew ? 'חזרה' : 'Go Back'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <BackIcon className="w-4 h-4" />
          {isHebrew ? 'חזרה' : 'Back'}
        </Button>

        {/* Profile Header */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              <Avatar className="w-24 h-24 flex-shrink-0">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                    <p className="text-muted-foreground">{profile.email}</p>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {vouches.length > 0 && (
                      <Badge variant="outline" className="gap-1 border-pink-500/20 text-pink-500">
                        <Heart className="w-3 h-3" />
                        {vouches.length} {isHebrew ? 'המלצות' : 'vouches'}
                      </Badge>
                    )}
                    {profile.visible_to_hr && (
                      <Badge variant="outline" className="gap-1 border-green-500/20 text-green-600">
                        <Eye className="w-3 h-3" />
                        {isHebrew ? 'גלוי למגייסים' : 'Visible to HR'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                )}

                {/* Professional Links */}
                <div className="flex items-center gap-2 flex-wrap">
                  {profile.portfolio_url && (
                    <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <Globe className="h-3 w-3" />
                        Portfolio
                      </Badge>
                    </a>
                  )}
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                      </Badge>
                    </a>
                  )}
                  {profile.github_url && (
                    <a href={profile.github_url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <Github className="h-3 w-3" />
                        GitHub
                      </Badge>
                    </a>
                  )}
                </div>

                {/* Contact Actions */}
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  {profile.phone && profile.allow_recruiter_contact && (
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2 bg-green-600 hover:bg-green-700"
                      onClick={openWhatsApp}
                    >
                      <Phone className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  )}
                  
                  <SendMessageDialog
                    toUserId={candidateId || ''}
                    toUserName={profile.full_name}
                    trigger={
                      <Button variant="outline" size="sm" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {isHebrew ? 'שלח הודעה' : 'Send Message'}
                      </Button>
                    }
                  />

                  {profile.email && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => window.open(`mailto:${profile.email}`, '_blank')}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-1">
              <User className="w-4 h-4 hidden sm:inline" />
              {isHebrew ? 'סקירה' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <Briefcase className="w-4 h-4 hidden sm:inline" />
              {isHebrew ? 'היסטוריה' : 'History'}
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1">
              <FileText className="w-4 h-4 hidden sm:inline" />
              {isHebrew ? 'מסמכים' : 'Documents'}
            </TabsTrigger>
            <TabsTrigger value="vouches" className="gap-1">
              <Heart className="w-4 h-4 hidden sm:inline" />
              {isHebrew ? 'המלצות' : 'Vouches'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Career Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  {isHebrew ? 'העדפות קריירה' : 'Career Preferences'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preferred Fields */}
                {careerPrefs?.fields && careerPrefs.fields.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {isHebrew ? 'תחומים מועדפים' : 'Preferred Fields'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {careerPrefs.fields.map((field: any) => (
                        <Badge key={field.id} variant="secondary">
                          {isHebrew ? field.name_he : field.name_en}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preferred Roles */}
                {careerPrefs?.roles && careerPrefs.roles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {isHebrew ? 'תפקידים מועדפים' : 'Preferred Roles'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {careerPrefs.roles.map((role: any) => (
                        <Badge key={role.id} variant="outline">
                          {isHebrew ? role.name_he : role.name_en}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience Level */}
                {careerPrefs?.experienceLevel && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {isHebrew ? 'רמת ותק' : 'Experience Level'}
                    </h4>
                    <Badge variant="outline" className="bg-primary/5">
                      {isHebrew ? careerPrefs.experienceLevel.name_he : careerPrefs.experienceLevel.name_en}
                    </Badge>
                  </div>
                )}

                {/* Experience Years */}
                {profile.experience_years != null && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {isHebrew ? 'שנות ניסיון' : 'Years of Experience'}
                    </h4>
                    <p className="text-sm">{profile.experience_years} {isHebrew ? 'שנים' : 'years'}</p>
                  </div>
                )}

                {!careerPrefs?.fields?.length && !careerPrefs?.roles?.length && !careerPrefs?.experienceLevel && profile.experience_years == null && (
                  <p className="text-sm text-muted-foreground">
                    {isHebrew ? 'המועמד טרם הגדיר העדפות קריירה' : 'Candidate has not set career preferences yet'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Briefcase className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{applications.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {isHebrew ? 'מועמדויות' : 'Applications'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-pink-500" />
                  <p className="text-2xl font-bold">{vouches.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {isHebrew ? 'המלצות' : 'Vouches'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{documents.length + homeAssignments.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {isHebrew ? 'מסמכים' : 'Documents'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(profile.created_at), {
                      locale: isHebrew ? he : enUS,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isHebrew ? 'בפלטפורמה' : 'On platform'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  {isHebrew ? 'היסטוריית מועמדויות' : 'Application History'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {isHebrew 
                        ? 'אין מועמדויות למשרות שלך'
                        : 'No applications to your jobs yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app: any) => (
                      <Card 
                        key={app.id} 
                        className="hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedApplication(app);
                          setApplicationSheetOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Company Logo */}
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              {app.job?.company?.logo_url ? (
                                <img 
                                  src={app.job.company.logo_url} 
                                  alt={app.job.company.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                              ) : (
                                <Building2 className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>

                            {/* Job Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{app.job?.title || 'Unknown Job'}</h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {app.job?.company?.name || 'Unknown Company'}
                              </p>
                            </div>

                            {/* Stage & Score */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {app.match_score && (
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-bold text-primary">{app.match_score}%</span>
                                </div>
                              )}
                              <Badge
                                variant="outline"
                                className={cn('border', stageColors[app.current_stage] || stageColors.applied)}
                              >
                                {stageLabels[app.current_stage]?.[isHebrew ? 'he' : 'en'] || app.current_stage}
                              </Badge>
                            </div>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(app.created_at), {
                              addSuffix: true,
                              locale: isHebrew ? he : enUS,
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6 space-y-6">
            {/* Resume */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {isHebrew ? 'קורות חיים' : 'Resume'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.filter(d => d.doc_type === 'resume').length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {isHebrew ? 'לא הועלו קורות חיים' : 'No resume uploaded'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.filter(d => d.doc_type === 'resume').map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(doc.created_at), {
                                addSuffix: true,
                                locale: isHebrew ? he : enUS,
                              })}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 flex-shrink-0"
                          onClick={() => handleDownloadDocument(doc.file_path, doc.file_name)}
                        >
                          <Download className="w-4 h-4" />
                          {isHebrew ? 'הורד' : 'Download'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Home Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  {isHebrew ? 'מטלות בית' : 'Home Assignments'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {homeAssignments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {isHebrew ? 'לא הוגשו מטלות בית' : 'No home assignments submitted'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {homeAssignments.map((assignment) => {
                      const relatedApp = applications.find(a => a.id === assignment.application_id);
                      return (
                        <div 
                          key={assignment.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{assignment.file_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {relatedApp?.job?.title || 'Unknown job'} • {formatDistanceToNow(new Date(assignment.uploaded_at), {
                                  addSuffix: true,
                                  locale: isHebrew ? he : enUS,
                                })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 flex-shrink-0"
                            onClick={() => handleDownloadAssignment(assignment.file_path)}
                          >
                            <Download className="w-4 h-4" />
                            {isHebrew ? 'הורד' : 'Download'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vouches Tab */}
          <TabsContent value="vouches" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  {isHebrew ? 'המלצות' : 'Vouches'} ({vouches.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vouches.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {isHebrew ? 'אין המלצות עדיין' : 'No vouches yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vouches.map((vouch) => (
                      <VouchCard key={vouch.id} vouch={vouch} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Application Details Sheet */}
      <ApplicationDetailsSheet
        application={selectedApplication}
        open={applicationSheetOpen}
        onOpenChange={setApplicationSheetOpen}
        onUpdate={() => refetchApplications()}
      />
    </div>
  );
}
