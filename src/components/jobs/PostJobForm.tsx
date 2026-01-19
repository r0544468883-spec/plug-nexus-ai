import { useState, useMemo } from 'react';
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
import { Briefcase, MapPin, DollarSign, Loader2, Plus, Building2, Layers, GraduationCap } from 'lucide-react';
import { 
  JOB_FIELDS, 
  EXPERIENCE_LEVELS, 
  getRolesByField 
} from '@/lib/job-taxonomy';

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
  const [fieldSlug, setFieldSlug] = useState('');
  const [roleSlug, setRoleSlug] = useState('');
  const [experienceLevelSlug, setExperienceLevelSlug] = useState('');
  const [jobType, setJobType] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Get available roles based on selected field
  const availableRoles = useMemo(() => {
    if (!fieldSlug) return [];
    return getRolesByField(fieldSlug);
  }, [fieldSlug]);

  // Reset role when field changes
  const handleFieldChange = (value: string) => {
    setFieldSlug(value);
    setRoleSlug('');
  };

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

      // Get field_id and role_id from slugs
      let fieldId = null;
      let roleId = null;
      let experienceLevelId = null;

      if (fieldSlug) {
        const { data: field } = await supabase
          .from('job_fields')
          .select('id')
          .eq('slug', fieldSlug)
          .single();
        if (field) fieldId = field.id;
      }

      if (roleSlug) {
        const { data: role } = await supabase
          .from('job_roles')
          .select('id')
          .eq('slug', roleSlug)
          .single();
        if (role) roleId = role.id;
      }

      if (experienceLevelSlug) {
        const { data: expLevel } = await supabase
          .from('experience_levels')
          .select('id')
          .eq('slug', experienceLevelSlug)
          .single();
        if (expLevel) experienceLevelId = expLevel.id;
      }

      // Create job
      const { error } = await supabase.from('jobs').insert({
        title,
        description,
        requirements,
        location,
        salary_range: salaryRange || null,
        category: fieldSlug, // Keep category for backward compatibility
        field_id: fieldId,
        role_id: roleId,
        experience_level_id: experienceLevelId,
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
      setFieldSlug('');
      setRoleSlug('');
      setExperienceLevelSlug('');
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
    if (!title || !description || !fieldSlug || !jobType) {
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

          {/* Field, Role & Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {isHebrew ? 'תחום עבודה *' : 'Job Field *'}
              </Label>
              <Select value={fieldSlug} onValueChange={handleFieldChange} required>
                <SelectTrigger>
                  <SelectValue placeholder={isHebrew ? 'בחר תחום' : 'Select field'} />
                </SelectTrigger>
                <SelectContent>
                  {JOB_FIELDS.map((field) => (
                    <SelectItem key={field.slug} value={field.slug}>
                      {isHebrew ? field.name_he : field.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                {isHebrew ? 'תפקיד' : 'Role'}
              </Label>
              <Select value={roleSlug} onValueChange={setRoleSlug} disabled={!fieldSlug}>
                <SelectTrigger>
                  <SelectValue placeholder={isHebrew ? 'בחר תפקיד' : 'Select role'} />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.slug} value={role.slug}>
                      {isHebrew ? role.name_he : role.name_en}
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

          {/* Experience Level */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              {isHebrew ? 'רמת ותק נדרשת' : 'Required Experience Level'}
            </Label>
            <Select value={experienceLevelSlug} onValueChange={setExperienceLevelSlug}>
              <SelectTrigger>
                <SelectValue placeholder={isHebrew ? 'בחר רמת ותק' : 'Select experience level'} />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((level) => (
                  <SelectItem key={level.slug} value={level.slug}>
                    {isHebrew ? level.name_he : level.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
