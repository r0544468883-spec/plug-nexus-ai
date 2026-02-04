import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CVData, defaultCVData, Experience } from './types';
import { CVEditorPanel } from './CVEditorPanel';
import { CVPreviewPanel } from './CVPreviewPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, CheckCircle, Loader2, Monitor } from 'lucide-react';
import { debounce } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResumeSummary {
  skills?: {
    technical?: string[];
    soft?: string[];
    languages?: string[];
  };
  experience?: {
    totalYears?: number;
    summary?: string;
    recentRole?: string;
    positions?: Array<{
      company?: string;
      role?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
    }>;
  };
  education?: {
    highest?: string;
    certifications?: string[];
    institutions?: Array<{
      name?: string;
      degree?: string;
      field?: string;
      startDate?: string;
      endDate?: string;
    }>;
  };
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  strengths?: string[];
  suggestedRoles?: string[];
}

export const CVBuilder = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const [cvData, setCvData] = useState<CVData>(defaultCVData);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);

  // Show mobile warning on mount if on mobile
  useEffect(() => {
    if (isMobile) {
      setShowMobileWarning(true);
    }
  }, [isMobile]);

  // Load CV data from profile and existing resume
  useEffect(() => {
    const loadCvData = async () => {
      if (!user) return;
      setIsLoadingResume(true);
      
      try {
        // First check if cv_data already exists
        const { data: cvProfile } = await supabase
          .from('profiles')
          .select('cv_data, full_name, email, phone')
          .eq('user_id', user.id)
          .single();
        
        if (cvProfile?.cv_data && typeof cvProfile.cv_data === 'object' && Object.keys(cvProfile.cv_data).length > 0) {
          setCvData(cvProfile.cv_data as unknown as CVData);
          setIsLoadingResume(false);
          return;
        }
        
        // If no cv_data, check for uploaded resume with AI analysis
        const { data: resumeDoc } = await supabase
          .from('documents')
          .select('ai_summary')
          .eq('owner_id', user.id)
          .eq('doc_type', 'cv')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (resumeDoc?.ai_summary) {
          const summary = resumeDoc.ai_summary as ResumeSummary;
          
          // Convert resume analysis to CV data
          const experiences: Experience[] = summary.experience?.positions?.map((pos, idx) => ({
            id: `exp-${idx}`,
            company: pos.company || '',
            role: pos.role || '',
            startDate: pos.startDate || '',
            endDate: pos.endDate || null,
            current: !pos.endDate || pos.endDate.toLowerCase().includes('present'),
            bullets: pos.description ? pos.description.split('\n').filter(Boolean) : [],
          })) || [];
          
          const educations = summary.education?.institutions?.map((inst, idx) => ({
            id: `edu-${idx}`,
            institution: inst.name || '',
            degree: inst.degree || '',
            field: inst.field || '',
            startDate: inst.startDate || '',
            endDate: inst.endDate || '',
          })) || [];
          
          const newCvData: CVData = {
            ...defaultCVData,
            personalInfo: {
              fullName: summary.personalInfo?.name || cvProfile?.full_name || '',
              title: summary.experience?.recentRole || '',
              email: summary.personalInfo?.email || cvProfile?.email || '',
              phone: summary.personalInfo?.phone || cvProfile?.phone || '',
              location: summary.personalInfo?.location || '',
              summary: summary.experience?.summary || '',
            },
            experience: experiences,
            education: educations,
            skills: {
              technical: summary.skills?.technical || [],
              soft: summary.skills?.soft || [],
              languages: summary.skills?.languages?.map(lang => ({
                name: lang,
                level: 'intermediate' as const,
              })) || [],
            },
          };
          
          setCvData(newCvData);
          
          // Auto-save the loaded data
          await supabase
            .from('profiles')
            .update({ cv_data: JSON.parse(JSON.stringify(newCvData)) })
            .eq('user_id', user.id);
            
          toast.success(language === 'he' ? 'קורות החיים נטענו מהקובץ שהעלית!' : 'CV loaded from your uploaded resume!');
        } else if (cvProfile) {
          // Fallback to basic profile data
          setCvData({
            ...defaultCVData,
            personalInfo: {
              ...defaultCVData.personalInfo,
              fullName: cvProfile.full_name || '',
              email: cvProfile.email || '',
              phone: cvProfile.phone || '',
            },
          });
        }
      } catch (error) {
        console.error('Error loading CV data:', error);
      } finally {
        setIsLoadingResume(false);
      }
    };
    
    loadCvData();
  }, [user, language]);

  // Debounced save
  const saveToDatabase = useCallback(
    debounce(async (data: CVData) => {
      if (!user) return;
      setIsSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ cv_data: JSON.parse(JSON.stringify(data)) })
        .eq('user_id', user.id);
      
      setIsSaving(false);
      
      if (error) {
        toast.error(language === 'he' ? 'שגיאה בשמירה' : 'Error saving');
      } else {
        setLastSaved(new Date());
      }
    }, 2000),
    [user, language]
  );

  const handleDataChange = (newData: CVData) => {
    setCvData(newData);
    saveToDatabase(newData);
  };

  const handleContinueToView = () => {
    setViewOnlyMode(true);
    setShowMobileWarning(false);
  };

  if (isLoadingResume) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {language === 'he' ? 'טוען קורות חיים...' : 'Loading resume...'}
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col" data-tour="cv-builder">
      {/* Mobile Warning Dialog */}
      <Dialog open={showMobileWarning} onOpenChange={setShowMobileWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Monitor className="w-8 h-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center">
              {language === 'he' ? 'מסך קטן לעריכה' : 'Screen Too Small for Editing'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {language === 'he' 
                ? 'בונה קורות החיים מיועד לצפייה בלבד במובייל. לעריכה מלאה, השתמש במחשב או טאבלט.'
                : 'The CV Builder is view-only on mobile. For full editing, please use a desktop or tablet.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleContinueToView} className="w-full">
              {language === 'he' ? 'צפה בתצוגה מקדימה' : 'View Preview Only'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">
            {language === 'he' ? 'בונה קורות חיים' : 'CV Builder'}
          </h1>
          {viewOnlyMode && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
              {language === 'he' ? 'תצוגה בלבד' : 'View Only'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving ? (
            <>
              <Save className="w-4 h-4 animate-pulse" />
              {language === 'he' ? 'שומר...' : 'Saving...'}
            </>
          ) : lastSaved ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              {language === 'he' ? 'נשמר' : 'Saved'}
            </>
          ) : null}
        </div>
      </div>

      {/* Main Content - Different layouts for mobile/desktop */}
      {isMobile ? (
        // Mobile: Show only preview if in view-only mode
        viewOnlyMode ? (
          <div className="flex-1 overflow-hidden">
            <CVPreviewPanel data={cvData} onChange={handleDataChange} />
          </div>
        ) : (
          // Mobile: Vertical layout - Editor on top, Preview on bottom
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-1/2 border-b overflow-hidden">
              <CVEditorPanel data={cvData} onChange={handleDataChange} />
            </div>
            <div className="h-1/2 overflow-hidden">
              <CVPreviewPanel data={cvData} onChange={handleDataChange} />
            </div>
          </div>
        )
      ) : (
        // Desktop: Horizontal resizable layout
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={40} minSize={30}>
            <CVEditorPanel data={cvData} onChange={handleDataChange} />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={60} minSize={40}>
            <CVPreviewPanel data={cvData} onChange={handleDataChange} />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
};
