import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhotoUpload } from './PhotoUpload';
import { IntroVideoUpload } from './IntroVideoUpload';
import { PersonalCardPreview } from './PersonalCardPreview';
import { User, Sparkles, Eye, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { debounce } from '@/lib/utils';

export function PersonalCardEditor() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  
  const [formData, setFormData] = useState({
    full_name: '',
    personal_tagline: '',
    about_me: '',
    avatar_url: null as string | null,
    intro_video_url: null as string | null,
    portfolio_url: '',
    linkedin_url: '',
    github_url: '',
    phone: '',
    email: ''
  });

  // Initialize form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        personal_tagline: (profile as any).personal_tagline || '',
        about_me: (profile as any).about_me || '',
        avatar_url: profile.avatar_url || null,
        intro_video_url: (profile as any).intro_video_url || null,
        portfolio_url: (profile as any).portfolio_url || '',
        linkedin_url: (profile as any).linkedin_url || '',
        github_url: (profile as any).github_url || '',
        phone: (profile as any).phone || '',
        email: profile.email || ''
      });
    }
  }, [profile]);

  // Fetch video signed URL if needed
  useEffect(() => {
    const fetchVideoUrl = async () => {
      const videoPath = (profile as any)?.intro_video_url;
      if (videoPath && videoPath.startsWith('profile-videos/')) {
        const filePath = videoPath.replace('profile-videos/', '');
        const { data } = await supabase.storage
          .from('profile-videos')
          .createSignedUrl(filePath, 60 * 60); // 1 hour
        
        if (data?.signedUrl) {
          setFormData(prev => ({ ...prev, intro_video_url: data.signedUrl }));
        }
      }
    };

    fetchVideoUrl();
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          personal_tagline: formData.personal_tagline || null,
          about_me: formData.about_me || null,
          portfolio_url: formData.portfolio_url || null,
          linkedin_url: formData.linkedin_url || null,
          github_url: formData.github_url || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success(isHebrew ? 'הכרטיס האישי נשמר!' : 'Personal card saved!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(isHebrew ? 'שגיאה בשמירה' : 'Error saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (url: string | null) => {
    setFormData(prev => ({ ...prev, avatar_url: url }));
  };

  const handleVideoUpload = (url: string | null) => {
    setFormData(prev => ({ ...prev, intro_video_url: url }));
  };

  if (!user) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {isHebrew ? 'הכרטיס האישי שלי' : 'My Personal Card'}
        </CardTitle>
        <CardDescription>
          {isHebrew 
            ? 'זה מה שמגייסות יראו כשהן מסתכלות עליך. הצג את עצמך באופן אישי ואנושי!'
            : "This is what recruiters see when they view your profile. Present yourself personally and authentically!"}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="edit" className="gap-2">
              <Sparkles className="w-4 h-4" />
              {isHebrew ? 'עריכה' : 'Edit'}
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" />
              {isHebrew ? 'תצוגה מקדימה' : 'Preview'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-6">
            {/* Photo Section */}
            <div className="flex flex-col items-center pb-6 border-b border-border">
              <PhotoUpload
                userId={user.id}
                currentAvatarUrl={formData.avatar_url}
                userName={formData.full_name}
                onUpload={handlePhotoUpload}
              />
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  {isHebrew ? 'שם מלא' : 'Full Name'}
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder={isHebrew ? 'השם שלך' : 'Your name'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personal_tagline">
                  {isHebrew ? 'כותרת אישית' : 'Personal Tagline'}
                </Label>
                <Input
                  id="personal_tagline"
                  value={formData.personal_tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, personal_tagline: e.target.value }))}
                  placeholder={isHebrew ? 'למשל: "חובב טיולים, אוהב אתגרים, תמיד מחפש ללמוד"' : 'e.g., "Adventure seeker, lifelong learner, coffee enthusiast"'}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {isHebrew 
                    ? 'כותרת קצרה שמתארת אותך - לא חייב להיות קשור לעבודה'
                    : "A short tagline about you - doesn't have to be work-related"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="about_me">
                  {isHebrew ? 'כמה מילים על עצמי' : 'A Few Words About Me'}
                </Label>
                <Textarea
                  id="about_me"
                  value={formData.about_me}
                  onChange={(e) => setFormData(prev => ({ ...prev, about_me: e.target.value }))}
                  placeholder={isHebrew 
                    ? 'ספר/י על עצמך, על התחביבים שלך, על מה שאת/ה אוהב/ת לעשות...'
                    : 'Tell us about yourself, your hobbies, what you love to do...'}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-end">
                  {formData.about_me.length}/500
                </p>
              </div>
            </div>

            {/* Video Section */}
            <div className="space-y-3 pt-4 border-t border-border">
              <Label>
                {isHebrew ? 'סרטון היכרות (אופציונלי)' : 'Introduction Video (optional)'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isHebrew 
                  ? 'סרטון קצר של עד 60 שניות שבו את/ה מציג/ה את עצמך'
                  : 'A short video (up to 60 seconds) where you introduce yourself'}
              </p>
              <IntroVideoUpload
                userId={user.id}
                currentVideoUrl={formData.intro_video_url}
                onUpload={handleVideoUpload}
              />
            </div>

            {/* Links Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <Label>{isHebrew ? 'קישורים מקצועיים' : 'Professional Links'}</Label>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="portfolio_url" className="text-sm">Portfolio</Label>
                  <Input
                    id="portfolio_url"
                    type="url"
                    value={formData.portfolio_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, portfolio_url: e.target.value }))}
                    placeholder="https://"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url" className="text-sm">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github_url" className="text-sm">GitHub</Label>
                  <Input
                    id="github_url"
                    type="url"
                    value={formData.github_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, github_url: e.target.value }))}
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isHebrew ? 'שמור שינויים' : 'Save Changes'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <PersonalCardPreview 
              profile={formData}
              showActions={false}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
