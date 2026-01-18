import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Trash2, Download, RefreshCw, CheckCircle, Sparkles, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';

interface ResumeUploadProps {
  onSuccess?: () => void;
  compact?: boolean;
}

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
  };
  education?: {
    highest?: string;
    certifications?: string[];
  };
  strengths?: string[];
  suggestedRoles?: string[];
  improvementTips?: string[];
  overallScore?: number;
}

export function ResumeUpload({ onSuccess, compact = false }: ResumeUploadProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  // Analyze resume with AI
  const analyzeResume = async (documentId: string, filePath: string, fileName: string) => {
    setIsAnalyzing(true);
    try {
      // Get signed URL for the file
      const { data: signedData } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 60 * 5); // 5 minutes

      if (!signedData?.signedUrl) {
        throw new Error('Failed to get file URL');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          fileUrl: signedData.signedUrl,
          fileName,
          documentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Analysis error:', errorData);
        toast.error(isRTL ? 'ניתוח הקו"ח נכשל, נסה שוב מאוחר יותר' : 'Resume analysis failed, try again later');
        return;
      }

      const { analysis } = await response.json();
      
      // Refresh the resume data to get the updated AI summary
      queryClient.invalidateQueries({ queryKey: ['resume', user?.id] });
      
      toast.success(isRTL ? 'ניתוח קו"ח הושלם! 🎉' : 'Resume analysis complete! 🎉');
      
      return analysis;
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(isRTL ? 'שגיאה בניתוח הקו"ח' : 'Error analyzing resume');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('User not authenticated');

      setIsUploading(true);
      setUploadProgress(20);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;
      setUploadProgress(50);

      // Delete old resume from documents table if exists
      if (existingResume) {
        await supabase.storage
          .from('resumes')
          .remove([existingResume.file_path]);
        
        await supabase
          .from('documents')
          .delete()
          .eq('id', existingResume.id);
      }
      setUploadProgress(70);

      // Save to documents table
      const { data: newDoc, error: dbError } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_type: fileExt,
          doc_type: 'cv',
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setUploadProgress(100);

      return { fileName, originalName: file.name, documentId: newDoc.id };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['resume', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(isRTL ? 'קורות החיים הועלו בהצלחה!' : 'Resume uploaded successfully!');
      setIsUploading(false);
      setUploadProgress(0);
      
      // Trigger AI analysis
      if (data.documentId) {
        await analyzeResume(data.documentId, data.fileName, data.originalName);
      }
      
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error(isRTL ? 'שגיאה בהעלאת הקובץ' : 'Error uploading file');
      setIsUploading(false);
      setUploadProgress(0);
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
    // Validate file type - PDF, Word, Excel
    const validTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (!validTypes.includes(file.type)) {
      toast.error(isRTL ? 'יש להעלות קובץ PDF, Word או Excel' : 'Please upload a PDF, Word, or Excel file');
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
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleInputChange}
          className="hidden"
        />
      </Button>
    );
  }

  const resumeSummary = existingResume?.ai_summary as ResumeSummary | null;

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

      {/* AI Analysis Summary */}
      {resumeSummary && (
        <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-accent" />
              <h4 className="font-semibold">{isRTL ? 'ניתוח AI' : 'AI Analysis'}</h4>
              {resumeSummary.overallScore && (
                <span className="ml-auto text-sm font-medium text-primary">
                  {isRTL ? `ציון: ${resumeSummary.overallScore}/100` : `Score: ${resumeSummary.overallScore}/100`}
                </span>
              )}
            </div>
            
            {/* Skills */}
            {resumeSummary.skills && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {isRTL ? 'מיומנויות' : 'Skills'}
                </p>
                <div className="flex flex-wrap gap-1">
                  {resumeSummary.skills.technical?.slice(0, 5).map((skill, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {skill}
                    </span>
                  ))}
                  {resumeSummary.skills.soft?.slice(0, 3).map((skill, i) => (
                    <span key={`soft-${i}`} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {resumeSummary.experience?.summary && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {isRTL ? 'ניסיון' : 'Experience'}
                </p>
                <p className="text-sm text-foreground">
                  {resumeSummary.experience.recentRole && (
                    <span className="font-medium">{resumeSummary.experience.recentRole}</span>
                  )}
                  {resumeSummary.experience.totalYears && (
                    <span className="text-muted-foreground">
                      {' · '}{resumeSummary.experience.totalYears} {isRTL ? 'שנים' : 'years'}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Suggested Roles */}
            {resumeSummary.suggestedRoles && resumeSummary.suggestedRoles.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {isRTL ? 'תפקידים מומלצים' : 'Suggested Roles'}
                </p>
                <div className="flex flex-wrap gap-1">
                  {resumeSummary.suggestedRoles.slice(0, 3).map((role, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {resumeSummary.strengths && resumeSummary.strengths.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {isRTL ? 'נקודות חוזק' : 'Strengths'}
                </p>
                <ul className="text-sm space-y-0.5">
                  {resumeSummary.strengths.slice(0, 3).map((strength, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <Sparkles className="w-3 h-3 text-accent mt-1 flex-shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analyzing indicator */}
      {isAnalyzing && (
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-accent animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {isRTL ? 'מנתח את קורות החיים...' : 'Analyzing your resume...'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'זה יכול לקחת כמה שניות' : 'This may take a few seconds'}
                </p>
              </div>
              <RefreshCw className="w-4 h-4 animate-spin text-accent" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {isRTL ? 'מעלה...' : 'Uploading...'} {uploadProgress}%
          </p>
        </div>
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
          ${isUploading || isAnalyzing ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
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
              PDF, DOC, DOCX, XLS, XLSX ({isRTL ? 'עד 10MB' : 'up to 10MB'})
            </p>
            <p className="text-xs text-accent mt-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              {isRTL ? 'ניתוח AI אוטומטי מיידי' : 'Instant AI analysis'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
