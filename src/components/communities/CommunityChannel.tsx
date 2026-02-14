import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Send, Loader2, Hash, Heart } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

interface HubSettings {
  allow_posts: boolean;
  allow_comments: boolean;
}

interface CommunityChannelProps {
  channelId: string;
  channelName: string;
  hubSettings?: HubSettings;
  isAdmin?: boolean;
}

export function CommunityChannel({ channelId, channelName, hubSettings, isAdmin }: CommunityChannelProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');

  const canPost = isAdmin || hubSettings?.allow_posts !== false;

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['community-messages', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .eq('channel_id', channelId)
        .is('parent_message_id', null)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch author profiles
  const authorIds = [...new Set(messages.map(m => m.author_id))];
  const { data: authors = [] } = useQuery({
    queryKey: ['community-authors', authorIds],
    queryFn: async () => {
      if (authorIds.length === 0) return [];
      const { data } = await supabase.from('profiles_secure').select('user_id, full_name, avatar_url').in('user_id', authorIds);
      return data || [];
    },
    enabled: authorIds.length > 0,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`community-channel-${channelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${channelId}` },
        () => { queryClient.invalidateQueries({ queryKey: ['community-messages', channelId] }); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelId, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !newMessage.trim()) return;
      const { error } = await supabase.from('community_messages').insert({
        channel_id: channelId,
        author_id: user.id,
        content: newMessage.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['community-messages', channelId] });
      if (user?.id) {
        supabase.functions.invoke('award-credits', { body: { action: 'feed_comment' } }).catch(() => {});
      }
    },
    onError: () => toast.error(isHebrew ? 'שגיאה בשליחת ההודעה' : 'Failed to send'),
  });

  const likeMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;
      await supabase.from('community_messages').update({ likes_count: msg.likes_count + 1 }).eq('id', messageId);
      if (user?.id) {
        supabase.functions.invoke('award-credits', { body: { action: 'feed_like' } }).catch(() => {});
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-messages', channelId] }),
  });

  const formatDate = (date: Date) => {
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return `${isHebrew ? 'אתמול' : 'Yesterday'} ${format(date, 'HH:mm')}`;
    return format(date, 'dd/MM HH:mm');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Hash className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">{channelName}</h3>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{isHebrew ? 'אין הודעות עדיין — תהיה הראשון!' : 'No messages yet — be the first!'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const author = authors.find(a => a.user_id === msg.author_id);
              return (
                <div key={msg.id} className="flex gap-3 group">
                  <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                    <AvatarImage src={author?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {author?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm">{author?.full_name || (isHebrew ? 'משתמש' : 'User')}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(new Date(msg.created_at))}</span>
                    </div>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => likeMutation.mutate(msg.id)}
                        className={cn(
                          'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors',
                          msg.likes_count > 0
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100'
                        )}
                      >
                        <Heart className="w-3 h-3" />
                        {msg.likes_count > 0 && <span>{msg.likes_count}</span>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input - hidden if posts not allowed for non-admins */}
      {canPost ? (
        <div className="p-4 border-t border-border">
          <form onSubmit={(e) => { e.preventDefault(); sendMutation.mutate(); }} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isHebrew ? `הודעה ב-${channelName}...` : `Message ${channelName}...`}
              disabled={sendMutation.isPending}
              dir={isHebrew ? 'rtl' : 'ltr'}
            />
            <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMutation.isPending}>
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      ) : (
        <div className="p-4 border-t border-border text-center text-sm text-muted-foreground">
          {isHebrew ? 'פרסום הודעות מוגבל למנהלים בקהילה זו' : 'Posting is restricted to admins in this community'}
        </div>
      )}
    </div>
  );
}
