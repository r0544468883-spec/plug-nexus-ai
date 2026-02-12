import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeedCard } from './FeedCard';
import { generateFeedPosts, FeedPost } from './feedMockData';
import { Newspaper } from 'lucide-react';

export function FeedPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';

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

      // Fetch poll options for poll posts
      const pollPostIds = posts.filter((p: any) => p.post_type === 'poll').map((p: any) => p.id);
      let pollOptionsMap: Record<string, any[]> = {};
      if (pollPostIds.length > 0) {
        const { data: options } = await supabase
          .from('feed_poll_options')
          .select('*')
          .in('post_id', pollPostIds);
        if (options) {
          for (const opt of options) {
            if (!pollOptionsMap[opt.post_id]) pollOptionsMap[opt.post_id] = [];
            pollOptionsMap[opt.post_id].push(opt);
          }
        }
      }

      // Fetch author profiles for names
      const authorIds = [...new Set(posts.map((p: any) => p.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', authorIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p.full_name; });

      // Fetch company names
      const companyIds = [...new Set(posts.filter((p: any) => p.company_id).map((p: any) => p.company_id))];
      let companyMap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);
        companies?.forEach((c: any) => { companyMap[c.id] = c.name; });
      }

      // Map to FeedPost shape
      return posts.map((p: any): FeedPost => {
        const authorName = profileMap[p.author_id] || 'Recruiter';
        return {
          id: p.id,
          recruiterName: authorName,
          recruiterAvatar: authorName.charAt(0).toUpperCase(),
          companyName: p.company_id ? (companyMap[p.company_id] || '') : '',
          postType: p.post_type,
          content: p.content_en || p.content_he || '',
          contentHe: p.content_he || p.content_en || '',
          videoUrl: p.video_url || undefined,
          likes: p.likes_count || 0,
          comments: p.comments_count || 0,
          createdAt: p.created_at,
          pollOptions: pollOptionsMap[p.id]?.map((o: any) => ({
            id: o.id,
            text: o.text_en,
            textHe: o.text_he,
            votes: o.votes_count || 0,
          })),
        };
      });
    },
  });

  // Fetch user's application company names for mock personalization
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

  // Combine: real posts first, then mock as fallback
  const allPosts = useMemo(() => {
    const real = dbPosts || [];
    if (real.length >= 5) return real; // enough real content
    return [...real, ...mockPosts];
  }, [dbPosts, mockPosts]);

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">{isRTL ? 'הכל' : 'All'}</TabsTrigger>
          <TabsTrigger value="tip">{isRTL ? 'טיפים' : 'Tips'}</TabsTrigger>
          <TabsTrigger value="culture">{isRTL ? 'תרבות' : 'Culture'}</TabsTrigger>
          <TabsTrigger value="poll">{isRTL ? 'סקרים' : 'Polls'}</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
