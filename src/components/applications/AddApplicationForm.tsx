import { useState } from 'react';
import { Link2, Loader2, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JobPreview {
  company_name: string;
  job_title: string;
  location?: string;
  job_type?: string;
  salary_range?: string;
  description?: string;
  requirements?: string;
  source_url: string;
}

interface AddApplicationFormProps {
  onApplicationAdded: () => void;
}

const AddApplicationForm = ({ onApplicationAdded }: AddApplicationFormProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<JobPreview | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isRTL = language === 'he';

  const handleScrape = async () => {
    if (!url.trim()) {
      toast({
        title: isRTL ? 'נא להזין קישור' : 'Please enter a URL',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-job', {
        body: { url: url.trim() },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: isRTL ? 'שגיאה' : 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      setPreview(data.job);
    } catch (error) {
      console.error('Scrape error:', error);
      toast({
        title: isRTL ? 'שגיאה בקריאת הדף' : 'Error reading page',
        description: isRTL ? 'נסה שוב או הוסף ידנית' : 'Try again or add manually',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !user) return;

    setIsSaving(true);

    try {
      // First, create or find the company
      let companyId: string | null = null;
      
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('name', preview.company_name)
        .single();

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: preview.company_name,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (companyError) throw companyError;
        companyId = newCompany.id;
      }

      // Create the job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: preview.job_title,
          company_id: companyId,
          location: preview.location,
          job_type: preview.job_type,
          salary_range: preview.salary_range,
          description: preview.description,
          requirements: preview.requirements,
          source_url: preview.source_url,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (jobError) throw jobError;

      // Create the application
      const { error: appError } = await supabase
        .from('applications')
        .insert({
          job_id: job.id,
          candidate_id: user.id,
          status: 'active',
          current_stage: 'applied',
        });

      if (appError) throw appError;

      toast({
        title: isRTL ? 'המועמדות נוספה!' : 'Application added!',
        description: isRTL ? `${preview.job_title} ב-${preview.company_name}` : `${preview.job_title} at ${preview.company_name}`,
      });

      setUrl('');
      setPreview(null);
      onApplicationAdded();

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: isRTL ? 'שגיאה בשמירה' : 'Error saving',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setUrl('');
  };

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={isRTL ? 'הדבק לינק למשרה...' : 'Paste job URL...'}
            className={`${isRTL ? 'pr-10 text-right' : 'pl-10'} bg-secondary/50 border-border focus:border-primary`}
            dir={isRTL ? 'rtl' : 'ltr'}
            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
          />
        </div>
        <Button 
          onClick={handleScrape} 
          disabled={isLoading || !url.trim()}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isRTL ? 'נתח' : 'Analyze'}
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isRTL ? 'פלאג מנתח את המשרה...' : 'Plug is analyzing the job...'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'זה לוקח כמה שניות' : 'This takes a few seconds'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview && (
        <Card className="border-primary/30 bg-primary/5 overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg text-foreground">{preview.job_title}</h3>
                <p className="text-primary font-medium">{preview.company_name}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {preview.location && (
                <span className="bg-secondary/50 px-2 py-1 rounded">📍 {preview.location}</span>
              )}
              {preview.job_type && (
                <span className="bg-secondary/50 px-2 py-1 rounded">💼 {preview.job_type}</span>
              )}
              {preview.salary_range && (
                <span className="bg-secondary/50 px-2 py-1 rounded">💰 {preview.salary_range}</span>
              )}
            </div>

            {preview.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{preview.description}</p>
            )}

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isRTL ? 'הוסף מועמדות' : 'Add Application'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddApplicationForm;
