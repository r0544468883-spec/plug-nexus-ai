import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout, DashboardSection } from '@/components/dashboard/DashboardLayout';
import { VouchSection } from '@/components/vouch/VouchSection';
import { ResumeUpload } from '@/components/documents/ResumeUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Briefcase, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Profile() {
  const { user, profile, role, isLoading } = useAuth();
  const { language } = useLanguage();
  const [currentSection, setCurrentSection] = useState<DashboardSection>('overview');
  const isHebrew = language === 'he';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const getRoleLabel = () => {
    switch (role) {
      case 'job_seeker': return isHebrew ? 'מחפש עבודה' : 'Job Seeker';
      case 'freelance_hr': return isHebrew ? 'HR פרילנס' : 'Freelance HR';
      case 'inhouse_hr': return isHebrew ? 'HR פנים-ארגוני' : 'In-House HR';
      case 'company_employee': return isHebrew ? 'עובד חברה' : 'Company Employee';
      default: return '';
    }
  };

  const getRoleBadgeVariant = () => {
    switch (role) {
      case 'job_seeker': return 'default';
      case 'freelance_hr': return 'secondary';
      case 'inhouse_hr': return 'outline';
      default: return 'default';
    }
  };
  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/p/${user.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(isHebrew ? 'קישור הפרופיל הועתק!' : 'Profile link copied!');
    } catch {
      toast.error(isHebrew ? 'שגיאה בהעתקה' : 'Failed to copy');
    }
  };

  return (
    <DashboardLayout currentSection={currentSection} onSectionChange={setCurrentSection}>
      <div className="max-w-4xl mx-auto space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
        {/* Profile Header */}
        <Card className="bg-gradient-to-br from-card to-accent/5 border-border">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center sm:text-start">
                <h1 className="text-2xl font-bold mb-1">{profile?.full_name || 'User'}</h1>
                <Badge variant={getRoleBadgeVariant()} className="mb-3">
                  <Briefcase className="w-3 h-3 me-1" />
                  {getRoleLabel()}
                </Badge>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 mb-3"
                  onClick={handleShareProfile}
                >
                  <Share2 className="w-4 h-4" />
                  {isHebrew ? 'שתף פרופיל' : 'Share Profile'}
                </Button>
                
                <div className="flex flex-col sm:flex-row gap-3 text-sm text-muted-foreground">
                  {profile?.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{profile.email}</span>
                    </div>
                  )}
                  {profile?.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resume Section - Only for job seekers */}
        {role === 'job_seeker' && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                {isHebrew ? 'קורות חיים' : 'Resume'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResumeUpload />
            </CardContent>
          </Card>
        )}

        {/* Vouches Section */}
        {user && profile && (
          <VouchSection 
            userId={user.id} 
            userName={profile.full_name || 'User'} 
            showGiveVouch={false} 
          />
        )}
      </div>
    </DashboardLayout>
  );
}
