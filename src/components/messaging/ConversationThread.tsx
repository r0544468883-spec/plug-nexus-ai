import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Send, Loader2, Paperclip, FileText, X, Download, Briefcase } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  conversation_id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  related_job_id?: string | null;
}

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  other_user: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface ConversationThreadProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ConversationThread({ conversation, onBack }: ConversationThreadProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', conversation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, from_user_id, to_user_id, content, is_read, created_at, attachment_url, attachment_name, attachment_type, attachment_size, related_job_id')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
  });

  // Fetch related jobs for messages that have related_job_id
  const jobIds = [...new Set(messages.filter(m => m.related_job_id).map(m => m.related_job_id!))];
  const { data: relatedJobs = [] } = useQuery({
    queryKey: ['related-jobs-thread', jobIds],
    queryFn: async () => {
      if (jobIds.length === 0) return [];
      const { data } = await supabase.from('jobs').select('id, title, location').in('id', jobIds);
      return data || [];
    },
    enabled: jobIds.length > 0,
  });

  // Mark messages as read
  useEffect(() => {
    if (!user?.id || messages.length === 0) return;
    const unreadMessages = messages.filter(m => m.to_user_id === user.id && !m.is_read);
    if (unreadMessages.length > 0) {
      supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadMessages.map(m => m.id))
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
        });
    }
  }, [messages, user?.id, conversation.id, queryClient]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${conversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        () => { queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] }); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversation.id, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async ({ content, attachmentData }: { content: string; attachmentData?: { url: string; name: string; type: string; size: number } }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const toUserId = conversation.participant_1 === user.id ? conversation.participant_2 : conversation.participant_1;
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        from_user_id: user.id,
        to_user_id: toUserId,
        content,
        attachment_url: attachmentData?.url || null,
        attachment_name: attachmentData?.name || null,
        attachment_type: attachmentData?.type || null,
        attachment_size: attachmentData?.size || null,
      });
      if (msgError) throw msgError;
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);
    },
    onSuccess: () => { setNewMessage(''); setSelectedFile(null); queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] }); },
    onError: () => { toast.error(isHebrew ? 'שגיאה בשליחת ההודעה' : 'Failed to send message'); },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error(isHebrew ? 'הקובץ גדול מדי (מקסימום 10MB)' : 'File too large (max 10MB)'); return; }
      setSelectedFile(file);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    let attachmentData: { url: string; name: string; type: string; size: number } | undefined;
    if (selectedFile && user?.id) {
      setUploading(true);
      try {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('message-attachments').upload(fileName, selectedFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('message-attachments').getPublicUrl(fileName);
        attachmentData = { url: publicUrl, name: selectedFile.name, type: selectedFile.type, size: selectedFile.size };
      } catch { toast.error(isHebrew ? 'שגיאה בהעלאת הקובץ' : 'Failed to upload file'); setUploading(false); return; }
      setUploading(false);
    }
    sendMutation.mutate({ content: newMessage.trim() || (selectedFile ? `📎 ${selectedFile.name}` : ''), attachmentData });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return `${isHebrew ? 'אתמול' : 'Yesterday'} ${format(date, 'HH:mm')}`;
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><BackIcon className="w-5 h-5" /></Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={conversation.other_user?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">{conversation.other_user?.full_name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{conversation.other_user?.full_name || (isHebrew ? 'משתמש לא ידוע' : 'Unknown User')}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                  <Skeleton className="h-12 w-48 rounded-lg" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {isHebrew ? 'אין הודעות עדיין. התחל שיחה!' : 'No messages yet. Start a conversation!'}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwn = message.from_user_id === user?.id;
                const job = message.related_job_id ? relatedJobs.find(j => j.id === message.related_job_id) : null;
                return (
                  <div key={message.id} className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[70%] rounded-lg px-4 py-2 space-y-2', isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      
                      {/* Attachment */}
                      {message.attachment_url && (
                        <a
                          href={message.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md text-xs',
                            isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/50 hover:bg-background/80'
                          )}
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate flex-1">{message.attachment_name || 'File'}</span>
                          {message.attachment_size && <span className="shrink-0">{formatFileSize(message.attachment_size)}</span>}
                          <Download className="w-3 h-3 shrink-0" />
                        </a>
                      )}

                      {/* Related Job Card */}
                      {job && (
                        <div className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-md text-xs',
                          isOwn ? 'bg-primary-foreground/10' : 'bg-background/50'
                        )}>
                          <Briefcase className="w-4 h-4 shrink-0 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{job.title}</p>
                            {job.location && <p className="text-xs opacity-70">{job.location}</p>}
                          </div>
                        </div>
                      )}

                      <p className={cn('text-xs', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {formatMessageDate(new Date(message.created_at))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Input with file attachment */}
      <div className="p-4 border-t border-border space-y-2">
        {selectedFile && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm">
            <FileText className="w-4 h-4 text-primary" />
            <span className="truncate flex-1">{selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={handleFileSelect} />
          <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isHebrew ? 'הקלד הודעה...' : 'Type a message...'}
            disabled={sendMutation.isPending || uploading}
            dir={isHebrew ? 'rtl' : 'ltr'}
          />
          <Button type="submit" size="icon" disabled={(!newMessage.trim() && !selectedFile) || sendMutation.isPending || uploading}>
            {(sendMutation.isPending || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </Card>
  );
}
