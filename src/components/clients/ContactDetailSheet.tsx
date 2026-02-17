import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Mail, Phone, Linkedin, Calendar, MessageSquare, Briefcase, Plus, Clock,
  CheckCircle, Video, MapPin, FileText, Sparkles, ExternalLink, User
} from 'lucide-react';
import { format } from 'date-fns';

interface Contact {
  id: string;
  full_name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  is_primary: boolean | null;
  notes: string | null;
}

interface ContactDetailSheetProps {
  contact: Contact | null;
  companyId: string;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDetailSheet({ contact, companyId, companyName, open, onOpenChange }: ContactDetailSheetProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const queryClient = useQueryClient();

  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showLinkProject, setShowLinkProject] = useState(false);
  const [newEvent, setNewEvent] = useState({ event_type: 'call', title: '', description: '' });

  // Fetch contact's conversations & meetings from timeline
  const { data: contactTimeline = [] } = useQuery({
    queryKey: ['contact-timeline', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      const { data, error } = await supabase
        .from('client_timeline')
        .select('*')
        .eq('contact_id', contact.id)
        .order('event_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!contact?.id,
  });

  // Fetch contact's linked projects
  const { data: contactProjects = [] } = useQuery({
    queryKey: ['contact-projects', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      const { data, error } = await supabase
        .from('client_contact_projects')
        .select('*, jobs:job_id(id, title, status, location, job_type)')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!contact?.id,
  });

  // Available jobs for linking
  const { data: availableJobs = [] } = useQuery({
    queryKey: ['available-jobs-for-contact', companyId, contact?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, status')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Filter out already linked
      const linkedIds = contactProjects.map((cp: any) => cp.job_id);
      return (data || []).filter(j => !linkedIds.includes(j.id));
    },
    enabled: !!contact?.id && showLinkProject,
  });

  // Add activity for this contact
  const addActivityMutation = useMutation({
    mutationFn: async (event: typeof newEvent) => {
      if (!user?.id || !contact?.id) throw new Error('Missing data');
      const { error } = await supabase.from('client_timeline').insert({
        ...event, company_id: companyId, recruiter_id: user.id, contact_id: contact.id,
      });
      if (error) throw error;
      await supabase.from('companies').update({ last_contact_at: new Date().toISOString() }).eq('id', companyId);
      // Auto follow-up for meetings
      if (event.event_type === 'meeting') {
        await supabase.from('client_tasks').insert({
          title: isRTL ? `פולואפ: ${event.title}` : `Follow up: ${event.title}`,
          description: isRTL ? `נוצר אוטומטית עבור ${contact.full_name}` : `Auto-created for ${contact.full_name}`,
          company_id: companyId, recruiter_id: user.id, priority: 'high', source: 'automation',
          due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-timeline', contact?.id] });
      queryClient.invalidateQueries({ queryKey: ['client-timeline', companyId] });
      queryClient.invalidateQueries({ queryKey: ['client-tasks', companyId] });
      setShowAddActivity(false);
      setNewEvent({ event_type: 'call', title: '', description: '' });
      toast.success(isRTL ? 'פעילות נוספה' : 'Activity added');
    },
  });

  // Link a project to this contact
  const linkProjectMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!user?.id || !contact?.id) throw new Error('Missing data');
      const { error } = await supabase.from('client_contact_projects').insert({
        contact_id: contact.id, job_id: jobId, company_id: companyId, recruiter_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-projects', contact?.id] });
      queryClient.invalidateQueries({ queryKey: ['company-contact-projects', companyId] });
      setShowLinkProject(false);
      toast.success(isRTL ? 'פרויקט קושר' : 'Project linked');
    },
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'meeting': return <Calendar className="w-4 h-4 text-primary" />;
      case 'call': return <Phone className="w-4 h-4 text-amber-500" />;
      case 'video_call': return <Video className="w-4 h-4 text-purple-500" />;
      default: return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const conversations = contactTimeline.filter(e => ['call', 'email', 'video_call', 'note'].includes(e.event_type));
  const meetings = contactTimeline.filter(e => e.event_type === 'meeting');

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:max-w-lg overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg">{contact.full_name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{contact.role_title || companyName}</p>
            </div>
          </div>
          {/* Quick contact info */}
          <div className="flex flex-wrap gap-2 mt-3">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Mail className="w-3 h-3" />{contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Phone className="w-3 h-3" />{contact.phone}
              </a>
            )}
            {contact.linkedin_url && (
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Linkedin className="w-3 h-3" />LinkedIn
              </a>
            )}
            {contact.is_primary && <Badge variant="secondary" className="text-[10px]">{isRTL ? 'איש קשר ראשי' : 'Primary Contact'}</Badge>}
          </div>
        </SheetHeader>

        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="w-full h-10 p-1 bg-muted/60 rounded-lg gap-0.5">
            <TabsTrigger value="conversations" className="flex-1 gap-1 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <MessageSquare className="w-3.5 h-3.5" />
              {isRTL ? 'שיחות' : 'Conversations'}
              {conversations.length > 0 && <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-1">{conversations.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="meetings" className="flex-1 gap-1 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Calendar className="w-3.5 h-3.5" />
              {isRTL ? 'פגישות' : 'Meetings'}
              {meetings.length > 0 && <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-1">{meetings.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex-1 gap-1 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md">
              <Briefcase className="w-3.5 h-3.5" />
              {isRTL ? 'פרויקטים' : 'Projects'}
              {contactProjects.length > 0 && <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-1">{contactProjects.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="space-y-3 mt-3">
            <Button size="sm" className="gap-1.5 w-full" variant="outline" onClick={() => { setNewEvent({ event_type: 'call', title: '', description: '' }); setShowAddActivity(true); }}>
              <Plus className="w-3.5 h-3.5" />{isRTL ? 'הוסף שיחה' : 'Log Conversation'}
            </Button>
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{isRTL ? 'אין שיחות מתועדות' : 'No conversations logged'}</p>
            ) : conversations.map(event => (
              <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="mt-0.5">{getEventIcon(event.event_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{event.title}</p>
                    <Badge variant="outline" className="text-[10px] h-4">{event.event_type}</Badge>
                  </div>
                  {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{format(new Date(event.event_date), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-3 mt-3">
            <Button size="sm" className="gap-1.5 w-full" variant="outline" onClick={() => { setNewEvent({ event_type: 'meeting', title: '', description: '' }); setShowAddActivity(true); }}>
              <Plus className="w-3.5 h-3.5" />{isRTL ? 'הוסף פגישה' : 'Log Meeting'}
            </Button>
            {meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{isRTL ? 'אין פגישות מתועדות' : 'No meetings logged'}</p>
            ) : meetings.map(event => (
              <div key={event.id} className="flex gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="mt-0.5"><Calendar className="w-4 h-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{event.title}</p>
                  {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{format(new Date(event.event_date), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                  {isRTL ? '⚡ פולואפ' : '⚡ Follow-up'}
                </Badge>
              </div>
            ))}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-3 mt-3">
            <Dialog open={showLinkProject} onOpenChange={setShowLinkProject}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 w-full" variant="outline">
                  <Plus className="w-3.5 h-3.5" />{isRTL ? 'קשר פרויקט' : 'Link Project'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{isRTL ? 'קשר פרויקט לאיש קשר' : 'Link Project to Contact'}</DialogTitle></DialogHeader>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{isRTL ? 'אין פרויקטים זמינים' : 'No available projects'}</p>
                  ) : availableJobs.map(job => (
                    <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 cursor-pointer" onClick={() => linkProjectMutation.mutate(job.id)}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{job.title}</span>
                      </div>
                      <Badge variant={job.status === 'active' ? 'default' : 'secondary'} className="text-xs">{job.status}</Badge>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            {contactProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{isRTL ? 'אין פרויקטים מקושרים' : 'No linked projects'}</p>
            ) : contactProjects.map((cp: any) => (
              <Card key={cp.id} className="bg-card">
                <CardContent className="p-3 flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cp.jobs?.title || 'Unknown'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cp.jobs?.location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3" />{cp.jobs.location}</span>}
                      {cp.role_in_project && <Badge variant="outline" className="text-[9px] h-4">{cp.role_in_project}</Badge>}
                    </div>
                  </div>
                  <Badge variant={cp.jobs?.status === 'active' ? 'default' : 'secondary'} className="text-xs shrink-0">{cp.jobs?.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Add Activity Dialog */}
        <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
          <DialogContent>
            <DialogHeader><DialogTitle>{isRTL ? 'פעילות חדשה' : 'New Activity'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={newEvent.event_type} onValueChange={(v) => setNewEvent(p => ({ ...p, event_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">{isRTL ? '📞 שיחה' : '📞 Call'}</SelectItem>
                  <SelectItem value="email">{isRTL ? '📧 אימייל' : '📧 Email'}</SelectItem>
                  <SelectItem value="meeting">{isRTL ? '📅 פגישה' : '📅 Meeting'}</SelectItem>
                  <SelectItem value="video_call">{isRTL ? '📹 שיחת וידאו' : '📹 Video Call'}</SelectItem>
                  <SelectItem value="note">{isRTL ? '📝 הערה' : '📝 Note'}</SelectItem>
                </SelectContent>
              </Select>
              <Input value={newEvent.title} onChange={(e) => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder={isRTL ? 'כותרת' : 'Title'} />
              <Textarea value={newEvent.description} onChange={(e) => setNewEvent(p => ({ ...p, description: e.target.value }))} placeholder={isRTL ? 'סיכום / תיאור' : 'Summary / Description'} rows={3} />
              <Button onClick={() => addActivityMutation.mutate(newEvent)} disabled={!newEvent.title.trim()} className="w-full">
                {isRTL ? 'הוסף' : 'Add'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
