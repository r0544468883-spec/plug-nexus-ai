import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeedCard } from './FeedCard';
import { WebinarFeedCard, WebinarData } from './WebinarFeedCard';
import { generateFeedPosts, FeedPost } from './feedMockData';
import { Newspaper } from 'lucide-react';

export function FeedPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';

  // Fetch user's followed IDs for prioritization
  const { data: followedIds } = useQuery({
    queryKey: ['user-follows', user?.id],
    queryFn: async () => {
      if (!user?.id) return { userIds: [] as string[], companyIds: [] as string[] };
      const { data } = await supabase.from('follows').select('followed_user_id, followed_company_id').eq('follower_id', user.id);
      return {
        userIds: data?.filter((f: any) => f.followed_user_id).map((f: any) => f.followed_user_id) || [],
        companyIds: data?.filter((f: any) => f.followed_company_id).map((f: any) => f.followed_company_id) || [],
      };
    },
    enabled: !!user?.id,
  });

  // Fetch real posts from DB
  const { data: dbPosts } = useQuery({
    queryKey: ['feed-posts-real'],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !posts?.length) return [];

      const pollPostIds = posts.filter((p: any) => p.post_type === 'poll').map((p: any) => p.id);
      let pollOptionsMap: Record<string, any[]> = {};
      if (pollPostIds.length > 0) {
        const { data: options } = await supabase.from('feed_poll_options').select('*').in('post_id', pollPostIds);
        if (options) {
          for (const opt of options) {
            if (!pollOptionsMap[opt.post_id]) pollOptionsMap[opt.post_id] = [];
            pollOptionsMap[opt.post_id].push(opt);
          }
        }
      }

      const authorIds = [...new Set(posts.map((p: any) => p.author_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', authorIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p.full_name; });

      const companyIds = [...new Set(posts.filter((p: any) => p.company_id).map((p: any) => p.company_id))];
      let companyMap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase.from('companies').select('id, name').in('id', companyIds);
        companies?.forEach((c: any) => { companyMap[c.id] = c.name; });
      }

      return posts.map((p: any): FeedPost => ({
        id: p.id,
        recruiterName: profileMap[p.author_id] || 'Recruiter',
        recruiterAvatar: (profileMap[p.author_id] || 'R').charAt(0).toUpperCase(),
        companyName: p.company_id ? (companyMap[p.company_id] || '') : '',
        postType: p.post_type,
        content: p.content_en || p.content_he || '',
        contentHe: p.content_he || p.content_en || '',
        videoUrl: p.video_url || undefined,
        likes: p.likes_count || 0,
        comments: p.comments_count || 0,
        createdAt: p.created_at,
        authorId: p.author_id,
        companyId: p.company_id,
        pollOptions: pollOptionsMap[p.id]?.map((o: any) => ({
          id: o.id, text: o.text_en, textHe: o.text_he, votes: o.votes_count || 0,
        })),
      }));
    },
  });

  // Fetch webinars
  const { data: webinars } = useQuery({
    queryKey: ['webinars-feed', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webinars')
        .select('*')
        .gte('scheduled_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(20);

      if (error || !data?.length) return [];

      // Fetch creator names & company names
      const creatorIds = [...new Set(data.map((w: any) => w.creator_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', creatorIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p.full_name; });

      const companyIds = [...new Set(data.filter((w: any) => w.company_id).map((w: any) => w.company_id))];
      let companyMap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase.from('companies').select('id, name').in('id', companyIds);
        companies?.forEach((c: any) => { companyMap[c.id] = c.name; });
      }

      // Fetch user registrations
      let regSet = new Set<string>();
      let regCounts: Record<string, number> = {};
      if (user?.id) {
        const { data: myRegs } = await supabase.from('webinar_registrations').select('webinar_id').eq('user_id', user.id);
        myRegs?.forEach((r: any) => regSet.add(r.webinar_id));
      }

      const webinarIds = data.map((w: any) => w.id);
      // Get counts
      for (const wid of webinarIds) {
        const { count } = await supabase.from('webinar_registrations').select('id', { count: 'exact', head: true }).eq('webinar_id', wid);
        regCounts[wid] = count || 0;
      }

      return data.map((w: any): WebinarData => ({
        id: w.id,
        title_en: w.title_en,
        title_he: w.title_he,
        description_en: w.description_en || '',
        description_he: w.description_he || '',
        scheduled_at: w.scheduled_at,
        link_url: w.link_url,
        is_internal: w.is_internal,
        internal_stream_url: w.internal_stream_url,
        creator_name: profileMap[w.creator_id],
        company_name: w.company_id ? companyMap[w.company_id] : undefined,
        registration_count: regCounts[w.id] || 0,
        is_registered: regSet.has(w.id),
      }));
    },
  });

  const { data: companyNames } = useQuery({
    queryKey: ['feed-companies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('applications')
        .select('job_id, jobs(company_id, companies(name))')
        .eq('candidate_id', user.id)
        .limit(20);
      const names: string[] = [];
      data?.forEach((app: any) => {
        const name = app.jobs?.companies?.name;
        if (name && !names.includes(name)) names.push(name);
      });
      return names;
    },
    enabled: !!user?.id,
  });

  const mockPosts = useMemo(() => generateFeedPosts(companyNames || []), [companyNames]);

  // Combine & prioritize followed content
  const allPosts = useMemo(() => {
    const real = dbPosts || [];
    const combined = real.length >= 5 ? real : [...real, ...mockPosts];

    if (!followedIds?.userIds.length && !followedIds?.companyIds.length) return combined;

    const followed: FeedPost[] = [];
    const rest: FeedPost[] = [];
    for (const p of combined) {
      if ((p.authorId && followedIds.userIds.includes(p.authorId)) ||
          (p.companyId && followedIds.companyIds.includes(p.companyId))) {
        followed.push(p);
      } else {
        rest.push(p);
      }
    }
    return [...followed, ...rest];
  }, [dbPosts, mockPosts, followedIds]);

  const filterPosts = (type?: string): FeedPost[] => {
    if (!type || type === 'all') return allPosts;
    return allPosts.filter(p => p.postType === type);
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Newspaper className="w-6 h-6 text-primary" />
        PLUG Feed
      </h2>
      <p className="text-muted-foreground text-sm -mt-4">
        {isRTL
          ? 'תוכן מותאם אישית ממגייסים וחברות – כל אינטראקציה מרוויחה +1 דלק!'
          : 'Personalized content from recruiters & companies – every interaction earns +1 Fuel!'}
      </p>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">{isRTL ? 'הכל' : 'All'}</TabsTrigger>
          <TabsTrigger value="tip">{isRTL ? 'טיפים' : 'Tips'}</TabsTrigger>
          <TabsTrigger value="culture">{isRTL ? 'תרבות' : 'Culture'}</TabsTrigger>
          <TabsTrigger value="poll">{isRTL ? 'סקרים' : 'Polls'}</TabsTrigger>
          <TabsTrigger value="webinars">{isRTL ? 'וובינרים' : 'Webinars'}</TabsTrigger>
        </TabsList>

        {['all', 'tip', 'culture', 'poll'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {filterPosts(tab).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {isRTL ? 'אין פוסטים בקטגוריה זו' : 'No posts in this category'}
              </p>
            ) : (
              filterPosts(tab).map(post => (
                <FeedCard key={post.id} post={post} />
              ))
            )}
          </TabsContent>
        ))}

        <TabsContent value="webinars" className="space-y-4">
          {(!webinars || webinars.length === 0) ? (
            <p className="text-center text-muted-foreground py-8">
              {isRTL ? 'אין וובינרים קרובים' : 'No upcoming webinars'}
            </p>
          ) : (
            webinars.map(w => <WebinarFeedCard key={w.id} webinar={w} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
