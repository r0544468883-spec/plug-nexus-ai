import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, BookOpen, Building2, GraduationCap, Layers, Plus } from 'lucide-react';

const TEMPLATES = [
  { value: 'expert_hub', icon: BookOpen, label_en: 'Expert Hub', label_he: 'מרכז מומחים', desc_en: 'Skills & challenges focus', desc_he: 'מיומנויות ואתגרים', channels: [
    { en: 'general', he: 'כללי' }, { en: 'skill-challenges', he: 'אתגרי-מיומנות' }, { en: 'resources', he: 'משאבים' }
  ]},
  { value: 'branding_lounge', icon: Building2, label_en: 'Branding Lounge', label_he: 'לאונג\' מיתוג', desc_en: 'Company culture & content', desc_he: 'תרבות ארגונית ותוכן', channels: [
    { en: 'behind-the-scenes', he: 'מאחורי-הקלעים' }, { en: 'announcements', he: 'הודעות' }, { en: 'qa', he: 'שאלות-ותשובות' }
  ]},
  { value: 'career_academy', icon: GraduationCap, label_en: 'Career Academy', label_he: 'אקדמיית קריירה', desc_en: 'Interview prep & coaching', desc_he: 'הכנה לראיונות וקואצ\'ינג', channels: [
    { en: 'interview-prep', he: 'הכנה-לראיון' }, { en: 'salary-talk', he: 'שיחות-שכר' }, { en: 'mentoring', he: 'מנטורינג' }
  ]},
  { value: 'custom', icon: Layers, label_en: 'Custom', label_he: 'מותאם', desc_en: 'Build from scratch', desc_he: 'בנה מאפס', channels: [
    { en: 'general', he: 'כללי' }
  ]},
];

interface CreateCommunityHubProps {
  onSuccess: (hubId: string) => void;
  onCancel: () => void;
}

export function CreateCommunityHub({ onSuccess, onCancel }: CreateCommunityHubProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const [template, setTemplate] = useState('expert_hub');
  const [nameEn, setNameEn] = useState('');
  const [nameHe, setNameHe] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descHe, setDescHe] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!nameEn.trim()) throw new Error('Name required');

      // Create hub
      const { data: hub, error: hubError } = await supabase
        .from('community_hubs')
        .insert({
          creator_id: user.id,
          name_en: nameEn.trim(),
          name_he: nameHe.trim() || nameEn.trim(),
          description_en: descEn.trim(),
          description_he: descHe.trim(),
          template,
          member_count: 1,
        })
        .select('id')
        .single();

      if (hubError) throw hubError;

      // Add creator as admin
      await supabase.from('community_members').insert({
        hub_id: hub.id,
        user_id: user.id,
        role: 'admin',
      });

      // Create default channels based on template
      const tmpl = TEMPLATES.find(t => t.value === template)!;
      const channels = tmpl.channels.map((ch, i) => ({
        hub_id: hub.id,
        name_en: `#${ch.en}`,
        name_he: `#${ch.he}`,
        sort_order: i,
      }));

      await supabase.from('community_channels').insert(channels);

      return hub.id;
    },
    onSuccess: (hubId) => {
      toast.success(isHebrew ? 'הקהילה נוצרה!' : 'Community created!');
      queryClient.invalidateQueries({ queryKey: ['community-hubs'] });
      queryClient.invalidateQueries({ queryKey: ['my-community-memberships'] });
      onSuccess(hubId);
    },
    onError: (err: Error) => {
      toast.error(err.message || (isHebrew ? 'שגיאה ביצירת הקהילה' : 'Failed to create community'));
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Plus className="w-6 h-6 text-primary" />
        {isHebrew ? 'יצירת קהילה חדשה' : 'Create New Community'}
      </h2>

      {/* Template Selection */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{isHebrew ? 'בחר תבנית' : 'Choose Template'}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={template} onValueChange={setTemplate} className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              return (
                <Label
                  key={t.value}
                  htmlFor={t.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    template === t.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={t.value} id={t.value} className="sr-only" />
                  <Icon className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{isHebrew ? t.label_he : t.label_en}</p>
                    <p className="text-xs text-muted-foreground">{isHebrew ? t.desc_he : t.desc_en}</p>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Details */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{isHebrew ? 'פרטים' : 'Details'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name (English)</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. React Developers" />
            </div>
            <div className="space-y-2">
              <Label>שם (עברית)</Label>
              <Input value={nameHe} onChange={(e) => setNameHe(e.target.value)} placeholder="לדוגמה: מפתחי React" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Description (English)</Label>
              <Textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} placeholder="What's this community about?" className="resize-none min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label>תיאור (עברית)</Label>
              <Textarea value={descHe} onChange={(e) => setDescHe(e.target.value)} placeholder="על מה הקהילה הזאת?" className="resize-none min-h-[80px]" dir="rtl" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>{isHebrew ? 'ביטול' : 'Cancel'}</Button>
        <Button onClick={() => createMutation.mutate()} disabled={!nameEn.trim() || createMutation.isPending} className="gap-2">
          {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isHebrew ? 'צור קהילה' : 'Create Community'}
        </Button>
      </div>
    </div>
  );
}
