import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CVData, defaultCVData, Experience, colorPresets, fontFamilies } from './types';
import { CVEditorPanel } from './CVEditorPanel';
import { CVPreviewPanel } from './CVPreviewPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, CheckCircle, Loader2, Monitor, Sparkles, Download, Copy, Edit2 } from 'lucide-react';
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

// Build prompt from CV data for AI generation
function buildCVPrompt(data: CVData, language: string): string {
  const isHebrew = language === 'he';
  const preset = colorPresets[data.settings?.colorPreset] || colorPresets['default'] || { name: 'Default', primary: '#3b82f6', accent: '#10b981' };
  const font = fontFamilies[data.settings?.fontFamily] || fontFamilies['inter'] || { name: 'Inter' };
  
  let prompt = isHebrew 
    ? `צור קורות חיים מקצועיים ויזואליים בעברית עבור:\n\n`
    : `Create a professional, visually stunning CV for:\n\n`;
  
  // Personal Info
  prompt += `**${isHebrew ? 'פרטים אישיים' : 'Personal Information'}:**\n`;
  prompt += `- ${isHebrew ? 'שם' : 'Name'}: ${data.personalInfo.fullName || 'N/A'}\n`;
  prompt += `- ${isHebrew ? 'תפקיד' : 'Title'}: ${data.personalInfo.title || 'N/A'}\n`;
  prompt += `- ${isHebrew ? 'אימייל' : 'Email'}: ${data.personalInfo.email || 'N/A'}\n`;
  prompt += `- ${isHebrew ? 'טלפון' : 'Phone'}: ${data.personalInfo.phone || 'N/A'}\n`;
  prompt += `- ${isHebrew ? 'מיקום' : 'Location'}: ${data.personalInfo.location || 'N/A'}\n`;
  if (data.personalInfo.summary) {
    prompt += `- ${isHebrew ? 'תקציר' : 'Summary'}: ${data.personalInfo.summary}\n`;
  }
  
  // Experience
  if (data.experience.length > 0) {
    prompt += `\n**${isHebrew ? 'ניסיון תעסוקתי' : 'Work Experience'}:**\n`;
    data.experience.forEach((exp, i) => {
      prompt += `${i + 1}. ${exp.role} ${isHebrew ? 'ב' : 'at'} ${exp.company} (${exp.startDate} - ${exp.current ? (isHebrew ? 'היום' : 'Present') : exp.endDate})\n`;
      if (exp.bullets.length > 0) {
        exp.bullets.forEach(b => prompt += `   • ${b}\n`);
      }
    });
  }
  
  // Education
  if (data.education.length > 0) {
    prompt += `\n**${isHebrew ? 'השכלה' : 'Education'}:**\n`;
    data.education.forEach((edu, i) => {
      prompt += `${i + 1}. ${edu.degree} ${isHebrew ? 'ב' : 'in'} ${edu.field} - ${edu.institution} (${edu.startDate} - ${edu.endDate})\n`;
    });
  }
  
  // Skills
  if (data.skills.technical.length > 0 || data.skills.soft.length > 0) {
    prompt += `\n**${isHebrew ? 'כישורים' : 'Skills'}:**\n`;
    if (data.skills.technical.length > 0) {
      prompt += `- ${isHebrew ? 'טכניים' : 'Technical'}: ${data.skills.technical.join(', ')}\n`;
    }
    if (data.skills.soft.length > 0) {
      prompt += `- ${isHebrew ? 'רכים' : 'Soft'}: ${data.skills.soft.join(', ')}\n`;
    }
  }
  
  // Languages
  if (data.skills.languages.length > 0) {
    prompt += `\n**${isHebrew ? 'שפות' : 'Languages'}:**\n`;
    data.skills.languages.forEach(lang => {
      prompt += `- ${lang.name}: ${lang.level}\n`;
    });
  }
  
  // Design instructions
  prompt += `\n**${isHebrew ? 'הנחיות עיצוב' : 'Design Instructions'}:**\n`;
  prompt += `- ${isHebrew ? 'פלטת צבעים' : 'Color Palette'}: ${preset?.name || 'Default'} (Primary: ${preset?.primary || '#3b82f6'}, Accent: ${preset?.accent || '#10b981'})\n`;
  prompt += `- ${isHebrew ? 'פונט' : 'Font'}: ${font?.name || 'Inter'}\n`;
  prompt += `- ${isHebrew ? 'ריווח' : 'Spacing'}: ${data.settings?.spacing || 'comfortable'}\n`;
  prompt += `- ${isHebrew ? 'כיוון' : 'Orientation'}: ${data.settings?.orientation || 'portrait'}\n`;
  prompt += `- ${isHebrew ? 'גודל טקסט' : 'Font Size'}: ${data.settings?.fontSize || 'medium'}\n`;
  
  prompt += `\n${isHebrew 
    ? 'צור תמונה של קורות חיים מקצועיים, נקיים ומודרניים בפורמט A4. השתמש בצבעים ובפונט שצוינו.'
    : 'Create a professional, clean, modern CV image in A4 format. Use the specified colors and font.'}`;
  
  return prompt;
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
  
  // Prompt preview dialog state
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [editablePrompt, setEditablePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

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

  // Open prompt preview dialog
  const handleFinishClick = () => {
    const prompt = buildCVPrompt(cvData, language);
    setEditablePrompt(prompt);
    setShowPromptDialog(true);
  };

  // Generate CV image with AI
  const handleGenerateCV = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error(language === 'he' ? 'יש להתחבר לחשבון' : 'Please log in');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cv-generate-visual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          cvData,
          prompt: editablePrompt,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Generation failed');
      }

      if (result.imageUrl) {
        setGeneratedImage(result.imageUrl);
        setShowPromptDialog(false);
        setShowResultDialog(true);
        toast.success(language === 'he' ? 'קורות החיים נוצרו בהצלחה!' : 'CV generated successfully!');
      } else {
        throw new Error(language === 'he' ? 'לא התקבלה תמונה' : 'No image received');
      }
    } catch (error) {
      console.error('CV generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download generated image
  const handleDownloadCV = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `${cvData.personalInfo.fullName || 'CV'}_resume.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(editablePrompt);
    toast.success(language === 'he' ? 'הפרומפט הועתק!' : 'Prompt copied!');
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

      {/* Prompt Preview Dialog */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {language === 'he' ? 'תצוגת פרומפט' : 'Preview Prompt'}
            </DialogTitle>
            <DialogDescription>
              {language === 'he' 
                ? 'זה הפרומפט שיישלח ל-AI ליצירת קורות החיים. ניתן לערוך אותו לפני השליחה.'
                : 'This is the prompt that will be sent to AI to generate your CV. You can edit it before sending.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <Textarea
              value={editablePrompt}
              onChange={(e) => setEditablePrompt(e.target.value)}
              className="h-[300px] resize-none font-mono text-sm"
              dir={language === 'he' ? 'rtl' : 'ltr'}
            />
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleCopyPrompt} className="gap-2">
              <Copy className="w-4 h-4" />
              {language === 'he' ? 'העתק' : 'Copy'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setEditablePrompt(buildCVPrompt(cvData, language))}
              className="gap-2"
            >
              <Edit2 className="w-4 h-4" />
              {language === 'he' ? 'אפס' : 'Reset'}
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setShowPromptDialog(false)}>
              {language === 'he' ? 'ביטול' : 'Cancel'}
            </Button>
            <Button onClick={handleGenerateCV} disabled={isGenerating} className="gap-2">
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {language === 'he' ? 'צור קורות חיים' : 'Generate CV'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-accent" />
              {language === 'he' ? 'קורות החיים נוצרו!' : 'CV Generated!'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/30 rounded-lg p-4">
            {generatedImage && (
              <img 
                src={generatedImage} 
                alt="Generated CV" 
                className="max-w-full max-h-[60vh] object-contain rounded shadow-lg"
              />
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResultDialog(false)}>
              {language === 'he' ? 'סגור' : 'Close'}
            </Button>
            <Button onClick={handleDownloadCV} className="gap-2">
              <Download className="w-4 h-4" />
              {language === 'he' ? 'הורד' : 'Download'}
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
            <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-0.5 rounded">
              {language === 'he' ? 'תצוגה בלבד' : 'View Only'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <Save className="w-4 h-4 animate-pulse" />
                {language === 'he' ? 'שומר...' : 'Saving...'}
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle className="w-4 h-4 text-accent" />
                {language === 'he' ? 'נשמר' : 'Saved'}
              </>
            ) : null}
          </div>
          
          {/* Finish Button */}
          <Button onClick={handleFinishClick} className="gap-2">
            <Sparkles className="w-4 h-4" />
            {language === 'he' ? 'סיימתי - צור עם AI' : 'Finish - Generate with AI'}
          </Button>
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
