import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';
import { 
  Heart, 
  Globe, 
  Linkedin, 
  Github, 
  Phone,
  Briefcase,
  MessageSquare,
  User,
  TrendingUp,
  Clock,
  Video
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CandidateProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  allow_recruiter_contact: boolean;
  response_rate?: number | null;
  avg_response_time_hours?: number | null;
  personal_tagline?: string | null;
  about_me?: string | null;
  intro_video_url?: string | null;
}

interface Candidate {
  id: string;
  candidate_id: string;
  status: string;
  current_stage: string;
  match_score: number | null;
  created_at: string;
  job: {
    id: string;
    title: string;
  };
  profile: CandidateProfile | null;
  vouch_count: number;
}

interface CandidateCardProps {
  candidate: Candidate;
}

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

export function CandidateCard({ candidate }: CandidateCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHebrew = language === 'he';
  const profile = candidate.profile;

  const timeAgo = formatDistanceToNow(new Date(candidate.created_at), {
    addSuffix: true,
    locale: isHebrew ? he : enUS,
  });

  const openWhatsApp = () => {
    if (!profile?.phone) return;
    const phone = profile.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      isHebrew
        ? `שלום ${profile.full_name}, ראיתי את המועמדות שלך למשרת ${candidate.job?.title}. אשמח לשוחח איתך.`
        : `Hi ${profile.full_name}, I saw your application for the ${candidate.job?.title} position. I'd love to chat with you.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const goToProfile = () => {
    if (candidate.candidate_id) {
      navigate(`/candidate/${candidate.candidate_id}`);
    }
  };

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {profile?.full_name || (isHebrew ? 'מועמד לא ידוע' : 'Unknown Candidate')}
            </h3>
            {profile?.personal_tagline ? (
              <p className="text-sm text-muted-foreground line-clamp-1 italic">
                "{profile.personal_tagline}"
              </p>
            ) : (
              <p className="text-sm text-muted-foreground truncate">
                {candidate.job?.title}
              </p>
            )}
          </div>

          {candidate.match_score && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {candidate.match_score}%
              </span>
            </div>
          )}
        </div>

        {/* Stage & Vouches & Metrics */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge
            variant="outline"
            className={cn('border', stageColors[candidate.current_stage] || stageColors.applied)}
          >
            {stageLabels[candidate.current_stage]?.[isHebrew ? 'he' : 'en'] || candidate.current_stage}
          </Badge>

          {candidate.vouch_count > 0 && (
            <Badge variant="outline" className="gap-1 border-pink-500/20 text-pink-500">
              <Heart className="w-3 h-3" />
              {candidate.vouch_count}
            </Badge>
          )}

          {/* Response Rate Badge */}
          {profile?.response_rate !== undefined && profile?.response_rate !== null && profile.response_rate > 0 && (
            <Badge 
              variant="outline" 
              className={cn(
                'gap-1',
                profile.response_rate >= 80 
                  ? 'border-green-500/20 text-green-500' 
                  : profile.response_rate >= 50 
                    ? 'border-yellow-500/20 text-yellow-500'
                    : 'border-red-500/20 text-red-500'
              )}
            >
              <TrendingUp className="w-3 h-3" />
              {Math.round(profile.response_rate)}% {isHebrew ? 'תגובה' : 'Response'}
            </Badge>
          )}

          {/* Avg Response Time Badge */}
          {profile?.avg_response_time_hours !== undefined && profile?.avg_response_time_hours !== null && profile.avg_response_time_hours > 0 && (
            <Badge variant="outline" className="gap-1 border-primary/20 text-primary">
              <Clock className="w-3 h-3" />
              {profile.avg_response_time_hours < 24 
                ? `${Math.round(profile.avg_response_time_hours)}h`
                : `${Math.round(profile.avg_response_time_hours / 24)}d`
              }
            </Badge>
          )}

          {/* Intro Video Badge */}
          {profile?.intro_video_url && (
            <Badge variant="outline" className="gap-1 border-primary/20 text-primary">
              <Video className="w-3 h-3" />
              {isHebrew ? 'סרטון' : 'Video'}
            </Badge>
          )}

          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        {/* Professional Links */}
        {(profile?.portfolio_url || profile?.linkedin_url || profile?.github_url) && (
          <div className="flex items-center gap-2 mb-4">
            {profile.portfolio_url && (
              <a
                href={profile.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                title="Portfolio"
              >
                <Globe className="w-4 h-4 text-muted-foreground" />
              </a>
            )}
            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4 text-muted-foreground" />
              </a>
            )}
            {profile.github_url && (
              <a
                href={profile.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                title="GitHub"
              >
                <Github className="w-4 h-4 text-muted-foreground" />
              </a>
            )}
          </div>
        )}

        {/* Contact Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Profile Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={goToProfile}
          >
            <User className="w-4 h-4" />
            {isHebrew ? 'פרופיל מלא' : 'Full Profile'}
          </Button>

          {profile?.allow_recruiter_contact && (
            <>
              <SendMessageDialog
                toUserId={candidate.candidate_id}
                toUserName={profile?.full_name || ''}
                relatedJobId={candidate.job?.id}
                relatedApplicationId={candidate.id}
                trigger={
                  <Button variant="outline" size="sm" className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {isHebrew ? 'הודעה' : 'Message'}
                  </Button>
                }
              />
              
              {profile?.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                  onClick={openWhatsApp}
                >
                  <Phone className="w-4 h-4" />
                  WhatsApp
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
