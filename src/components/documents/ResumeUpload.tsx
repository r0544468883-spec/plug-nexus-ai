import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Trash2, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ResumeUploadProps {
  onSuccess?: () => void;
  compact?: boolean;
}

export function ResumeUpload({ onSuccess, compact = false }: ResumeUploadProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isRTL = language === 'he';

  // Fetch existing resume
  const { data: existingResume, isLoading } = useQuery({
    queryKey: ['resume', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', user.id)
        .eq('doc_type', 'cv')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('User not authenticated');

      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Delete old resume from documents table if exists
      if (existingResume) {
        // Delete old file from storage
        await supabase.storage
          .from('resumes')
          .remove([existingResume.file_path]);
        
        // Delete old record
        await supabase
          .from('documents')
          .delete()
          .eq('id', existingResume.id);
      }

      // Save to documents table
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_type: fileExt,
          doc_type: 'cv',
        });

      if (dbError) throw dbError;

      return { fileName, originalName: file.name };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(isRTL ? 'קורות החיים הועלו בהצלחה!' : 'Resume uploaded successfully!');
      onSuccess?.();
      setIsUploading(false);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error(isRTL ? 'שגיאה בהעלאת הקובץ' : 'Error uploading file');
      setIsUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!existingResume || !user?.id) return;

      // Delete from storage
      await supabase.storage
        .from('resumes')
        .remove([existingResume.file_path]);

      // Delete from documents
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', existingResume.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume', user?.id] });
      toast.success(isRTL ? 'קורות החיים נמחקו' : 'Resume deleted');
    },
    onError: () => {
      toast.error(isRTL ? 'שגיאה במחיקת הקובץ' : 'Error deleting file');
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error(isRTL ? 'יש להעלות קובץ PDF או Word' : 'Please upload a PDF or Word file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(isRTL ? 'הקובץ גדול מדי (מקסימום 10MB)' : 'File is too large (max 10MB)');
      return;
    }

    uploadMutation.mutate(file);
  }, [uploadMutation, isRTL]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  }, [handleFileSelect]);

  const handleDownload = async () => {
    if (!existingResume) return;

    const { data, error } = await supabase.storage
      .from('resumes')
      .download(existingResume.file_path);

    if (error) {
      toast.error(isRTL ? 'שגיאה בהורדת הקובץ' : 'Error downloading file');
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = existingResume.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Compact mode for WelcomeCard
  if (compact) {
    if (existingResume) {
      return (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm text-foreground truncate flex-1">
            {existingResume.file_name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 px-2"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="gap-2"
      >
        {isUploading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {isRTL ? 'העלה קו"ח' : 'Upload CV'}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleInputChange}
          className="hidden"
        />
      </Button>
    );
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Existing Resume Display */}
      {existingResume && (
        <Card className="bg-card border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {existingResume.file_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'הועלה ב-' : 'Uploaded on '}
                  {new Date(existingResume.created_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all
          ${isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-accent/5'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <RefreshCw className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-muted-foreground" />
          )}
          
          <div>
            <p className="font-medium text-foreground">
              {existingResume 
                ? (isRTL ? 'החלף קורות חיים' : 'Replace Resume')
                : (isRTL ? 'גרור קובץ או לחץ להעלאה' : 'Drag & drop or click to upload')
              }
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF, DOC, DOCX ({isRTL ? 'עד 10MB' : 'up to 10MB'})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
