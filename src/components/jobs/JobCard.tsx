import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Clock, DollarSign, Building2, ExternalLink, Heart, Users, Navigation, Layers, GraduationCap, Briefcase } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { useSavedJobs, useSaveJobMutation } from '@/hooks/useSavedJobs';
import { useMatchScore } from '@/hooks/useMatchScore';

interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  created_at: string;
  company?: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  job_field?: {
    id: string;
    slug: string;
    name_en: string;
    name_he: string;
  } | null;
  job_role?: {
    id: string;
    slug: string;
    name_en: string;
    name_he: string;
  } | null;
  experience_level?: {
    id: string;
    slug: string;
    name_en: string;
    name_he: string;
  } | null;
}

interface JobCardProps {
  job: Job;
  onViewDetails: (job: Job) => void;
  onApply: (job: Job) => void;
  isCommunityShared?: boolean;
  sharerName?: string;
  distance?: number | null;
  category?: string | null;
  matchScore?: number | null;
}

const jobTypeLabels: Record<string, { en: string; he: string }> = {
  'full-time': { en: 'Full-time', he: 'משרה מלאה' },
  'part-time': { en: 'Part-time', he: 'חלקית' },
  'contract': { en: 'Contract', he: 'חוזה' },
  'freelance': { en: 'Freelance', he: 'פרילנס' },
  'internship': { en: 'Internship', he: 'התמחות' },
};

const fieldColors: Record<string, string> = {
  'tech': 'bg-blue-500/20 text-blue-700 border-blue-500/30 dark:text-blue-300',
  'marketing': 'bg-pink-500/20 text-pink-700 border-pink-500/30 dark:text-pink-300',
  'sales': 'bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-300',
  'finance': 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30 dark:text-yellow-300',
  'engineering': 'bg-orange-500/20 text-orange-700 border-orange-500/30 dark:text-orange-300',
  'hr': 'bg-purple-500/20 text-purple-700 border-purple-500/30 dark:text-purple-300',
  'management': 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30 dark:text-indigo-300',
  'customer-service': 'bg-teal-500/20 text-teal-700 border-teal-500/30 dark:text-teal-300',
  'design': 'bg-rose-500/20 text-rose-700 border-rose-500/30 dark:text-rose-300',
  'data': 'bg-cyan-500/20 text-cyan-700 border-cyan-500/30 dark:text-cyan-300',
  'healthcare': 'bg-red-500/20 text-red-700 border-red-500/30 dark:text-red-300',
  'education': 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
  'legal': 'bg-slate-500/20 text-slate-700 border-slate-500/30 dark:text-slate-300',
};

const expLevelColors: Record<string, string> = {
  'entry': 'bg-green-500/20 text-green-700 border-green-500/30 dark:text-green-300',
  'junior': 'bg-blue-500/20 text-blue-700 border-blue-500/30 dark:text-blue-300',
  'mid': 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30 dark:text-yellow-300',
  'senior': 'bg-orange-500/20 text-orange-700 border-orange-500/30 dark:text-orange-300',
  'lead': 'bg-purple-500/20 text-purple-700 border-purple-500/30 dark:text-purple-300',
  'executive': 'bg-red-500/20 text-red-700 border-red-500/30 dark:text-red-300',
};

