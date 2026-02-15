import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Eye, Heart, MessageSquare, Share2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function ContentDashboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';

  const { data: posts = [] } = useQuery({
    queryKey: ['content-dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id,
  });

  const totalViews = posts.reduce((sum, p) => sum + ((p as any).views_count || 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + ((p as any).shares_count || 0), 0);

  const chartData = posts.slice(0, 10).map((p, i) => ({
    name: `#${i + 1}`,
    likes: p.likes_count || 0,
    comments: p.comments_count || 0,
    views: (p as any).views_count || 0,
  }));

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-primary" />
        {isHebrew ? 'דאשבורד תוכן' : 'Content Dashboard'}
      </h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isHebrew ? 'צפיות' : 'Views', value: totalViews, icon: Eye, color: 'text-blue-500' },
          { label: isHebrew ? 'לייקים' : 'Likes', value: totalLikes, icon: Heart, color: 'text-pink-500' },
          { label: isHebrew ? 'תגובות' : 'Comments', value: totalComments, icon: MessageSquare, color: 'text-primary' },
          { label: isHebrew ? 'שיתופים' : 'Shares', value: totalShares, icon: Share2, color: 'text-accent' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {isHebrew ? 'ביצועי פוסטים אחרונים' : 'Recent Post Performance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="likes" fill="hsl(330, 80%, 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="comments" fill="hsl(156, 100%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{isHebrew ? 'כל הפוסטים' : 'All Posts'}</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{isHebrew ? 'אין פוסטים עדיין' : 'No posts yet'}</p>
          ) : (
            <div className="space-y-2">
              {posts.map((post) => (
                <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Badge variant="outline" className="shrink-0">{post.post_type}</Badge>
                  <p className="flex-1 text-sm truncate">{(post as any).content_en || (post as any).content_he || '—'}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(post as any).views_count || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes_count || 0}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comments_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
