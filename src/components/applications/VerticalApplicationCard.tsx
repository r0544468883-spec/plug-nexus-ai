import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { MapPin, Briefcase, Clock, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import MatchScoreCircle from './MatchScoreCircle';
import SwipeableCard from './SwipeableCard';
import { useIsMobile } from '@/hooks/use-mobile';

export interface Application {
  id: string;
  status: string;
  current_stage: string;
  match_score: number | null;
  created_at: string;
  notes: string | null;
  job: {
    id: string;
    title: string;
    location: string | null;
    job_type: string | null;
    company: {
      name: string;
      logo_url: string | null;
    } | null;
  };
  hasUpcomingInterview?: boolean;
  interviewDate?: Date;
}

interface VerticalApplicationCardProps {
  application: Application;
  onViewDetails: () => void;
  onWithdraw: () => void;
}

const stageConfig: Record<string, { label: { en: string; he: string }; color: string }> = {
  applied: { 
    label: { en: 'Applied', he: 'הוגש' }, 
    color: 'bg-secondary text-secondary-foreground' 
  },
  screening: { 
    label: { en: 'Screening', he: 'סינון' }, 
    color: 'bg-blue-500/20 text-blue-400' 
  },
  interview: { 
    label: { en: 'Interview', he: 'ראיון' }, 
    color: 'bg-accent/20 text-accent' 
  },
  offer: { 
    label: { en: 'Offer', he: 'הצעה' }, 
    color: 'bg-primary/20 text-primary' 
  },
  rejected: { 
    label: { en: 'Rejected', he: 'נדחה' }, 
    color: 'bg-destructive/20 text-destructive' 
  },
  withdrawn: { 
    label: { en: 'Withdrawn', he: 'נמשך' }, 
    color: 'bg-muted text-muted-foreground' 
  },
};

const VerticalApplicationCard = ({
  application,
  onViewDetails,
  onWithdraw,
}: VerticalApplicationCardProps) => {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const isRTL = language === 'he';

  const stage = stageConfig[application.current_stage] || stageConfig.applied;
  const timeAgo = formatDistanceToNow(new Date(application.created_at), {
    addSuffix: true,
    locale: isRTL ? he : enUS,
  });

  // Check if interview is upcoming (today or tomorrow)
  const isUrgent = application.hasUpcomingInterview || application.current_stage === 'interview';

  const cardContent = (
    <Card 
      className={`overflow-hidden transition-all cursor-pointer hover:border-primary/30 ${
        isUrgent ? 'plug-urgent-glow' : ''
      }`}
      onClick={!isMobile ? onViewDetails : undefined}
    >
      <CardContent className="p-4">
        <div className="flex gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Company Logo / Match Score */}
          <div className="flex-shrink-0">
            {application.match_score ? (
              <MatchScoreCircle score={application.match_score} size="md" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title & Company */}
            <div>
              <h3 className="font-semibold text-foreground truncate">
                {application.job.title}
              </h3>
              <p className="text-sm text-primary font-medium">
                {application.job.company?.name || (isRTL ? 'חברה לא ידועה' : 'Unknown Company')}
              </p>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {application.job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {application.job.location}
                </span>
              )}
              {application.job.job_type && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {application.job.job_type}
                </span>
              )}
            </div>

            {/* Stage & Time */}
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className={stage.color}>
                {isRTL ? stage.label.he : stage.label.en}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
            </div>
          </div>
        </div>

        {/* Notes preview */}
        {application.notes && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground line-clamp-1" dir={isRTL ? 'rtl' : 'ltr'}>
              📝 {application.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // On mobile, wrap with swipeable
  if (isMobile) {
    return (
      <SwipeableCard
        onSwipeRight={onViewDetails}
        onSwipeLeft={onWithdraw}
        rightLabel={isRTL ? 'צפייה' : 'View'}
        leftLabel={isRTL ? 'משיכה' : 'Withdraw'}
      >
        {cardContent}
      </SwipeableCard>
    );
  }

  return cardContent;
};

export default VerticalApplicationCard;
