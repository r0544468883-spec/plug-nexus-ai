import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CVData, defaultCVData } from './types';
import { CVEditorPanel } from './CVEditorPanel';
import { CVPreviewPanel } from './CVPreviewPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { toast } from 'sonner';
import { Save, CheckCircle } from 'lucide-react';
import { debounce } from '@/lib/utils';

export const CVBuilder = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [cvData, setCvData] = useState<CVData>(defaultCVData);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load CV data from profile
  useEffect(() => {
    const loadCvData = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('cv_data, full_name, email, phone')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.cv_data && typeof profile.cv_data === 'object' && Object.keys(profile.cv_data).length > 0) {
        setCvData(profile.cv_data as unknown as CVData);
      } else if (profile) {
        // Pre-fill from profile
        setCvData({
          ...defaultCVData,
          personalInfo: {
            ...defaultCVData.personalInfo,
            fullName: profile.full_name || '',
            email: profile.email || '',
            phone: profile.phone || '',
          },
        });
      }
    };
    
    loadCvData();
  }, [user]);

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

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <h1 className="text-lg font-bold">
          {language === 'he' ? 'בונה קורות חיים' : 'CV Builder'}
        </h1>
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

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={40} minSize={30}>
          <CVEditorPanel data={cvData} onChange={handleDataChange} />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={60} minSize={40}>
          <CVPreviewPanel data={cvData} onChange={handleDataChange} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
