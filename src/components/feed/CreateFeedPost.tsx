import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoPlayer } from './VideoPlayer';
import { Newspaper, Plus, Trash2, Upload, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

type PostType = 'tip' | 'culture' | 'poll';

interface PollOptionDraft {
  text_en: string;
  text_he: string;
}

export function CreateFeedPost() {
  const { language } = useLanguage();
  const { user, profile } = useAuth();
  const isRTL = language === 'he';

  const [postType, setPostType] = useState<PostType>('tip');
  const [contentEn, setContentEn] = useState('');
  const [contentHe, setContentHe] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [pollOptions, setPollOptions] = useState<PollOptionDraft[]>([
    { text_en: '', text_he: '' },
    { text_en: '', text_he: '' },
  ]);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error(isRTL ? 'הקובץ גדול מדי (מקסימום 100MB)' : 'File too large (max 100MB)');
      return;
    }
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
  };

  const addPollOption = () => {
    if (pollOptions.length >= 4) return;
    setPollOptions([...pollOptions, { text_en: '', text_he: '' }]);
  };

  const removePollOption = (idx: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== idx));
  };

  const updatePollOption = (idx: number, field: 'text_en' | 'text_he', value: string) => {
    const updated = [...pollOptions];
    updated[idx] = { ...updated[idx], [field]: value };
    setPollOptions(updated);
  };

  const canPublish = () => {
    if (!contentEn.trim() && !contentHe.trim()) return false;
    if (postType === 'poll') {
      return pollOptions.every(o => o.text_en.trim() || o.text_he.trim());
    }
    return true;
  };

  const handlePublish = async () => {
    if (!user?.id || !canPublish()) return;
    setPublishing(true);

    try {
      let videoUrl: string | null = null;

      // Upload video if exists
      if (videoFile) {
        const ext = videoFile.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('feed-videos')
          .upload(path, videoFile, { contentType: videoFile.type });

        if (uploadError) throw uploadError;

        const { data: urlData } = await supabase.storage
          .from('feed-videos')
          .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

        videoUrl = urlData?.signedUrl || null;
      }

      // Get company_id from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('active_company_id')
        .eq('user_id', user.id)
        .single();

      const { data: post, error: postError } = await supabase
        .from('feed_posts')
        .insert({
          author_id: user.id,
          company_id: profileData?.active_company_id || null,
          post_type: postType,
          content_en: contentEn || null,
          content_he: contentHe || null,
          video_url: videoUrl,
          is_published: true,
        } as any)
        .select('id')
        .single();

      if (postError) throw postError;

      // Insert poll options if poll
      if (postType === 'poll' && post) {
        const options = pollOptions
          .filter(o => o.text_en.trim() || o.text_he.trim())
          .map(o => ({
            post_id: post.id,
            text_en: o.text_en || o.text_he,
            text_he: o.text_he || o.text_en,
          }));

        const { error: optError } = await supabase
          .from('feed_poll_options')
          .insert(options);

        if (optError) throw optError;
      }

      toast.success(isRTL ? 'הפוסט פורסם בהצלחה! 🎉' : 'Post published successfully! 🎉');

      // Reset form
      setContentEn('');
      setContentHe('');
      setPostType('tip');
      removeVideo();
      setPollOptions([{ text_en: '', text_he: '' }, { text_en: '', text_he: '' }]);
      setShowPreview(false);
    } catch (err: any) {
      console.error('Publish error:', err);
      toast.error(isRTL ? 'שגיאה בפרסום הפוסט' : 'Error publishing post');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Newspaper className="w-6 h-6 text-primary" />
        {isRTL ? 'יצירת תוכן לפיד' : 'Create Feed Content'}
      </h2>
      <p className="text-muted-foreground text-sm -mt-4">
        {isRTL
          ? 'פרסמו טיפים, תרבות ארגונית או סקרים שיגיעו למועמדים'
          : 'Publish tips, culture posts, or polls that reach candidates'}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isRTL ? 'פוסט חדש' : 'New Post'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Post Type */}
          <div className="space-y-2">
            <Label>{isRTL ? 'סוג פוסט' : 'Post Type'}</Label>
            <Select value={postType} onValueChange={(v) => setPostType(v as PostType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tip">{isRTL ? '💡 טיפ' : '💡 Tip'}</SelectItem>
                <SelectItem value="culture">{isRTL ? '🏢 תרבות ארגונית' : '🏢 Culture'}</SelectItem>
                <SelectItem value="poll">{isRTL ? '📊 סקר' : '📊 Poll'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content EN */}
          <div className="space-y-2">
            <Label>{isRTL ? 'תוכן באנגלית' : 'Content (English)'}</Label>
            <Textarea
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              placeholder={isRTL ? 'כתוב את התוכן באנגלית...' : 'Write content in English...'}
              rows={3}
            />
          </div>

          {/* Content HE */}
          <div className="space-y-2">
            <Label>{isRTL ? 'תוכן בעברית' : 'Content (Hebrew)'}</Label>
            <Textarea
              value={contentHe}
              onChange={(e) => setContentHe(e.target.value)}
              placeholder={isRTL ? 'כתוב את התוכן בעברית...' : 'Write content in Hebrew...'}
              dir="rtl"
              rows={3}
            />
          </div>

          {/* Video Upload */}
          <div className="space-y-2">
            <Label>{isRTL ? 'סרטון (אופציונלי)' : 'Video (optional)'}</Label>
            {videoPreviewUrl ? (
              <div className="space-y-2">
                <VideoPlayer src={videoPreviewUrl} />
                <Button variant="outline" size="sm" onClick={removeVideo} className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  {isRTL ? 'הסר סרטון' : 'Remove Video'}
                </Button>
              </div>
            ) : (
              <label className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isRTL ? 'לחצו להעלאת סרטון (עד 100MB)' : 'Click to upload video (up to 100MB)'}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoChange}
                />
              </label>
            )}
          </div>

          {/* Poll Options */}
          {postType === 'poll' && (
            <div className="space-y-3">
              <Label>{isRTL ? 'אפשרויות סקר' : 'Poll Options'}</Label>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Input
                      value={opt.text_en}
                      onChange={(e) => updatePollOption(idx, 'text_en', e.target.value)}
                      placeholder={`Option ${idx + 1} (EN)`}
                    />
                    <Input
                      value={opt.text_he}
                      onChange={(e) => updatePollOption(idx, 'text_he', e.target.value)}
                      placeholder={`אפשרות ${idx + 1} (HE)`}
                      dir="rtl"
                    />
                  </div>
                  {pollOptions.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => removePollOption(idx)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <Button variant="outline" size="sm" onClick={addPollOption} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isRTL ? 'הוסף אפשרות' : 'Add Option'}
                </Button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              {isRTL ? 'תצוגה מקדימה' : 'Preview'}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!canPublish() || publishing}
              className="gap-2 flex-1"
            >
              {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRTL ? 'פרסם' : 'Publish'}
            </Button>
          </div>

          {/* Preview */}
          {showPreview && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2">
                  {isRTL ? 'תצוגה מקדימה:' : 'Preview:'}
                </p>
                <p className="text-sm leading-relaxed">
                  {isRTL ? (contentHe || contentEn || '—') : (contentEn || contentHe || '—')}
                </p>
                {videoPreviewUrl && (
                  <div className="mt-3">
                    <VideoPlayer src={videoPreviewUrl} />
                  </div>
                )}
                {postType === 'poll' && (
                  <div className="mt-3 space-y-2">
                    {pollOptions.filter(o => o.text_en || o.text_he).map((o, i) => (
                      <div key={i} className="p-2 rounded bg-background border text-sm">
                        {isRTL ? (o.text_he || o.text_en) : (o.text_en || o.text_he)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
