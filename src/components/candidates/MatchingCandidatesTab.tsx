import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sparkles, 
  Heart, 
  Globe, 
  Linkedin, 
  Github, 
  MessageSquare,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchedCandidate {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  matchScore: number;
  vouchCount: number;
}

interface Job {
  id: string;
  title: string;
}

export function MatchingCandidatesTab() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Fetch recruiter's jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['recruiter-jobs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('jobs')
        .select('id, title')
        .or(`created_by.eq.${user.id},shared_by_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Job[];
    },
    enabled: !!user?.id,
  });

  // Fetch matching candidates for selected job
  const { data: matchingData, isLoading, error } = useQuery({
    queryKey: ['matching-candidates', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return null;

      const { data, error } = await supabase.functions.invoke('match-candidates', {
        body: { job_id: selectedJobId }
      });

      if (error) throw error;
      return data as { candidates: MatchedCandidate[]; total_visible: number; threshold: number };
    },
    enabled: !!selectedJobId,
  });

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (score >= 60) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className="space-y-4">
      {/* Job selector */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">
                {isHebrew ? 'בחר משרה לחיפוש מועמדים מתאימים' : 'Select a job to find matching candidates'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isHebrew 
                  ? 'מציג מועמדים עם 85%+ התאמה או את ה-10 המובילים'
                  : 'Shows candidates with 85%+ match or top 10 matches'}
              </p>
            </div>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={isHebrew ? 'בחר משרה...' : 'Select job...'} />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!selectedJobId ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isHebrew ? 'בחר משרה כדי לראות מועמדים מתאימים' : 'Select a job to see matching candidates'}
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">
              {isHebrew ? 'שגיאה בטעינת מועמדים' : 'Error loading candidates'}
            </p>
          </CardContent>
        </Card>
      ) : matchingData?.candidates?.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              {isHebrew ? 'לא נמצאו מועמדים מתאימים' : 'No matching candidates found'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isHebrew 
                ? 'מועמדים צריכים להפעיל "גלוי למגייסים" בהגדרות שלהם'
                : 'Candidates need to enable "Visible to HR" in their settings'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {isHebrew ? `${matchingData?.candidates?.length} מועמדים מתאימים` : `${matchingData?.candidates?.length} matching candidates`}
            </span>
            <span>•</span>
            <span>
              {isHebrew ? `${matchingData?.total_visible} סה"כ גלויים` : `${matchingData?.total_visible} total visible`}
            </span>
          </div>

          {/* Candidates grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchingData?.candidates?.map((candidate) => (
              <Card key={candidate.user_id} className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={candidate.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {candidate.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{candidate.full_name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                    </div>

                    {/* Match Score */}
                    <Badge variant="outline" className={cn('font-bold', getScoreColor(candidate.matchScore))}>
                      {candidate.matchScore}%
                    </Badge>
                  </div>

                  {/* Bio */}
                  {candidate.bio && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {candidate.bio}
                    </p>
                  )}

                  {/* Vouches */}
                  {candidate.vouchCount > 0 && (
                    <Badge variant="outline" className="gap-1 border-pink-500/20 text-pink-500 mb-3">
                      <Heart className="w-3 h-3" />
                      {candidate.vouchCount} {isHebrew ? 'המלצות' : 'vouches'}
                    </Badge>
                  )}

                  {/* Links */}
                  {(candidate.portfolio_url || candidate.linkedin_url || candidate.github_url) && (
                    <div className="flex items-center gap-2 mb-3">
                      {candidate.portfolio_url && (
                        <a
                          href={candidate.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                          title="Portfolio"
                        >
                          <Globe className="w-4 h-4 text-muted-foreground" />
                        </a>
                      )}
                      {candidate.linkedin_url && (
                        <a
                          href={candidate.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                          title="LinkedIn"
                        >
                          <Linkedin className="w-4 h-4 text-muted-foreground" />
                        </a>
                      )}
                      {candidate.github_url && (
                        <a
                          href={candidate.github_url}
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

                  {/* Contact */}
                  <SendMessageDialog
                    toUserId={candidate.user_id}
                    toUserName={candidate.full_name}
                    trigger={
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <MessageSquare className="w-4 h-4" />
                        {isHebrew ? 'שלח הודעה' : 'Send Message'}
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
