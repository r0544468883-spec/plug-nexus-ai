import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CandidateCard } from './CandidateCard';
import { MatchingCandidatesTab } from './MatchingCandidatesTab';
import { SendMessageDialog } from '@/components/messaging/SendMessageDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Filter, Sparkles, UserCheck, Globe, Heart, MessageSquare, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  profile: {
    user_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    portfolio_url: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    allow_recruiter_contact: boolean;
  } | null;
  vouch_count: number;
}

export function CandidatesPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [globalSearch, setGlobalSearch] = useState('');

  // Fetch applications for jobs created by current user
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['hr-candidates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: myJobs } = await supabase
        .from('jobs')
        .select('id, title')
        .or(`created_by.eq.${user.id},shared_by_user_id.eq.${user.id}`);
      if (!myJobs || myJobs.length === 0) return [];
      const jobIds = myJobs.map(j => j.id);
      const { data: applications, error } = await supabase
        .from('applications')
        .select('*')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const candidateIds = [...new Set(applications.map(a => a.candidate_id))];
      const { data: profiles } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, email, phone, avatar_url, portfolio_url, linkedin_url, github_url, allow_recruiter_contact')
        .in('user_id', candidateIds);
      const vouchCounts = await Promise.all(
        candidateIds.map(async (id) => {
          const { count } = await supabase.from('vouches').select('*', { count: 'exact', head: true }).eq('to_user_id', id).eq('is_public', true);
          return { user_id: id, count: count || 0 };
        })
      );
      return applications.map(app => ({
        ...app,
        job: myJobs.find(j => j.id === app.job_id),
        profile: profiles?.find(p => p.user_id === app.candidate_id) || null,
        vouch_count: vouchCounts.find(v => v.user_id === app.candidate_id)?.count || 0,
      })) as Candidate[];
    },
    enabled: !!user?.id,
  });

  // Global search for all candidates
  const { data: globalCandidates = [], isLoading: globalLoading } = useQuery({
    queryKey: ['global-candidates-search', globalSearch],
    queryFn: async () => {
      if (!globalSearch.trim() || globalSearch.length < 2) return [];
      const { data, error } = await supabase
        .from('profiles_secure')
        .select('user_id, full_name, email, avatar_url, bio, personal_tagline, portfolio_url, linkedin_url, github_url, visible_to_hr')
        .eq('visible_to_hr', true)
        .or(`full_name.ilike.%${globalSearch}%,email.ilike.%${globalSearch}%,bio.ilike.%${globalSearch}%`)
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: globalSearch.length >= 2,
  });

  const jobs = [...new Map(candidates.map(c => [c.job?.id, c.job])).values()].filter(Boolean);

  const filteredCandidates = candidates.filter((candidate) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = candidate.profile?.full_name?.toLowerCase().includes(query);
      const emailMatch = candidate.profile?.email?.toLowerCase().includes(query);
      if (!nameMatch && !emailMatch) return false;
    }
    if (stageFilter !== 'all' && candidate.current_stage !== stageFilter) return false;
    if (jobFilter !== 'all' && candidate.job?.id !== jobFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          {isHebrew ? 'מועמדים' : 'Candidates'}
        </h2>
      </div>

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="applications" className="gap-2">
            <UserCheck className="w-4 h-4" />
            {isHebrew ? 'מועמדים שהגישו' : 'Applications'}
          </TabsTrigger>
          <TabsTrigger value="matching" className="gap-2">
            <Sparkles className="w-4 h-4" />
            {isHebrew ? 'מועמדים מתאימים' : 'Matching'}
          </TabsTrigger>
          <TabsTrigger value="search-all" className="gap-2">
            <Globe className="w-4 h-4" />
            {isHebrew ? 'חיפוש כל המועמדים' : 'Search All'}
          </TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={isHebrew ? 'חיפוש לפי שם או אימייל...' : 'Search by name or email...'} className="pl-10" />
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder={isHebrew ? 'שלב' : 'Stage'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isHebrew ? 'כל השלבים' : 'All Stages'}</SelectItem>
                    <SelectItem value="applied">{isHebrew ? 'הוגש' : 'Applied'}</SelectItem>
                    <SelectItem value="screening">{isHebrew ? 'סינון' : 'Screening'}</SelectItem>
                    <SelectItem value="interview">{isHebrew ? 'ראיון' : 'Interview'}</SelectItem>
                    <SelectItem value="offer">{isHebrew ? 'הצעה' : 'Offer'}</SelectItem>
                    <SelectItem value="hired">{isHebrew ? 'התקבל' : 'Hired'}</SelectItem>
                    <SelectItem value="rejected">{isHebrew ? 'נדחה' : 'Rejected'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={jobFilter} onValueChange={setJobFilter}>
                  <SelectTrigger><SelectValue placeholder={isHebrew ? 'משרה' : 'Job'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isHebrew ? 'כל המשרות' : 'All Jobs'}</SelectItem>
                    {jobs.map((job) => (<SelectItem key={job?.id} value={job?.id || ''}>{job?.title}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map((i) => (
                <Card key={i} className="bg-card border-border"><CardContent className="p-4"><div className="flex items-center gap-3"><Skeleton className="w-12 h-12 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div></CardContent></Card>
              ))}
            </div>
          ) : filteredCandidates.length === 0 ? (
            <Card className="bg-card border-border"><CardContent className="p-12 text-center"><Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">{searchQuery || stageFilter !== 'all' || jobFilter !== 'all' ? (isHebrew ? 'לא נמצאו מועמדים התואמים לחיפוש' : 'No candidates match your filters') : (isHebrew ? 'אין מועמדים עדיין' : 'No candidates yet')}</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCandidates.map((candidate) => (<CandidateCard key={candidate.id} candidate={candidate} />))}
            </div>
          )}
        </TabsContent>

        {/* Matching Candidates Tab */}
        <TabsContent value="matching"><MatchingCandidatesTab /></TabsContent>

        {/* Search All Candidates Tab */}
        <TabsContent value="search-all" className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder={isHebrew ? 'חיפוש לפי שם, אימייל או ביו...' : 'Search by name, email or bio...'}
                  className="ps-10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isHebrew ? 'מציג רק מועמדים שהפעילו "גלוי למגייסים"' : 'Only showing candidates with "Visible to HR" enabled'}
              </p>
            </CardContent>
          </Card>

          {globalSearch.length < 2 ? (
            <Card className="bg-card border-border"><CardContent className="p-12 text-center"><Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" /><p className="text-muted-foreground">{isHebrew ? 'הקלד לפחות 2 תווים לחיפוש' : 'Type at least 2 characters to search'}</p></CardContent></Card>
          ) : globalLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : globalCandidates.length === 0 ? (
            <Card className="bg-card border-border"><CardContent className="p-12 text-center"><Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">{isHebrew ? 'לא נמצאו מועמדים' : 'No candidates found'}</p></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {globalCandidates.map((profile) => (
                <Card key={profile.user_id} className="bg-card border-border plug-card-hover">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">{profile.full_name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{profile.full_name}</p>
                        {profile.personal_tagline && <p className="text-xs text-muted-foreground truncate">{profile.personal_tagline}</p>}
                      </div>
                    </div>
                    {profile.bio && <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/p/${profile.user_id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <ExternalLink className="w-3 h-3" />
                          {isHebrew ? 'פרופיל' : 'Profile'}
                        </Button>
                      </Link>
                      <SendMessageDialog toUserId={profile.user_id} toUserName={profile.full_name || ''} trigger={
                        <Button variant="outline" size="sm" className="gap-1.5"><MessageSquare className="w-3 h-3" />{isHebrew ? 'הודעה' : 'Message'}</Button>
                      } />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
