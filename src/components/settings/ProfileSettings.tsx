import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PhotoUpload } from '@/components/profile/PhotoUpload';
import { User, Mail, Phone, Loader2, Save } from 'lucide-react';

export function ProfileSettings() {
  const { user, profile, updateProfile } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'הפרופיל עודכן בהצלחה!' : 'Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בעדכון הפרופיל' : 'Failed to update profile');
    },
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {isHebrew ? 'פרטים אישיים' : 'Personal Information'}
        </CardTitle>
        <CardDescription>
          {isHebrew ? 'עדכן את פרטי הפרופיל שלך' : 'Update your profile information'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section with PhotoUpload */}
        {user && (
          <PhotoUpload
            userId={user.id}
            currentAvatarUrl={avatarUrl}
            userName={fullName || 'User'}
            onUpload={(url) => {
              setAvatarUrl(url);
              queryClient.invalidateQueries({ queryKey: ['profile'] });
            }}
            size="md"
          />
        )}

        {/* Form Fields */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {isHebrew ? 'שם מלא' : 'Full Name'}
            </Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isHebrew ? 'הכנס את שמך המלא' : 'Enter your full name'}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {isHebrew ? 'אימייל' : 'Email'}
            </Label>
            <Input
              value={profile?.email || user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {isHebrew ? 'לא ניתן לשנות את האימייל' : 'Email cannot be changed'}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {isHebrew ? 'טלפון' : 'Phone'}
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={isHebrew ? 'הכנס מספר טלפון' : 'Enter phone number'}
              type="tel"
            />
          </div>
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
          {isHebrew ? 'שמור שינויים' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}
