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

  // Fetch user's application company names for personalization
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

  const posts = useMemo(() => generateFeedPosts(companyNames || []), [companyNames]);

  const filterPosts = (type?: string): FeedPost[] => {
    if (!type || type === 'all') return posts;
    return posts.filter(p => p.postType === type);
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Newspaper className="w-6 h-6 text-primary" />
        {isRTL ? 'PLUG Feed' : 'PLUG Feed'}
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
