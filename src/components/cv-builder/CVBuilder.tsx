import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CVData, defaultCVData, Experience, fontFamilies } from './types';
import { CVEditorPanel } from './CVEditorPanel';
import { CVPreviewPanel } from './CVPreviewPanel';
import { CVImportWizard } from './CVImportWizard';
import { AIDesignDialog } from './AIDesignDialog';
import { AIDesignPreview } from './AIDesignPreview';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, CheckCircle, Loader2, Monitor, FileText, Upload as UploadIcon, Download, Sparkles, Wand2 } from 'lucide-react';
import { debounce } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getTemplateById } from './templates';

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
  
  // Import wizard state
  const [showImportWizard, setShowImportWizard] = useState(false);
  
  // AI Design state
  const [showAIDesignDialog, setShowAIDesignDialog] = useState(false);
  const [showAIDesignPreview, setShowAIDesignPreview] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [generatedCss, setGeneratedCss] = useState('');
  
  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingToProfile, setIsSavingToProfile] = useState(false);
  const [savedCVUrl, setSavedCVUrl] = useState<string | null>(null);
  const [exportedPdfBlob, setExportedPdfBlob] = useState<Blob | null>(null);
  
  // Ref for the CV preview rendering
  const cvRenderRef = useRef<HTMLDivElement>(null);

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

  // Open export dialog and generate PDF from template
  const handleExportClick = async () => {
    setShowExportDialog(true);
    setIsExporting(false); // Start with false so template renders immediately
    setSavedCVUrl(null);
    setExportedPdfBlob(null);
    
    // Wait for dialog and template to render
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setIsExporting(true); // Show loading state while generating PDF
    
    try {
      // Wait a bit more for the isExporting state to not affect the ref
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const renderElement = cvRenderRef.current;
      if (!renderElement) {
        console.error('CV render element not found, retrying...');
        // Retry after a delay
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!cvRenderRef.current) {
          throw new Error('CV render element not found');
        }
      }
      
      // Capture the template as canvas
      const canvas = await html2canvas(cvRenderRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      // Create PDF from canvas
      const isLandscape = cvData.settings.orientation === 'landscape';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL('image/png');
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Store blob for later download/save
      const pdfBlob = pdf.output('blob');
      setExportedPdfBlob(pdfBlob);
      
      toast.success(language === 'he' ? 'קורות החיים מוכנים להורדה!' : 'CV ready for download!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(language === 'he' ? 'שגיאה ביצירת PDF' : 'Error creating PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = () => {
    if (!exportedPdfBlob) return;
    
    const url = URL.createObjectURL(exportedPdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cvData.personalInfo.fullName || 'CV'}_resume.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(language === 'he' ? 'ה-PDF הורד בהצלחה!' : 'PDF downloaded!');
  };

  // Save CV to profile (storage)
  const handleSaveToProfile = async () => {
    if (!exportedPdfBlob || !user) return;
    
    setIsSavingToProfile(true);
    try {
      // Upload PDF to storage
      const fileName = `${user.id}/${Date.now()}_cv.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('generated-cvs')
        .upload(fileName, exportedPdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('generated-cvs')
        .getPublicUrl(fileName);
      
      setSavedCVUrl(publicUrl);
      toast.success(language === 'he' ? 'קורות החיים נשמרו לפרופיל!' : 'CV saved to profile!');
    } catch (error) {
      console.error('Save to profile error:', error);
      toast.error(language === 'he' ? 'שגיאה בשמירה' : 'Error saving');
    } finally {
      setIsSavingToProfile(false);
    }
  };

  // Handle import wizard completion
  const handleImportComplete = (importedData: CVData) => {
    setCvData(importedData);
    saveToDatabase(importedData);
  };

  // Handle AI Design generation
  const handleAIDesignGenerated = (html: string, css: string) => {
    setGeneratedHtml(html);
    setGeneratedCss(css);
    setShowAIDesignPreview(true);
  };

  // Get current template component
  const currentTemplate = getTemplateById(cvData.settings.templateId);
  const TemplateComponent = currentTemplate?.component;

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

      {/* Export Dialog - Using Template Rendering */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {language === 'he' ? 'ייצוא קורות חיים' : 'Export CV'}
            </DialogTitle>
            <DialogDescription>
              {language === 'he' 
                ? 'קורות החיים שלך מוכנים להורדה או שמירה לפרופיל'
                : 'Your CV is ready for download or saving to your profile'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/30 rounded-lg p-4 min-h-[400px] relative">
            {/* Always render the template for ref capture, but overlay loading state */}
            <div 
              ref={cvRenderRef}
              className="bg-white shadow-xl"
              style={{
                width: cvData.settings.orientation === 'landscape' ? '297mm' : '210mm',
                minHeight: cvData.settings.orientation === 'landscape' ? '210mm' : '297mm',
                fontFamily: fontFamilies[cvData.settings.fontFamily]?.stack || "'Inter', sans-serif",
                transform: 'scale(0.5)',
                transformOrigin: 'top center',
                opacity: isExporting ? 0 : 1,
                transition: 'opacity 0.3s',
              }}
            >
              {TemplateComponent && <TemplateComponent data={cvData} scale={1} />}
            </div>
            
            {/* Overlay loading indicator */}
            {isExporting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground mt-3">
                  {language === 'he' ? 'מייצר PDF...' : 'Generating PDF...'}
                </p>
              </div>
            )}
          </div>

          {savedCVUrl && (
            <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span className="text-sm text-accent">
                {language === 'he' ? 'נשמר לפרופיל!' : 'Saved to profile!'}
              </span>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              {language === 'he' ? 'סגור' : 'Close'}
            </Button>
            
            <div className="flex gap-2 flex-wrap">
              {/* Save to Profile */}
              <Button 
                variant="outline" 
                onClick={handleSaveToProfile} 
                disabled={isSavingToProfile || !!savedCVUrl || isExporting || !exportedPdfBlob}
                className="gap-2"
              >
                {isSavingToProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedCVUrl ? (
                  <CheckCircle className="w-4 h-4 text-accent" />
                ) : (
                  <UploadIcon className="w-4 h-4" />
                )}
                {language === 'he' ? 'שמור לפרופיל' : 'Save to Profile'}
              </Button>

              {/* Download as PDF */}
              <Button 
                onClick={handleDownloadPDF} 
                disabled={isExporting || !exportedPdfBlob}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {language === 'he' ? 'הורד PDF' : 'Download PDF'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Wizard */}
      <CVImportWizard
        open={showImportWizard}
        onOpenChange={setShowImportWizard}
        onComplete={handleImportComplete}
        currentData={cvData}
      />

      {/* AI Design Dialog */}
      <AIDesignDialog
        open={showAIDesignDialog}
        onOpenChange={setShowAIDesignDialog}
        cvData={cvData}
        onDesignGenerated={handleAIDesignGenerated}
      />

      {/* AI Design Preview */}
      <AIDesignPreview
        open={showAIDesignPreview}
        onOpenChange={setShowAIDesignPreview}
        html={generatedHtml}
        css={generatedCss}
      />

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
          
          {/* Import Button */}
          <Button variant="outline" onClick={() => setShowImportWizard(true)} className="gap-2">
            <Sparkles className="w-4 h-4" />
            {language === 'he' ? 'ייבוא חכם' : 'Smart Import'}
          </Button>
          
          {/* AI Design Button */}
          <Button variant="outline" onClick={() => setShowAIDesignDialog(true)} className="gap-2 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:border-primary/50">
            <Wand2 className="w-4 h-4 text-primary" />
            {language === 'he' ? 'עיצוב AI' : 'AI Design'}
          </Button>
          
          {/* Export Button */}
          <Button onClick={handleExportClick} className="gap-2">
            <FileText className="w-4 h-4" />
            {language === 'he' ? 'ייצא PDF' : 'Export PDF'}
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
