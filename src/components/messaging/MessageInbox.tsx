import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Mail, MailOpen, ChevronRight, Inbox, Search, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { ConversationThread } from './ConversationThread';
import { NewMessageDialog } from './NewMessageDialog';

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  other_user: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  unread_count: number;
  last_message?: string;
}

type FilterType = 'all' | 'unread' | 'read';

export function MessageInbox() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch conversations
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get conversations where user is a participant
      const { data: convos, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get other participants' profiles
      const otherUserIds = convos.map(c => 
        c.participant_1 === user.id ? c.participant_2 : c.participant_1
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', otherUserIds);

      // Get unread counts and last messages
      const conversationsWithDetails = await Promise.all(convos.map(async (convo) => {
        const otherId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;
        
        // Count unread
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convo.id)
          .eq('to_user_id', user.id)
          .eq('is_read', false);

        // Get last message
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', convo.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...convo,
          other_user: profiles?.find(p => p.user_id === otherId) || null,
          unread_count: count || 0,
          last_message: lastMsg?.content,
        };
      }));

      return conversationsWithDetails;
    },
    enabled: !!user?.id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('messages-inbox')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  // Filter and search conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Apply read/unread filter
    if (filter === 'unread') {
      result = result.filter(c => c.unread_count > 0);
    } else if (filter === 'read') {
      result = result.filter(c => c.unread_count === 0);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.other_user?.full_name?.toLowerCase().includes(query) ||
        c.last_message?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [conversations, filter, searchQuery]);

  if (selectedConversation) {
    return (
      <ConversationThread
        conversation={selectedConversation}
        onBack={() => {
          setSelectedConversation(null);
          refetch();
        }}
      />
    );
  }

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {isHebrew ? 'הודעות' : 'Messages'}
            {totalUnread > 0 && (
              <Badge variant="default" className="bg-primary">
                {totalUnread}
              </Badge>
            )}
          </CardTitle>
          <NewMessageDialog />
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isHebrew ? 'חפש בשיחות...' : 'Search conversations...'}
              className="ps-9"
              dir={isHebrew ? 'rtl' : 'ltr'}
            />
          </div>
          
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                {isHebrew ? 'הכל' : 'All'}
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                {isHebrew ? 'לא נקראו' : 'Unread'}
              </TabsTrigger>
              <TabsTrigger value="read" className="text-xs">
                {isHebrew ? 'נקראו' : 'Read'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || filter !== 'all' 
                ? (isHebrew ? 'לא נמצאו תוצאות' : 'No results found')
                : (isHebrew ? 'אין הודעות עדיין' : 'No messages yet')}
            </p>
            {!searchQuery && filter === 'all' && (
              <p className="text-sm text-muted-foreground mt-2">
                {isHebrew ? 'לחץ על "הודעה חדשה" כדי להתחיל שיחה' : 'Click "New Message" to start a conversation'}
              </p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-start"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conversation.other_user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conversation.other_user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`font-medium truncate ${conversation.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {conversation.other_user?.full_name || (isHebrew ? 'משתמש לא ידוע' : 'Unknown User')}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.last_message_at), {
                          addSuffix: false,
                          locale: isHebrew ? he : enUS,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message || (isHebrew ? 'אין הודעות' : 'No messages')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {conversation.unread_count > 0 ? (
                      <Badge className="bg-primary text-primary-foreground">
                        {conversation.unread_count}
                      </Badge>
                    ) : (
                      <MailOpen className="w-4 h-4 text-muted-foreground" />
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