export function JobCard({ job, onViewDetails, onApply, isCommunityShared, sharerName, distance, category, matchScore: propMatchScore }: JobCardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  // Use hook for match score calculation
  const calculatedMatchScore = useMatchScore(job);
  const displayMatchScore = propMatchScore ?? calculatedMatchScore;

  // Saved jobs functionality
  const { data: savedJobIds = [] } = useSavedJobs();
  const saveJobMutation = useSaveJobMutation();
  const isSaved = savedJobIds.includes(job.id);

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    saveJobMutation.mutate({ jobId: job.id, isSaved });
  };

  const timeAgo = formatDistanceToNow(new Date(job.created_at), {
    addSuffix: true,
    locale: isHebrew ? he : enUS,
  });

  const jobTypeLabel = job.job_type && jobTypeLabels[job.job_type] 
    ? (isHebrew ? jobTypeLabels[job.job_type].he : jobTypeLabels[job.job_type].en)
    : job.job_type;

  const fieldSlug = job.job_field?.slug || category;
  const fieldName = job.job_field 
    ? (isHebrew ? job.job_field.name_he : job.job_field.name_en)
    : null;

  const roleName = job.job_role
    ? (isHebrew ? job.job_role.name_he : job.job_role.name_en)
    : null;

  const expLevelName = job.experience_level
    ? (isHebrew ? job.experience_level.name_he : job.experience_level.name_en)
    : null;

  const expLevelSlug = job.experience_level?.slug;

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors plug-card-hover cursor-pointer group relative">
      {/* Match Score Badge - Top Left */}
      {displayMatchScore > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <Badge className={`gap-1 shadow-lg ${displayMatchScore >= 85 ? 'bg-green-500 text-white' : displayMatchScore >= 60 ? 'bg-yellow-500 text-white' : 'bg-muted text-muted-foreground'}`}>
            {displayMatchScore}% {isHebrew ? 'התאמה' : 'Match'}
          </Badge>
        </div>
      )}

      {/* Community Badge - Top Right */}
      {isCommunityShared && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="gap-1 bg-primary/90 text-primary-foreground shadow-lg">
            <Users className="w-3 h-3" />
            {isHebrew ? 'קהילתי' : 'Community'}
          </Badge>
        </div>
      )}

      <CardContent className="p-4" onClick={() => onViewDetails(job)}>
        <div className="flex gap-4">
          {/* Company Logo */}
          <Avatar className="w-12 h-12 rounded-lg flex-shrink-0">
            <AvatarImage src={job.company?.logo_url || undefined} />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
              <Building2 className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className={isCommunityShared || displayMatchScore > 0 ? 'pr-16' : ''}>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {job.company?.name || (isHebrew ? 'חברה לא ידועה' : 'Unknown Company')}
                </p>
              </div>
              
              {user && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`flex-shrink-0 transition-all absolute top-12 right-2 ${isSaved ? 'opacity-100 text-red-500' : 'opacity-0 group-hover:opacity-100'}`}
                  onClick={handleSaveClick}
                  disabled={saveJobMutation.isPending}
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
              )}
            </div>

            {/* Taxonomy Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {/* Field Badge */}
              {fieldName && (
                <Badge 
                  variant="outline" 
                  className={`text-xs gap-1 ${fieldSlug && fieldColors[fieldSlug] ? fieldColors[fieldSlug] : 'bg-accent/10 text-accent-foreground'}`}
                >
                  <Layers className="w-3 h-3" />
                  {fieldName}
                </Badge>
              )}

              {/* Role Badge */}
              {roleName && (
                <Badge variant="outline" className="text-xs gap-1 bg-secondary/50 text-secondary-foreground">
                  <Briefcase className="w-3 h-3" />
                  {roleName}
                </Badge>
              )}

              {/* Experience Level Badge */}
              {expLevelName && (
                <Badge 
                  variant="outline" 
                  className={`text-xs gap-1 ${expLevelSlug && expLevelColors[expLevelSlug] ? expLevelColors[expLevelSlug] : 'bg-muted text-muted-foreground'}`}
                >
                  <GraduationCap className="w-3 h-3" />
                  {expLevelName}
                </Badge>
              )}
            </div>

            {/* Description preview */}
            {job.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {job.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {job.location}
                </span>
              )}

              {/* Distance Badge */}
              {distance !== undefined && distance !== null && (
                <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
                  <Navigation className="w-3 h-3" />
                  {distance} {isHebrew ? 'ק"מ' : 'km'}
                </Badge>
              )}

              {jobTypeLabel && (
                <Badge variant="secondary" className="text-xs">
                  {jobTypeLabel}
                </Badge>
              )}

              {job.salary_range && job.salary_range !== 'null' && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {job.salary_range}
                </span>
              )}

              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {timeAgo}
              </span>
            </div>

            {/* Sharer info */}
            {isCommunityShared && sharerName && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {isHebrew ? `שותף על ידי ${sharerName}` : `Shared by ${sharerName}`}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(job);
                }}
              >
                {isHebrew ? 'הגש מועמדות' : 'Apply Now'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(job);
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
