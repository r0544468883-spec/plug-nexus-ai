import { useState, useRef } from 'react';
import { CVData, colorPresets, fontFamilies, ColorPreset, FontFamily, Spacing, Orientation } from './types';
import { templates, getTemplateById } from './templates';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Palette, Type, FileText, LayoutTemplate, Maximize2, AlignJustify } from 'lucide-react';
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

  const updateSettings = <K extends keyof CVData['settings']>(field: K, value: CVData['settings'][K]) => {
    onChange({
      ...data,
      settings: { ...data.settings, [field]: value },
    });
  };

  const applyColorPreset = (preset: ColorPreset) => {
    const colors = colorPresets[preset];
    onChange({
      ...data,
      settings: { 
        ...data.settings, 
        colorPreset: preset,
        accentColor: colors.primary,
      },
    });
  };

  const exportToPDF = async () => {
    if (!previewRef.current) return;
    
    setIsExporting(true);
    toast.info(isHe ? 'מייצר PDF...' : 'Generating PDF...');
    
    try {
      const isLandscape = data.settings.orientation === 'landscape';
      
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
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

  const pageWidth = data.settings.orientation === 'landscape' ? '297mm' : '210mm';
  const pageHeight = data.settings.orientation === 'landscape' ? '210mm' : '297mm';

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Controls - 2 rows */}
      <div className="p-3 border-b bg-background space-y-2">
        {/* Row 1: Template, Preset, Accent Color */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Template Selector */}
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <Select value={data.settings.templateId} onValueChange={(v) => updateSettings('templateId', v)}>
              <SelectTrigger className="w-36">
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

          {/* Color Preset */}
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
            <Select value={data.settings.colorPreset} onValueChange={(v) => applyColorPreset(v as ColorPreset)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(colorPresets).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full border" 
                        style={{ backgroundColor: preset.primary }}
                      />
                      {isHe ? preset.nameHe : preset.name}
                    </div>
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
        </div>

        {/* Row 2: Font, Size, Spacing, Orientation, Export */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Font Family */}
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <Select value={data.settings.fontFamily} onValueChange={(v) => updateSettings('fontFamily', v as FontFamily)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(fontFamilies).map(([key, font]) => (
                  <SelectItem key={key} value={key}>
                    {isHe ? font.nameHe : font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
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

          {/* Spacing */}
          <div className="flex items-center gap-2">
            <AlignJustify className="w-4 h-4 text-muted-foreground" />
            <Select value={data.settings.spacing} onValueChange={(v) => updateSettings('spacing', v as Spacing)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">{isHe ? 'צפוף' : 'Compact'}</SelectItem>
                <SelectItem value="normal">{isHe ? 'רגיל' : 'Normal'}</SelectItem>
                <SelectItem value="spacious">{isHe ? 'מרווח' : 'Spacious'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orientation */}
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
            <Select value={data.settings.orientation} onValueChange={(v) => updateSettings('orientation', v as Orientation)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">{isHe ? 'לאורך' : 'Portrait'}</SelectItem>
                <SelectItem value="landscape">{isHe ? 'לרוחב' : 'Landscape'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <Button onClick={exportToPDF} disabled={isExporting} className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            {isHe ? 'הורד PDF' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Preview */}
      <ScrollArea className="flex-1">
        <div className="p-6 flex justify-center">
          <div 
            ref={previewRef}
            className="shadow-xl bg-white"
            style={{ 
              width: pageWidth, 
              minHeight: pageHeight,
              fontFamily: fontFamilies[data.settings.fontFamily]?.stack || "'Inter', sans-serif",
            }}
          >
            <TemplateComponent data={data} scale={1} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
