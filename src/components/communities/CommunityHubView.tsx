import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChannelSidebar } from './ChannelSidebar';
import { CommunityChannel } from './CommunityChannel';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Hash } from 'lucide-react';

interface CommunityHubViewProps {
  hubId: string;
  onBack: () => void;
}

export function CommunityHubView({ hubId, onBack }: CommunityHubViewProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  const { data: hub, isLoading: hubLoading } = useQuery({
    queryKey: ['community-hub', hubId],
    queryFn: async () => {
      const { data, error } = await supabase.from('community_hubs').select('*').eq('id', hubId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['community-channels', hubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_channels')
        .select('*')
        .eq('hub_id', hubId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      // Auto-select first channel
      if (data && data.length > 0 && !activeChannelId) {
        setActiveChannelId(data[0].id);
      }
      return data;
    },
  });

  if (hubLoading || channelsLoading) {
    return <div className="flex gap-4 h-[600px]"><Skeleton className="w-60 h-full" /><Skeleton className="flex-1 h-full" /></div>;
  }

  const activeChannel = channels.find(c => c.id === activeChannelId);

  return (
    <div className="flex h-[600px] rounded-xl overflow-hidden border border-border bg-card" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Channel Sidebar */}
      <ChannelSidebar
        hubName={isHebrew ? (hub?.name_he || hub?.name_en || '') : (hub?.name_en || '')}
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={setActiveChannelId}
        onBack={onBack}
        memberCount={hub?.member_count || 0}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <CommunityChannel
            channelId={activeChannel.id}
            channelName={isHebrew ? activeChannel.name_he : activeChannel.name_en}
          />
        ) : (
          <Card className="m-auto border-none shadow-none bg-transparent">
            <CardContent className="text-center p-12">
              <Hash className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
              <p className="text-muted-foreground">{isHebrew ? 'בחר ערוץ להתחיל' : 'Select a channel to start'}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
