import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

const TYPE_LABELS: Record<string, { en: string; he: string }> = {
  new_job: { en: 'New Job', he: 'משרה חדשה' },
  offer: { en: 'Job Offer', he: 'הצעת עבודה' },
  budget: { en: 'Budget Request', he: 'בקשת תקציב' },
  hire: { en: 'Hire Approval', he: 'אישור גיוס' },
};

export function ApprovalInbox() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const queryClient = useQueryClient();

  const { data: incoming = [], isLoading: loadingIncoming } = useQuery({
    queryKey: ['approval-inbox', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('approval_requests')
        .select('*, requester:profiles!approval_requests_requester_id_fkey(full_name, avatar_url)')
        .eq('approver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: outgoing = [], isLoading: loadingOutgoing } = useQuery({
    queryKey: ['approval-outbox', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('approval_requests')
        .select('*, approver:profiles!approval_requests_approver_id_fkey(full_name)')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('approval_requests').update({
        status,
        decided_at: new Date().toISOString(),
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      const msg = vars.status === 'approved'
        ? (isHebrew ? 'אושר בהצלחה!' : 'Approved!')
        : (isHebrew ? 'נדחה' : 'Rejected');
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['approval-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['approval-outbox'] });
    },
  });

  const statusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{isHebrew ? 'אושר' : 'Approved'}</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">{isHebrew ? 'נדחה' : 'Rejected'}</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 me-1 inline" />{isHebrew ? 'ממתין' : 'Pending'}</Badge>;
  };

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Incoming */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Inbox className="w-4 h-4 text-primary" />
            {isHebrew ? 'ממתין לאישורך' : 'Awaiting Your Approval'}
            {incoming.length > 0 && <Badge variant="destructive" className="text-xs">{incoming.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingIncoming ? (
            <Skeleton className="h-20" />
          ) : incoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{isHebrew ? 'אין בקשות ממתינות' : 'No pending requests'}</p>
          ) : (
            <div className="space-y-3">
              {incoming.map((req: any) => {
                const typeLabel = TYPE_LABELS[req.request_type] || { en: req.request_type, he: req.request_type };
                return (
                  <div key={req.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{isHebrew ? typeLabel.he : typeLabel.en}</Badge>
                          <span className="text-sm font-medium">{req.requester?.full_name}</span>
                        </div>
                        {req.notes && <p className="text-xs text-muted-foreground mt-1">{req.notes}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: isHebrew ? he : enUS })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => decideMutation.mutate({ id: req.id, status: 'approved' })}
                        disabled={decideMutation.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isHebrew ? 'אשר' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => decideMutation.mutate({ id: req.id, status: 'rejected' })}
                        disabled={decideMutation.isPending}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {isHebrew ? 'דחה' : 'Reject'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outgoing */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">{isHebrew ? 'הבקשות שלי' : 'My Requests'}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOutgoing ? (
            <Skeleton className="h-20" />
          ) : outgoing.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">{isHebrew ? 'לא שלחת בקשות עדיין' : 'No requests sent yet'}</p>
          ) : (
            <div className="space-y-2">
              {outgoing.map((req: any) => {
                const typeLabel = TYPE_LABELS[req.request_type] || { en: req.request_type, he: req.request_type };
                return (
                  <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">{isHebrew ? typeLabel.he : typeLabel.en}</Badge>
                        <span className="text-xs text-muted-foreground truncate">→ {req.approver?.full_name}</span>
                      </div>
                    </div>
                    {statusBadge(req.status)}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
