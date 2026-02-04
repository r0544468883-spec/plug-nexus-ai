import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, User, Loader2, Paperclip, Mic, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface PlugChatProps {
  initialMessage?: string;
  onMessageSent?: () => void;
}

export function PlugChat({ initialMessage, onMessageSent }: PlugChatProps = {}) {
  const { t, direction } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [uploadedAttachmentSummary, setUploadedAttachmentSummary] = useState<any>(null);
  const [hasProcessedInitial, setHasProcessedInitial] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's resume for context
  const { data: existingResume } = useQuery({
    queryKey: ['resume-for-chat', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_id', user.id)
        .eq('doc_type', 'cv')
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's applications with job details
  const { data: userApplications } = useQuery({
    queryKey: ['applications-for-chat', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Note: Explicitly exclude internal_notes from candidate queries for security
      const { data } = await supabase
        .from('applications')
        .select(`
          id, status, current_stage, match_score, notes, created_at,
          jobs:job_id (id, title, location, job_type, salary_range, company:company_id (name))
        `)
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false });
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch upcoming interviews
  const { data: upcomingInterviews } = useQuery({
    queryKey: ['interviews-for-chat', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get user's application IDs first
      const { data: apps } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', user.id);
      
      if (!apps || apps.length === 0) return [];
      
      const appIds = apps.map(a => a.id);
      
      const { data } = await supabase
        .from('interview_reminders')
        .select('*')
        .in('application_id', appIds)
        .gte('interview_date', new Date().toISOString())
        .order('interview_date', { ascending: true });
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's vouches
  const { data: userVouches } = useQuery({
    queryKey: ['vouches-for-chat', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('vouches')
        .select('id, vouch_type, skills, message')
        .eq('to_user_id', user.id)
        .eq('is_public', true);
      return data;
    },
    enabled: !!user?.id,
  });

  // Load chat history on mount
  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  // Handle initial message from WelcomeCard
  useEffect(() => {
    if (initialMessage && !hasProcessedInitial && user) {
      setHasProcessedInitial(true);
      setTimeout(() => {
        sendMessage(initialMessage);
        onMessageSent?.();
      }, 100);
    }
  }, [initialMessage, hasProcessedInitial, user]);

  // Reset when initialMessage changes
  useEffect(() => {
    if (!initialMessage) {
      setHasProcessedInitial(false);
    }
  }, [initialMessage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .is('context', null) // Only load general chat, not application-specific
      .order('created_at', { ascending: true })
      .limit(50);

    if (!error && data) {
      setMessages(data.map(msg => ({
        id: msg.id,
        content: msg.message,
        sender: msg.sender as 'user' | 'ai',
        timestamp: new Date(msg.created_at),
      })));
    }
  };

  const saveMessage = async (content: string, sender: 'user' | 'ai') => {
    if (!user) return;

    await supabase
      .from('chat_history')
      .insert({
        user_id: user.id,
        message: content,
        sender,
      });
  };

  const analyzeUploadedFile = async (documentId: string, filePath: string, fileName: string) => {
    // Reuse the existing resume analyzer to extract structured content.
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) throw new Error('No active session - please log in');

    const { data: signedData, error: signedErr } = await supabase.storage
      .from('resumes')
      .createSignedUrl(filePath, 60 * 5);

    if (signedErr || !signedData?.signedUrl) {
      throw new Error('Failed to get file URL');
    }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fileUrl: signedData.signedUrl,
        fileName,
        documentId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to analyze file');
    }

    const json = await res.json();
    return json?.analysis;
  };

  const handleAttachmentPicked = async (file: File) => {
    if (!user?.id) {
      toast.error(direction === 'rtl' ? 'צריך להתחבר כדי להעלות קובץ' : 'Please log in to upload files');
      return;
    }

    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];

    if (!validTypes.includes(file.type)) {
      toast.error(direction === 'rtl' ? 'אפשר להעלות PDF / Word / Excel / TXT' : 'Please upload PDF / Word / Excel / TXT');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(direction === 'rtl' ? 'הקובץ גדול מדי (מקסימום 10MB)' : 'File is too large (max 10MB)');
      return;
    }

    setIsUploadingAttachment(true);
    setUploadedAttachmentSummary(null);

    try {
      const fileExt = file.name.split('.').pop();
      const storagePath = `${user.id}/plug/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: newDoc, error: dbError } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,
          file_name: file.name,
          file_path: storagePath,
          file_type: fileExt,
          doc_type: 'plug_attachment',
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      // Analyze (best effort) so Plug can use a structured summary
      const analysis = await analyzeUploadedFile(newDoc.id, storagePath, file.name);
      setUploadedAttachmentSummary({ fileName: file.name, analysis });

      toast.success(direction === 'rtl' ? 'הקובץ הועלה ונותח ✅' : 'File uploaded & analyzed ✅');
    } catch (e) {
      console.error('Plug attachment upload error:', e);
      toast.error(direction === 'rtl' ? 'שגיאה בהעלאת/ניתוח הקובץ' : 'Failed to upload/analyze file');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const streamAIResponse = async (userMessages: { role: string; content: string }[]): Promise<string> => {
    abortControllerRef.current = new AbortController();
    
    // Build comprehensive context with all user data
    const context: Record<string, unknown> = {};
    
    // Add resume summary
    if (existingResume?.ai_summary && typeof existingResume.ai_summary === 'object') {
      context.resumeSummary = existingResume.ai_summary;
    }

    // Add applications data
    if (userApplications && userApplications.length > 0) {
      context.applications = userApplications.map(app => ({
        jobTitle: (app.jobs as any)?.title || 'Unknown',
        company: (app.jobs as any)?.company?.name || 'Unknown',
        location: (app.jobs as any)?.location,
        jobType: (app.jobs as any)?.job_type,
        status: app.status,
        stage: app.current_stage,
        matchScore: app.match_score,
        appliedAt: app.created_at,
        notes: app.notes,
      }));
    }

    // Add upcoming interviews
    if (upcomingInterviews && upcomingInterviews.length > 0) {
      context.upcomingInterviews = upcomingInterviews.map(i => ({
        date: i.interview_date,
        type: i.interview_type,
        location: i.location,
        notes: i.notes,
      }));
    }

    // Add vouches summary
    if (userVouches && userVouches.length > 0) {
      context.vouches = {
        total: userVouches.length,
        types: userVouches.reduce((acc, v) => {
          acc[v.vouch_type] = (acc[v.vouch_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        skills: [...new Set(userVouches.flatMap(v => v.skills || []))],
      };
    }

    // Add any uploaded attachment summary (from Plug attachments)
    if (uploadedAttachmentSummary?.analysis) {
      context.uploadedAttachment = uploadedAttachmentSummary;
    }

    // Get the user's session token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      throw new Error('No active session - please log in');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plug-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ 
        messages: userMessages,
        context: Object.keys(context).length > 0 ? context : undefined,
      }),
      signal: abortControllerRef.current.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get AI response');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            // Update the last message with streaming content
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.sender === 'ai') {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: fullContent } : m
                );
              }
              return [...prev, {
                id: (Date.now() + 1).toString(),
                content: fullContent,
                sender: 'ai' as const,
                timestamp: new Date(),
              }];
            });
          }
        } catch {
          // Incomplete JSON, put back and wait
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    return fullContent;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await saveMessage(userMessage.content, 'user');

      // Build message history for context
      const recentMessages = messages.slice(-10).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      recentMessages.push({ role: 'user', content: userMessage.content });

      const aiResponse = await streamAIResponse(recentMessages);
      await saveMessage(aiResponse, 'ai');
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      const isRTL = direction === 'rtl';
      
      // Check if it's a session/auth error - show humorous message
      if (errorMessage.includes('No active session') || errorMessage.includes('log in') || errorMessage.includes('Unauthorized')) {
        toast.error(
          isRTL 
            ? '🔌 אופס! הכבל שלי התנתק...' 
            : '🔌 Oops! My cable got unplugged...',
          {
            description: isRTL 
              ? 'אני עובד על לחבר את עצמי מחדש. נסה שוב בעוד רגע!'
              : "I'm working on reconnecting myself. Try again in a moment!",
          }
        );
      } else {
        toast.error(errorMessage);
      }
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: errorMessage.includes('No active session') || errorMessage.includes('Unauthorized')
          ? (isRTL ? '🔌 אוי, מישהו שלף לי את החשמל! עובד על לחבר את עצמי מחדש...' : "🔌 Oh no, someone unplugged me! Working on reconnecting...")
          : (t('plug.error') || 'Sorry, I encountered an error. Please try again.'),
        sender: 'ai',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    await sendMessage(input);
  };

  const showGreeting = messages.length === 0;

  return (
    <div ref={chatContainerRef} data-tour="plug-chat" className="flex flex-col h-[600px] rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">Plug</h3>
          <p className="text-xs text-muted-foreground">Your AI HR Assistant</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showGreeting && (
          <div className="flex justify-center py-8">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h4 className="font-semibold text-lg mb-2">{t('plug.greeting')}</h4>
              <p className="text-muted-foreground text-sm">
                Ask me anything about candidates, jobs, documents, or HR processes!
              </p>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ 
                duration: 0.3,
                delay: index === messages.length - 1 ? 0 : 0,
                ease: 'easeOut'
              }}
              className={cn(
                'flex gap-3',
                message.sender === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  message.sender === 'user' 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-accent/20 text-accent'
                )}
              >
                {message.sender === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: message.sender === 'user' ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05, duration: 0.25 }}
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2.5',
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm rtl:rounded-tr-2xl rtl:rounded-tl-sm'
                    : 'bg-muted text-foreground rounded-tl-sm rtl:rounded-tl-2xl rtl:rounded-tr-sm plug-ai-highlight'
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className={cn(
                  'text-[10px] mt-1',
                  message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.sender !== 'ai' && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span className="text-sm text-muted-foreground">{t('plug.thinking')}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input with function buttons */}
      <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm space-y-3">
        {/* Function buttons row */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAttachment}
          >
            <Paperclip className="w-4 h-4 me-1" />
            <span className="text-xs">
              {isUploadingAttachment
                ? (direction === 'rtl' ? 'מעלה…' : 'Uploading…')
                : (direction === 'rtl' ? 'קובץ' : 'File')}
            </span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleAttachmentPicked(f);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => toast.info(direction === 'rtl' ? 'הקלטה קולית - בקרוב!' : 'Voice recording - coming soon!')}
          >
            <Mic className="w-4 h-4 me-1" />
            <span className="text-xs">{direction === 'rtl' ? 'קול' : 'Voice'}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => toast.info(direction === 'rtl' ? 'העלאת תמונה - בקרוב!' : 'Image upload - coming soon!')}
          >
            <Image className="w-4 h-4 me-1" />
            <span className="text-xs">{direction === 'rtl' ? 'תמונה' : 'Image'}</span>
          </Button>
        </div>

        {/* Input row */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('plug.placeholder')}
            className="flex-1 h-11 rounded-xl"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-11 w-11 rounded-xl"
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
