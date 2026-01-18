import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Clock, DollarSign, Building2, ExternalLink, Heart, Users, Navigation, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

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
}

interface JobCardProps {
  job: Job;
  onViewDetails: (job: Job) => void;
  onApply: (job: Job) => void;
  isCommunityShared?: boolean;
  sharerName?: string;
  distance?: number | null;
  category?: string | null;
}

const jobTypeLabels: Record<string, { en: string; he: string }> = {
  'full-time': { en: 'Full-time', he: 'משרה מלאה' },
  'part-time': { en: 'Part-time', he: 'חלקית' },
  'contract': { en: 'Contract', he: 'חוזה' },
  'freelance': { en: 'Freelance', he: 'פרילנס' },
  'internship': { en: 'Internship', he: 'התמחות' },
};

const categoryLabels: Record<string, { en: string; he: string }> = {
  'tech': { en: 'Technology', he: 'טכנולוגיה' },
  'marketing': { en: 'Marketing', he: 'שיווק' },
  'finance': { en: 'Finance', he: 'פיננסים' },
  'hr': { en: 'HR', he: 'משאבי אנוש' },
  'sales': { en: 'Sales', he: 'מכירות' },
  'design': { en: 'Design', he: 'עיצוב' },
  'operations': { en: 'Operations', he: 'תפעול' },
  'customer-service': { en: 'Customer Service', he: 'שירות לקוחות' },
  'other': { en: 'Other', he: 'אחר' },
};

export function JobCard({ job, onViewDetails, onApply, isCommunityShared, sharerName, distance, category }: JobCardProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const timeAgo = formatDistanceToNow(new Date(job.created_at), {
    addSuffix: true,
    locale: isHebrew ? he : enUS,
  });

  const jobTypeLabel = job.job_type && jobTypeLabels[job.job_type] 
    ? (isHebrew ? jobTypeLabels[job.job_type].he : jobTypeLabels[job.job_type].en)
    : job.job_type;

  const categoryLabel = category && categoryLabels[category]
    ? (isHebrew ? categoryLabels[category].he : categoryLabels[category].en)
    : category;

  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors plug-card-hover cursor-pointer group relative">
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
              <div className="pr-16">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {job.company?.name || (isHebrew ? 'חברה לא ידועה' : 'Unknown Company')}
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity absolute top-12 right-2"
                onClick={(e) => {
                  e.stopPropagation();
                  // Save job logic
                }}
              >
                <Heart className="w-4 h-4" />
              </Button>
            </div>

            {/* Description preview */}
            {job.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {job.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
              {/* Category Badge - Prominent */}
              {categoryLabel && (
                <Badge variant="outline" className="text-xs gap-1 bg-accent/10 border-accent/30 text-accent-foreground">
                  <Tag className="w-3 h-3" />
                  {categoryLabel}
                </Badge>
              )}

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

              {job.salary_range && (
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
