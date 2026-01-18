import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Share2, Loader2 } from 'lucide-react';

const jobSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  company_name: z.string().min(2, 'Company name is required'),
  location: z.string().optional(),
  job_type: z.string().optional(),
  salary_range: z.string().optional(),
  description: z.string().optional(),
  source_url: z.string().url().optional().or(z.literal('')),
});

type JobFormData = z.infer<typeof jobSchema>;

const JOB_TYPES = [
  { value: 'full-time', labelEn: 'Full-time', labelHe: 'משרה מלאה' },
  { value: 'part-time', labelEn: 'Part-time', labelHe: 'משרה חלקית' },
  { value: 'contract', labelEn: 'Contract', labelHe: 'חוזה' },
  { value: 'freelance', labelEn: 'Freelance', labelHe: 'פרילנס' },
  { value: 'internship', labelEn: 'Internship', labelHe: 'התמחות' },
];

const SALARY_RANGES = [
  { value: '0-10000', labelEn: '₪0 - ₪10,000', labelHe: '₪0 - ₪10,000' },
  { value: '10000-20000', labelEn: '₪10,000 - ₪20,000', labelHe: '₪10,000 - ₪20,000' },
  { value: '20000-35000', labelEn: '₪20,000 - ₪35,000', labelHe: '₪20,000 - ₪35,000' },
  { value: '35000-50000', labelEn: '₪35,000 - ₪50,000', labelHe: '₪35,000 - ₪50,000' },
  { value: '50000+', labelEn: '₪50,000+', labelHe: '₪50,000+' },
];

interface ShareJobFormProps {
  trigger?: React.ReactNode;
}

export function ShareJobForm({ trigger }: ShareJobFormProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      company_name: '',
      location: '',
      job_type: '',
      salary_range: '',
      description: '',
      source_url: '',
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      if (!user) throw new Error('Not authenticated');

      // First check if company exists or create it
      let companyId: string | null = null;
      
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', data.company_name)
        .maybeSingle();

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        // Create new company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: data.company_name,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (companyError) {
          // Company creation failed, continue without company_id
          console.log('Could not create company, continuing without it');
        } else {
          companyId = newCompany.id;
        }
      }

      // Create job
      const { error } = await supabase.from('jobs').insert({
        title: data.title,
        company_id: companyId,
        location: data.location || null,
        job_type: data.job_type || null,
        salary_range: data.salary_range || null,
        description: data.description || null,
        source_url: data.source_url || null,
        shared_by_user_id: user.id,
        is_community_shared: true,
        status: 'active',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'המשרה שותפה בהצלחה!' : 'Job shared successfully!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      console.error('Share job error:', error);
      toast.error(isHebrew ? 'שגיאה בשיתוף המשרה' : 'Failed to share job');
    },
  });

  const onSubmit = (data: JobFormData) => {
    createJobMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            {isHebrew ? 'שתף משרה' : 'Share Job'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isHebrew ? 'שתף משרה עם הקהילה' : 'Share a Job with the Community'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isHebrew ? 'תפקיד' : 'Job Title'} *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={isHebrew ? 'מפתח Full Stack' : 'Full Stack Developer'} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isHebrew ? 'חברה' : 'Company'} *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={isHebrew ? 'שם החברה' : 'Company name'} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isHebrew ? 'מיקום' : 'Location'}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={isHebrew ? 'תל אביב' : 'Tel Aviv'} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="job_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isHebrew ? 'סוג משרה' : 'Job Type'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isHebrew ? 'בחר' : 'Select'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JOB_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {isHebrew ? type.labelHe : type.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="salary_range"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isHebrew ? 'טווח שכר' : 'Salary Range'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isHebrew ? 'בחר טווח שכר' : 'Select salary range'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SALARY_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {isHebrew ? range.labelHe : range.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isHebrew ? 'קישור למשרה' : 'Job URL'}</FormLabel>
                  <FormControl>
                    <Input 
                      type="url"
                      placeholder="https://..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isHebrew ? 'תיאור' : 'Description'}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={isHebrew 
                        ? 'תיאור קצר של המשרה...' 
                        : 'Brief job description...'
                      }
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={createJobMutation.isPending}
            >
              {createJobMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  {isHebrew ? 'שתף משרה' : 'Share Job'}
                </>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
