import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bot, Plus, X, Play, RefreshCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface CrawlerRun {
  id: string;
  platform: string;
  search_query: string;
  status: string;
  jobs_found: number;
  jobs_added: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function CrawlerSettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';
  
  const [newQuery, setNewQuery] = useState('');
  const [newLocation, setNewLocation] = useState('');
  
  // Fetch user's crawler settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['crawler-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('crawler_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });
  
  // Fetch recent crawler runs
  const { data: recentRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ['crawler-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crawler_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as CrawlerRun[];
    },
  });
  
  // Create/update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!user) throw new Error('Not authenticated');
      
      if (settings) {
        const { error } = await supabase
          .from('crawler_settings')
          .update(updates)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crawler_settings')
          .insert({ user_id: user.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawler-settings'] });
      toast({
        title: isHebrew ? 'ההגדרות נשמרו' : 'Settings saved',
      });
    },
  });
  
  // Manual crawl trigger
  const triggerCrawlMutation = useMutation({
    mutationFn: async ({ platform, query, location }: { platform: string; query: string; location: string }) => {
      const { data, error } = await supabase.functions.invoke('job-crawler', {
        body: { platform, query, location },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crawler-runs'] });
      toast({
        title: isHebrew ? 'הסריקה הושלמה!' : 'Crawl completed!',
        description: isHebrew 
          ? `נמצאו ${data.jobsFound} משרות, נוספו ${data.jobsAdded} חדשות`
          : `Found ${data.jobsFound} jobs, added ${data.jobsAdded} new`,
      });
    },
    onError: (error) => {
      toast({
        title: isHebrew ? 'שגיאה בסריקה' : 'Crawl failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
  
  const currentQueries = settings?.search_queries || ['software engineer', 'product manager', 'developer'];
  const currentLocations = settings?.locations || ['Israel', 'Tel Aviv', 'Remote'];
  const currentPlatforms = settings?.platforms || ['linkedin', 'alljobs', 'drushim'];
  
  const addQuery = () => {
    if (!newQuery.trim()) return;
    const updated = [...currentQueries, newQuery.trim()];
    updateSettingsMutation.mutate({ search_queries: updated });
    setNewQuery('');
  };
  
  const removeQuery = (query: string) => {
    const updated = currentQueries.filter((q: string) => q !== query);
    updateSettingsMutation.mutate({ search_queries: updated });
  };
  
  const addLocation = () => {
    if (!newLocation.trim()) return;
    const updated = [...currentLocations, newLocation.trim()];
    updateSettingsMutation.mutate({ locations: updated });
    setNewLocation('');
  };
  
  const removeLocation = (location: string) => {
    const updated = currentLocations.filter((l: string) => l !== location);
    updateSettingsMutation.mutate({ locations: updated });
  };
  
  const togglePlatform = (platform: string) => {
    const updated = currentPlatforms.includes(platform)
      ? currentPlatforms.filter((p: string) => p !== platform)
      : [...currentPlatforms, platform];
    updateSettingsMutation.mutate({ platforms: updated });
  };
  
  const toggleEnabled = () => {
    updateSettingsMutation.mutate({ is_enabled: !settings?.is_enabled });
  };
  
  const runManualCrawl = () => {
    // Run for first query/location combination
    const query = currentQueries[0] || 'software engineer';
    const location = currentLocations[0] || 'Israel';
    const platform = currentPlatforms[0] || 'linkedin';
    
    triggerCrawlMutation.mutate({ platform, query, location });
  };
  
  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {isHebrew ? 'סורק משרות אוטומטי' : 'Automatic Job Crawler'}
                </CardTitle>
                <CardDescription>
                  {isHebrew 
                    ? 'מוצא משרות חדשות מ-LinkedIn, AllJobs ו-Drushim אוטומטית'
                    : 'Automatically finds new jobs from LinkedIn, AllJobs & Drushim'}
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings?.is_enabled ?? true}
              onCheckedChange={toggleEnabled}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={runManualCrawl}
              disabled={triggerCrawlMutation.isPending}
              className="gap-2"
            >
              {triggerCrawlMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isHebrew ? 'הפעל סריקה עכשיו' : 'Run Crawl Now'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['crawler-runs'] })}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {isHebrew ? 'רענן' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Platforms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isHebrew ? 'פלטפורמות' : 'Platforms'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['linkedin', 'alljobs', 'drushim'].map(platform => (
              <Badge
                key={platform}
                variant={currentPlatforms.includes(platform) ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5"
                onClick={() => togglePlatform(platform)}
              >
                {platform === 'linkedin' && 'LinkedIn'}
                {platform === 'alljobs' && 'AllJobs'}
                {platform === 'drushim' && 'Drushim'}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Search Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isHebrew ? 'מילות חיפוש' : 'Search Queries'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {currentQueries.map((query: string) => (
              <Badge key={query} variant="secondary" className="gap-1 pl-2">
                {query}
                <button
                  onClick={() => removeQuery(query)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              placeholder={isHebrew ? 'הוסף מילת חיפוש...' : 'Add search query...'}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addQuery()}
            />
            <Button size="sm" onClick={addQuery} disabled={!newQuery.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isHebrew ? 'מיקומים' : 'Locations'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {currentLocations.map((location: string) => (
              <Badge key={location} variant="secondary" className="gap-1 pl-2">
                {location}
                <button
                  onClick={() => removeLocation(location)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder={isHebrew ? 'הוסף מיקום...' : 'Add location...'}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && addLocation()}
            />
            <Button size="sm" onClick={addLocation} disabled={!newLocation.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isHebrew ? 'סריקות אחרונות' : 'Recent Crawls'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recentRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isHebrew ? 'עדיין לא בוצעו סריקות' : 'No crawls yet'}
            </p>
          ) : (
            <div className="space-y-2">
              {recentRuns.map(run => (
                <div 
                  key={run.id} 
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {run.status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                    )}
                    {run.status === 'running' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {run.status === 'failed' && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    {run.status === 'pending' && (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    
                    <div>
                      <p className="text-sm font-medium">
                        {run.platform.charAt(0).toUpperCase() + run.platform.slice(1)} - {run.search_query}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(run.created_at), { 
                          addSuffix: true,
                          locale: isHebrew ? he : undefined,
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {run.status === 'completed' && (
                    <Badge variant="secondary" className="text-xs">
                      +{run.jobs_added} / {run.jobs_found}
                    </Badge>
                  )}
                  
                  {run.status === 'failed' && run.error_message && (
                    <span className="text-xs text-destructive truncate max-w-32">
                      {run.error_message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
