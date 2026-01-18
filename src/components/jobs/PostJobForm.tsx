import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Briefcase, MapPin, DollarSign, Loader2, Plus, Building2 } from 'lucide-react';

const JOB_CATEGORIES = [
  { value: 'engineering', labelEn: 'Engineering', labelHe: 'הנדסה' },
  { value: 'design', labelEn: 'Design', labelHe: 'עיצוב' },
  { value: 'product', labelEn: 'Product', labelHe: 'מוצר' },
  { value: 'marketing', labelEn: 'Marketing', labelHe: 'שיווק' },
  { value: 'sales', labelEn: 'Sales', labelHe: 'מכירות' },
  { value: 'operations', labelEn: 'Operations', labelHe: 'תפעול' },
  { value: 'hr', labelEn: 'HR', labelHe: 'משאבי אנוש' },
  { value: 'finance', labelEn: 'Finance', labelHe: 'כספים' },
  { value: 'data', labelEn: 'Data & Analytics', labelHe: 'דאטה ואנליטיקה' },
  { value: 'customer-success', labelEn: 'Customer Success', labelHe: 'הצלחת לקוחות' },
  { value: 'other', labelEn: 'Other', labelHe: 'אחר' },
];

const JOB_TYPES = [
  { value: 'full-time', labelEn: 'Full-time', labelHe: 'משרה מלאה' },
  { value: 'part-time', labelEn: 'Part-time', labelHe: 'משרה חלקית' },
  { value: 'contract', labelEn: 'Contract', labelHe: 'חוזה' },
  { value: 'freelance', labelEn: 'Freelance', labelHe: 'פרילנס' },
  { value: 'internship', labelEn: 'Internship', labelHe: 'התמחות' },
];

interface PostJobFormProps {
  onSuccess?: () => void;
}

export function PostJobForm({ onSuccess }: PostJobFormProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [category, setCategory] = useState('');
  const [jobType, setJobType] = useState('');
  const [companyName, setCompanyName] = useState('');

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Create or find company
      let companyId: string | null = null;
      
      if (companyName) {
        // Check if company exists
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('name', companyName)
          .single();

        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          // Create new company
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({
              name: companyName,
              created_by: user.id,
            })
            .select('id')
            .single();

          if (companyError) throw companyError;
          companyId = newCompany.id;
        }
      }

      // Create job
      const { error } = await supabase.from('jobs').insert({
        title,
        description,
        requirements,
        location,
        salary_range: salaryRange || null,
        category,
        job_type: jobType,
        company_id: companyId,
        created_by: user.id,
        status: 'active',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'המשרה פורסמה בהצלחה!' : 'Job posted successfully!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      // Reset form
      setTitle('');
      setDescription('');
      setRequirements('');
      setLocation('');
      setSalaryRange('');
      setCategory('');
      setJobType('');
      setCompanyName('');
      
      onSuccess?.();
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בפרסום המשרה' : 'Failed to post job');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category || !jobType) {
      toast.error(isHebrew ? 'אנא מלא את כל השדות הנדרשים' : 'Please fill in all required fields');
      return;
    }
    postMutation.mutate();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          {isHebrew ? 'פרסום משרה חדשה' : 'Post New Job'}
        </CardTitle>
        <CardDescription>
          {isHebrew 
            ? 'מלא את הפרטים ליצירת משרה חדשה'
            : 'Fill in the details to create a new job posting'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'כותרת המשרה *' : 'Job Title *'}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isHebrew ? 'לדוגמה: מפתח Full-Stack' : 'e.g. Full-Stack Developer'}
              required
            />
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {isHebrew ? 'שם החברה' : 'Company Name'}
            </Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={isHebrew ? 'שם החברה המגייסת' : 'Hiring company name'}
            />
          </div>

          {/* Category & Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isHebrew ? 'קטגוריה *' : 'Category *'}</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder={isHebrew ? 'בחר קטגוריה' : 'Select category'} />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {isHebrew ? cat.labelHe : cat.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isHebrew ? 'סוג משרה *' : 'Job Type *'}</Label>
              <Select value={jobType} onValueChange={setJobType} required>
                <SelectTrigger>
                  <SelectValue placeholder={isHebrew ? 'בחר סוג משרה' : 'Select job type'} />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {isHebrew ? type.labelHe : type.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location & Salary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {isHebrew ? 'מיקום' : 'Location'}
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isHebrew ? 'לדוגמה: תל אביב, מרחוק' : 'e.g. Tel Aviv, Remote'}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {isHebrew ? 'טווח שכר' : 'Salary Range'}
              </Label>
              <Input
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                placeholder={isHebrew ? 'לדוגמה: ₪25,000-₪35,000' : 'e.g. $80,000-$120,000'}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'תיאור המשרה *' : 'Job Description *'}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isHebrew 
                ? 'תאר את המשרה, האחריות והיומיום...'
                : 'Describe the role, responsibilities, and day-to-day...'
              }
              className="min-h-[120px]"
              required
            />
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'דרישות' : 'Requirements'}</Label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={isHebrew 
                ? 'כישורים, ניסיון, והסמכות נדרשות...'
                : 'Skills, experience, and qualifications required...'
              }
              className="min-h-[100px]"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={postMutation.isPending}
            className="w-full gap-2"
          >
            {postMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {isHebrew ? 'פרסם משרה' : 'Post Job'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
