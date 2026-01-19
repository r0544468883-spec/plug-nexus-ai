import { useState, useRef } from 'react';
import { CVData } from './types';
import { templates, getTemplateById } from './templates';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Palette, Type, FileText } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CVPreviewPanelProps {
  data: CVData;
  onChange: (data: CVData) => void;
}

export const CVPreviewPanel = ({ data, onChange }: CVPreviewPanelProps) => {
  const { language } = useLanguage();
  const isHe = language === 'he';
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const currentTemplate = getTemplateById(data.settings.templateId);
  const TemplateComponent = currentTemplate?.component || templates[0].component;

  const updateSettings = (field: keyof CVData['settings'], value: string) => {
    onChange({
      ...data,
      settings: { ...data.settings, [field]: value },
    });
  };

  const exportToPDF = async () => {
    if (!previewRef.current) return;
    
    setIsExporting(true);
    toast.info(isHe ? 'מייצר PDF...' : 'Generating PDF...');
    
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data.personalInfo.fullName || 'resume'}.pdf`);
      
      toast.success(isHe ? 'PDF נוצר בהצלחה!' : 'PDF generated successfully!');
    } catch (error) {
      toast.error(isHe ? 'שגיאה ביצירת PDF' : 'Error generating PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Controls */}
      <div className="p-3 border-b bg-background flex flex-wrap gap-3 items-center">
        {/* Template Selector */}
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <Select value={data.settings.templateId} onValueChange={(v) => updateSettings('templateId', v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {isHe ? t.nameHe : t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Accent Color */}
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-muted-foreground" />
          <Input
            type="color"
            value={data.settings.accentColor}
            onChange={(e) => updateSettings('accentColor', e.target.value)}
            className="w-10 h-8 p-0 border-0 cursor-pointer"
          />
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-muted-foreground" />
          <Select value={data.settings.fontSize} onValueChange={(v) => updateSettings('fontSize', v as 'small' | 'medium' | 'large')}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">{isHe ? 'קטן' : 'Small'}</SelectItem>
              <SelectItem value="medium">{isHe ? 'בינוני' : 'Medium'}</SelectItem>
              <SelectItem value="large">{isHe ? 'גדול' : 'Large'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export Button */}
        <Button onClick={exportToPDF} disabled={isExporting} className="ml-auto">
          <Download className="w-4 h-4 mr-2" />
          {isHe ? 'הורד PDF' : 'Download PDF'}
        </Button>
      </div>

      {/* Preview */}
      <ScrollArea className="flex-1">
        <div className="p-6 flex justify-center">
          <div 
            ref={previewRef}
            className="shadow-xl bg-white"
            style={{ width: '210mm', minHeight: '297mm' }}
          >
            <TemplateComponent data={data} scale={1} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
