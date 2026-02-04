import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Upload, Edit3, RefreshCw, Loader2, Check, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface AIDesignPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  css: string;
  onRequestChange?: (instruction: string) => void;
}

export const AIDesignPreview = ({ 
  open, 
  onOpenChange, 
  html, 
  css,
  onRequestChange 
}: AIDesignPreviewProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isHe = language === 'he';
  
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeInstruction, setChangeInstruction] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [editableHtml, setEditableHtml] = useState(html);
  
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Combine HTML with CSS
  const fullHtml = css 
    ? html.replace('</head>', `<style>${css}</style></head>`)
    : html;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Create a temporary container with the HTML
      const container = document.createElement('div');
      container.innerHTML = showHtmlEditor ? editableHtml : fullHtml;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '210mm';
      container.style.minHeight = '297mm';
      container.style.backgroundColor = 'white';
      document.body.appendChild(container);

      // Wait for any images to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture as canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123, // A4 height in pixels at 96 DPI
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

      // Download
      pdf.save('cv-ai-design.pdf');
      toast.success(isHe ? 'ה-PDF הורד בהצלחה!' : 'PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(isHe ? 'שגיאה ביצוא PDF' : 'Error exporting PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Create PDF blob
      const container = document.createElement('div');
      container.innerHTML = showHtmlEditor ? editableHtml : fullHtml;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '210mm';
      container.style.minHeight = '297mm';
      container.style.backgroundColor = 'white';
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
      });

      document.body.removeChild(container);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      const pdfBlob = pdf.output('blob');

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}_ai-cv.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('generated-cvs')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('generated-cvs')
        .getPublicUrl(fileName);

      setSavedUrl(publicUrl);
      toast.success(isHe ? 'נשמר לפרופיל!' : 'Saved to profile!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(isHe ? 'שגיאה בשמירה' : 'Error saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestChange = () => {
    if (changeInstruction.trim() && onRequestChange) {
      onRequestChange(changeInstruction);
      setShowChangeRequest(false);
      setChangeInstruction('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            {isHe ? 'תצוגה מקדימה של העיצוב' : 'Design Preview'}
          </DialogTitle>
          <DialogDescription>
            {isHe 
              ? 'בדוק את העיצוב שנוצר, ערוך או הורד כ-PDF'
              : 'Review the generated design, edit or download as PDF'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2 py-2 border-b flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHtmlEditor(!showHtmlEditor)}
              className="gap-2"
            >
              <Code className="w-4 h-4" />
              {showHtmlEditor 
                ? (isHe ? 'תצוגה מקדימה' : 'Preview')
                : (isHe ? 'ערוך HTML' : 'Edit HTML')}
            </Button>
            
            {onRequestChange && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChangeRequest(!showChangeRequest)}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {isHe ? 'בקש שינוי' : 'Request Change'}
              </Button>
            )}
            
            <div className="flex-1" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveToProfile}
              disabled={isSaving || !!savedUrl}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedUrl ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isHe ? 'שמור לפרופיל' : 'Save to Profile'}
            </Button>
            
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isHe ? 'הורד PDF' : 'Download PDF'}
            </Button>
          </div>

          {/* Change Request Input */}
          {showChangeRequest && (
            <div className="py-3 space-y-2 border-b">
              <Label>{isHe ? 'מה תרצה לשנות?' : 'What would you like to change?'}</Label>
              <div className="flex gap-2">
                <Textarea
                  value={changeInstruction}
                  onChange={(e) => setChangeInstruction(e.target.value)}
                  placeholder={isHe 
                    ? 'לדוגמה: הפוך את הצבע לכחול יותר, הגדל את הפונט...'
                    : 'e.g., Make the color more blue, increase font size...'}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleRequestChange} disabled={!changeInstruction.trim()}>
                  {isHe ? 'שלח' : 'Send'}
                </Button>
              </div>
            </div>
          )}

          {/* Preview/Editor Area */}
          <div className="flex-1 overflow-auto py-4 min-h-0">
            {showHtmlEditor ? (
              <Textarea
                value={editableHtml}
                onChange={(e) => setEditableHtml(e.target.value)}
                className="w-full h-full font-mono text-xs resize-none"
                dir="ltr"
              />
            ) : (
              <div className="flex justify-center">
                <div 
                  className="bg-white shadow-xl border"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    transform: 'scale(0.6)',
                    transformOrigin: 'top center',
                  }}
                >
                  <iframe
                    ref={previewRef}
                    srcDoc={showHtmlEditor ? editableHtml : fullHtml}
                    className="w-full h-full border-0"
                    style={{ minHeight: '297mm' }}
                    title="CV Preview"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isHe ? 'סגור' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
