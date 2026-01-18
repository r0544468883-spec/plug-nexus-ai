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
import { ArrowLeft, ArrowRight, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  conversation_id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
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
  const [newMessage, setNewMessage] = useState('');

  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', conversation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
  });

  // Mark messages as read
  useEffect(() => {
    if (!user?.id || messages.length === 0) return;

    const unreadMessages = messages.filter(
      m => m.to_user_id === user.id && !m.is_read
    );

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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const toUserId = conversation.participant_1 === user.id 
        ? conversation.participant_2 
        : conversation.participant_1;

      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        from_user_id: user.id,
        to_user_id: toUserId,
        content,
      });

      if (msgError) throw msgError;

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage.trim());
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `${isHebrew ? 'אתמול' : 'Yesterday'} ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'dd/MM/yyyy HH:mm');
    }
  };

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <BackIcon className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={conversation.other_user?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {conversation.other_user?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {conversation.other_user?.full_name || (isHebrew ? 'משתמש לא ידוע' : 'Unknown User')}
            </p>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
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
                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg px-4 py-2',
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      <p className={cn(
                        'text-xs mt-1',
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
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

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isHebrew ? 'הקלד הודעה...' : 'Type a message...'}
            disabled={sendMutation.isPending}
            dir={isHebrew ? 'rtl' : 'ltr'}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
