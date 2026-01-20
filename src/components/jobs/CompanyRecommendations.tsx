import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, ExternalLink, Briefcase, Clock, TrendingUp, Loader2, Sparkles, Filter } from 'lucide-react';
import { JOB_FIELDS } from '@/lib/job-taxonomy';

interface Company {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  logo_url: string | null;
  size: string | null;
  avg_hiring_speed_days: number | null;
  total_hires: number | null;
  activeJobsCount: number;
  matchReason: string;
}

export function CompanyRecommendations() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHebrew = language === 'he';
  
  const [selectedField, setSelectedField] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['company-recommendations', user?.id, selectedField],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('No auth token');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recommend-companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fieldSlug: selectedField || undefined,
          limit: 15,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      return response.json();
    },
    enabled: !!user,
  });

  const companies: Company[] = data?.companies || [];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isHebrew ? 'חברות מומלצות עבורך' : 'Recommended Companies for You'}
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {isHebrew 
            ? 'חברות שמתאימות לפרופיל שלך ולקורות החיים'
            : 'Companies that match your profile and resume'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter by field */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedField || 'all'} onValueChange={(v) => setSelectedField(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder={isHebrew ? 'סנן לפי תחום' : 'Filter by field'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isHebrew ? 'כל התחומים' : 'All fields'}</SelectItem>
              {JOB_FIELDS.map((field) => (
                <SelectItem key={field.slug} value={field.slug}>
                  {isHebrew ? field.name_he : field.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            {isHebrew ? 'שגיאה בטעינת המלצות' : 'Error loading recommendations'}
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isHebrew ? 'לא נמצאו חברות מתאימות' : 'No matching companies found'}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-12 h-12 rounded-lg flex-shrink-0">
                    <AvatarImage src={company.logo_url || undefined} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                      <Building2 className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{company.name}</h4>
                      {company.activeJobsCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {company.activeJobsCount} {isHebrew ? 'משרות' : 'jobs'}
                        </Badge>
                      )}
                    </div>
                    
                    {company.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {company.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {company.industry && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {company.industry}
                        </span>
                      )}
                      {company.avg_hiring_speed_days && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {company.avg_hiring_speed_days}d {isHebrew ? 'זמן תגובה' : 'response'}
                        </span>
                      )}
                      {company.total_hires && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {company.total_hires} {isHebrew ? 'גיוסים' : 'hires'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {company.website && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      asChild
                    >
                      <a href={company.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
