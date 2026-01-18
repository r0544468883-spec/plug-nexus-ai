import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Eye, UserCheck, Loader2, Save } from 'lucide-react';

export function PrivacySettings() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  const [profileVisibility, setProfileVisibility] = useState(
    (profile as any)?.profile_visibility || 'public'
  );
  const [allowRecruiterContact, setAllowRecruiterContact] = useState(
    (profile as any)?.allow_recruiter_contact ?? true
  );

  useEffect(() => {
    if (profile) {
      setProfileVisibility((profile as any)?.profile_visibility || 'public');
      setAllowRecruiterContact((profile as any)?.allow_recruiter_contact ?? true);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          profile_visibility: profileVisibility,
          allow_recruiter_contact: allowRecruiterContact,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'הגדרות הפרטיות נשמרו!' : 'Privacy settings saved!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשמירת ההגדרות' : 'Failed to save settings');
    },
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {isHebrew ? 'פרטיות' : 'Privacy'}
        </CardTitle>
        <CardDescription>
          {isHebrew ? 'נהל את הגדרות הפרטיות שלך' : 'Manage your privacy settings'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Visibility */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {isHebrew ? 'נראות הפרופיל' : 'Profile Visibility'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isHebrew ? 'מי יכול לראות את הפרופיל שלך' : 'Who can see your profile'}
            </p>
          </div>
          <Select value={profileVisibility} onValueChange={setProfileVisibility}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">{isHebrew ? 'פומבי' : 'Public'}</SelectItem>
              <SelectItem value="private">{isHebrew ? 'פרטי' : 'Private'}</SelectItem>
              <SelectItem value="connections">{isHebrew ? 'קשרים בלבד' : 'Connections Only'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Allow Recruiter Contact */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              {isHebrew ? 'אפשר למגייסים ליצור קשר' : 'Allow Recruiter Contact'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isHebrew ? 'מגייסים יוכלו לפנות אליך' : 'Recruiters can reach out to you'}
            </p>
          </div>
          <Switch
            checked={allowRecruiterContact}
            onCheckedChange={setAllowRecruiterContact}
          />
        </div>

        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="gap-2"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isHebrew ? 'שמור הגדרות' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
