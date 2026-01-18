import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { VouchCard } from '@/components/vouch/VouchCard';
import { PlugLogo } from '@/components/PlugLogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, User, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch public vouches
  const { data: vouches = [], isLoading: vouchesLoading } = useQuery({
    queryKey: ['public-vouches', userId],
    queryFn: async () => {
      // Get vouches
      const { data: vouchesData, error: vouchesError } = await supabase
        .from('vouches')
        .select('*')
        .eq('to_user_id', userId!)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (vouchesError) throw vouchesError;

      // Get profiles for from_user_ids
      const fromUserIds = vouchesData.map(v => v.from_user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', fromUserIds);

      if (profilesError) throw profilesError;

      // Merge
      return vouchesData.map(vouch => ({
        ...vouch,
        from_profile: profiles.find(p => p.user_id === vouch.from_user_id),
      }));
    },
    enabled: !!userId,
  });

  const isLoading = profileLoading || vouchesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
            <PlugLogo size="sm" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto p-4 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
            <Link to="/">
              <PlugLogo size="sm" />
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {isHebrew ? 'הפרופיל לא נמצא' : 'Profile not found'}
              </h2>
              <p className="text-muted-foreground">
                {isHebrew 
                  ? 'ייתכן שהפרופיל אינו קיים או אינו ציבורי'
                  : 'This profile may not exist or is not public'}
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/">
            <PlugLogo size="sm" />
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            {isHebrew ? 'פרופיל מאומת' : 'Verified Profile'}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Profile Card */}
        <Card className="bg-gradient-to-br from-card to-primary/5 border-border overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center sm:text-start">
                <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                <p className="text-muted-foreground mt-1">
                  {isHebrew 
                    ? `${vouches.length} המלצות מקצועיות`
                    : `${vouches.length} professional endorsements`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endorsements */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5 text-primary" />
              {isHebrew ? 'המלצות מקצועיות' : 'Professional Endorsements'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vouches.length > 0 ? (
              <div className="space-y-4">
                {vouches.map((vouch) => (
                  <VouchCard key={vouch.id} vouch={vouch} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isHebrew ? 'אין המלצות ציבוריות עדיין' : 'No public endorsements yet'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            {isHebrew 
              ? 'פרופיל זה נוצר באמצעות '
              : 'This profile is powered by '}
            <Link to="/" className="text-primary hover:underline">Plug</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
