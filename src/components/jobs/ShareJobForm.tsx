import { useState, useMemo } from 'react';
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
  DialogDescription,
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
import { Badge } from '@/components/ui/badge';
import { Share2, Loader2, Users, Sparkles, Layers, Briefcase, GraduationCap } from 'lucide-react';
import { 
  JOB_FIELDS, 
  EXPERIENCE_LEVELS, 
  getRolesByField 
} from '@/lib/job-taxonomy';

const jobSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  company_name: z.string().min(2, 'Company name is required'),
  location: z.string().optional(),
  job_type: z.string().optional(),
  salary_range: z.string().optional(),
  field_slug: z.string().min(1, 'Field is required'),
  role_slug: z.string().optional(),
  experience_level_slug: z.string().optional(),
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
      field_slug: '',
      role_slug: '',
      experience_level_slug: '',
      description: '',
      source_url: '',
    },
  });

  // Watch the field_slug to get available roles
  const selectedFieldSlug = form.watch('field_slug');
  const availableRoles = useMemo(() => {
    if (!selectedFieldSlug) return [];
    return getRolesByField(selectedFieldSlug);
  }, [selectedFieldSlug]);

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
          console.log('Could not create company, continuing without it');
        } else {
          companyId = newCompany.id;
        }
      }

      // Get field_id, role_id, experience_level_id from slugs
      let fieldId = null;
      let roleId = null;
      let experienceLevelId = null;

      if (data.field_slug) {
        const { data: field } = await supabase
          .from('job_fields')
          .select('id')
          .eq('slug', data.field_slug)
          .single();
        if (field) fieldId = field.id;
      }

      if (data.role_slug) {
        const { data: role } = await supabase
          .from('job_roles')
          .select('id')
          .eq('slug', data.role_slug)
          .single();
        if (role) roleId = role.id;
      }

      if (data.experience_level_slug) {
        const { data: expLevel } = await supabase
          .from('experience_levels')
          .select('id')
          .eq('slug', data.experience_level_slug)
          .single();
        if (expLevel) experienceLevelId = expLevel.id;
      }

      // Create job
      const { error } = await supabase.from('jobs').insert({
        title: data.title,
        company_id: companyId,
        location: data.location || null,
        job_type: data.job_type || null,
        salary_range: data.salary_range || null,
        category: data.field_slug || null, // Keep category for backward compatibility
        field_id: fieldId,
        role_id: roleId,
        experience_level_id: experienceLevelId,
        description: data.description || null,
        source_url: data.source_url || null,
        shared_by_user_id: user.id,
        is_community_shared: true,
        status: 'active',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'המשרה שותפה בהצלחה! 🎉' : 'Job shared successfully! 🎉');
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
          <Button className="gap-2 bg-primary hover:bg-primary/90" data-tour="share-job">
            <Share2 className="h-4 w-4" />
            {isHebrew ? 'שתף משרה' : 'Share Job'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {isHebrew ? 'שתף משרה עם הקהילה' : 'Share a Job with the Community'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="w-3 h-3" />
              {isHebrew ? 'המשרה תהיה זמינה לכל המשתמשים' : 'Job will be available to all users'}
            </Badge>
          </DialogDescription>
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

            {/* Field - Required */}
            <FormField
              control={form.control}
              name="field_slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary font-medium flex items-center gap-1">
                    <Layers className="w-4 h-4" />
                    {isHebrew ? 'תחום עבודה' : 'Job Field'} * 
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('role_slug', ''); // Reset role when field changes
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="border-primary/30 focus:ring-primary">
                        <SelectValue placeholder={isHebrew ? 'בחר תחום' : 'Select field'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {JOB_FIELDS.map((f) => (
                        <SelectItem key={f.slug} value={f.slug}>
                          {isHebrew ? f.name_he : f.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role & Experience Level */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role_slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {isHebrew ? 'תפקיד' : 'Role'}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedFieldSlug}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isHebrew ? 'בחר' : 'Select'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.slug} value={role.slug}>
                            {isHebrew ? role.name_he : role.name_en}
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
                name="experience_level_slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <GraduationCap className="w-4 h-4" />
                      {isHebrew ? 'רמת ותק' : 'Experience'}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isHebrew ? 'בחר' : 'Select'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXPERIENCE_LEVELS.map((level) => (
                          <SelectItem key={level.slug} value={level.slug}>
                            {isHebrew ? level.name_he : level.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              className="w-full gap-2" 
              disabled={createJobMutation.isPending}
              size="lg"
            >
              {createJobMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  {isHebrew ? 'שתף משרה עם הקהילה' : 'Share Job with Community'}
                </>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
