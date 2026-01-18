import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MessageSquare, Loader2, Send } from 'lucide-react';

interface SendMessageDialogProps {
  toUserId: string;
  toUserName: string;
  trigger?: React.ReactNode;
  relatedJobId?: string;
  relatedApplicationId?: string;
  defaultMessage?: string;
}

export function SendMessageDialog({
  toUserId,
  toUserName,
  trigger,
  relatedJobId,
  relatedApplicationId,
  defaultMessage = '',
}: SendMessageDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!message.trim()) throw new Error('Message is empty');

      // Find or create conversation
      const participant1 = user.id < toUserId ? user.id : toUserId;
      const participant2 = user.id < toUserId ? toUserId : user.id;

      // Try to find existing conversation
      let { data: existingConvo } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', participant1)
        .eq('participant_2', participant2)
        .single();

      let conversationId: string;

      if (existingConvo) {
        conversationId = existingConvo.id;
      } else {
        // Create new conversation
        const { data: newConvo, error: convoError } = await supabase
          .from('conversations')
          .insert({
            participant_1: participant1,
            participant_2: participant2,
          })
          .select('id')
          .single();

        if (convoError) throw convoError;
        conversationId = newConvo.id;
      }

      // Send message
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        from_user_id: user.id,
        to_user_id: toUserId,
        content: message.trim(),
        related_job_id: relatedJobId || null,
        related_application_id: relatedApplicationId || null,
      });

      if (msgError) throw msgError;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      toast.success(isHebrew ? 'ההודעה נשלחה!' : 'Message sent!');
      setMessage('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשליחת ההודעה' : 'Failed to send message');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            {isHebrew ? 'שלח הודעה' : 'Send Message'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {isHebrew ? `שלח הודעה ל${toUserName}` : `Message ${toUserName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{isHebrew ? 'הודעה' : 'Message'}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isHebrew ? 'הקלד את ההודעה שלך...' : 'Type your message...'}
              className="min-h-[120px] resize-none"
              dir={isHebrew ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {isHebrew ? 'ביטול' : 'Cancel'}
            </Button>
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={!message.trim() || sendMutation.isPending}
              className="gap-2"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isHebrew ? 'שלח' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
