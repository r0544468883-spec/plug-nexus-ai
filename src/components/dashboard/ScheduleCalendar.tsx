import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday,
  isPast, parseISO, addMonths, subMonths, startOfWeek, endOfWeek, addDays, subDays
} from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Clock, Tag, Trash2, CheckCircle2,
  Circle, Loader2, CalendarDays, List, Filter, MapPin, Link2, Users, UserPlus, X, Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskType = 'interview' | 'followup' | 'task' | 'meeting' | 'deadline' | 'reminder';
type ViewMode = 'day' | 'calendar' | 'list';

interface ExternalAttendee { name: string; email: string; }

interface ScheduleTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: TaskPriority;
  task_type: TaskType;
  is_completed: boolean;
  related_candidate?: string | null;
  related_job?: string | null;
  location?: string | null;
  meeting_link?: string | null;
  external_attendees?: ExternalAttendee[] | null;
  source?: string | null;
  source_id?: string | null;
  created_at: string;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const typeColors: Record<TaskType, string> = {
  interview: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  followup: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  task: 'bg-primary/15 text-primary border-primary/30',
  meeting: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  deadline: 'bg-red-500/15 text-red-400 border-red-500/30',
  reminder: 'bg-secondary/15 text-secondary border-secondary/30',
};

const typeBg: Record<TaskType, string> = {
  interview: 'bg-purple-500/20 border-purple-500/40 hover:bg-purple-500/30',
  followup: 'bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30',
  task: 'bg-primary/20 border-primary/40 hover:bg-primary/30',
  meeting: 'bg-orange-500/20 border-orange-500/40 hover:bg-orange-500/30',
  deadline: 'bg-red-500/20 border-red-500/40 hover:bg-red-500/30',
  reminder: 'bg-secondary/20 border-secondary/40 hover:bg-secondary/30',
};

const typeIcons: Record<TaskType, string> = {
  interview: '🎤',
  followup: '↩️',
  task: '✓',
  meeting: '👥',
  deadline: '⏰',
  reminder: '🔔',
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00–22:00

export function ScheduleCalendar() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const locale = isRTL ? he : enUS;
  const queryClient = useQueryClient();
  const dayViewRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [prefilledHour, setPrefilledHour] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(selectedDate);
  const [newDueTime, setNewDueTime] = useState('09:00');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newType, setNewType] = useState<TaskType>('task');
  const [newRelatedCandidate, setNewRelatedCandidate] = useState('');
  const [newRelatedJob, setNewRelatedJob] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newMeetingLink, setNewMeetingLink] = useState('');
  const [externalAttendees, setExternalAttendees] = useState<ExternalAttendee[]>([]);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
  const [newAttendeeName, setNewAttendeeName] = useState('');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['schedule-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('schedule_tasks' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ScheduleTask[];
    },
    enabled: !!user?.id,
  });

  const addTaskMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !newTitle.trim()) throw new Error('Missing data');
      const { error } = await supabase.from('schedule_tasks' as any).insert({
        user_id: user.id,
        title: newTitle.trim(),
        description: newDescription || null,
        due_date: newDueDate ? format(newDueDate, 'yyyy-MM-dd') : null,
        due_time: newDueTime || null,
        priority: newPriority,
        task_type: newType,
        is_completed: false,
        related_candidate: newRelatedCandidate || null,
        related_job: newRelatedJob || null,
        location: newLocation || null,
        meeting_link: newMeetingLink || null,
        external_attendees: externalAttendees.length > 0 ? externalAttendees : [],
        source: 'manual',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'משימה נוצרה!' : 'Task created!');
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error(isRTL ? 'שגיאה ביצירת משימה' : 'Error creating task'),
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('schedule_tasks' as any)
        .update({ is_completed: !is_completed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('schedule_tasks' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isRTL ? 'משימה נמחקה' : 'Task deleted');
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      setTaskDetailOpen(false);
    },
  });

  const resetForm = () => {
    setNewTitle(''); setNewDescription(''); setNewDueDate(new Date());
    setNewDueTime('09:00'); setNewPriority('medium'); setNewType('task');
    setNewRelatedCandidate(''); setNewRelatedJob('');
    setNewLocation(''); setNewMeetingLink('');
    setExternalAttendees([]); setNewAttendeeName(''); setNewAttendeeEmail('');
    setPrefilledHour(null);
  };

  const openCreateWithHour = (hour: number) => {
    setPrefilledHour(hour);
    setNewDueDate(selectedDate);
    setNewDueTime(`${String(hour).padStart(2, '0')}:00`);
    setAddDialogOpen(true);
  };

  const addAttendee = () => {
    if (!newAttendeeName.trim() || !newAttendeeEmail.trim()) return;
    setExternalAttendees(prev => [...prev, { name: newAttendeeName.trim(), email: newAttendeeEmail.trim() }]);
    setNewAttendeeName(''); setNewAttendeeEmail('');
  };

  // Scroll to current hour on day view mount
  useEffect(() => {
    if (viewMode === 'day' && dayViewRef.current) {
      const currentHour = new Date().getHours();
      const scrollHour = Math.max(7, Math.min(currentHour - 1, 21));
      const hourEl = dayViewRef.current.querySelector(`[data-hour="${scrollHour}"]`);
      if (hourEl) hourEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [viewMode, selectedDate]);

  const filteredTasks = tasks.filter((t) => {
    if (!showCompleted && t.is_completed) return false;
    if (filterType !== 'all' && t.task_type !== filterType) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const tasksForDate = (date: Date) =>
    filteredTasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), date));

  const selectedDateTasks = tasksForDate(selectedDate);

  // Day view: bucket tasks by hour
  const timedTasks = selectedDateTasks.filter(t => t.due_time);
  const allDayTasks = selectedDateTasks.filter(t => !t.due_time);
  const tasksByHour: Record<number, ScheduleTask[]> = {};
  timedTasks.forEach(t => {
    const hour = parseInt(t.due_time!.split(':')[0]);
    if (!tasksByHour[hour]) tasksByHour[hour] = [];
    tasksByHour[hour].push(t);
  });

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const dayNames = isRTL
    ? ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const totalTasks = filteredTasks.length;
  const completedTasks = tasks.filter((t) => t.is_completed).length;
  const todayTasks = tasksForDate(new Date()).length;
  const urgentTasks = filteredTasks.filter((t) => t.priority === 'urgent' && !t.is_completed).length;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary" />
            {isRTL ? 'יומן ומשימות' : 'Schedule & Tasks'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? 'כל המשימות שלך במקום אחד' : 'All your tasks in one place'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggles */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {([['day', isRTL ? 'יום' : 'Day', Sun], ['calendar', isRTL ? 'חודש' : 'Month', CalendarDays], ['list', isRTL ? 'רשימה' : 'List', List]] as [ViewMode, string, any][]).map(([mode, label, Icon]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors',
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <Dialog open={addDialogOpen} onOpenChange={(o) => { setAddDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                {isRTL ? 'הוסף משימה' : 'Add Task'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
              <DialogHeader>
                <DialogTitle>{isRTL ? 'משימה / אירוע חדש' : 'New Task / Event'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label>{isRTL ? 'כותרת' : 'Title'} *</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={isRTL ? 'תיאור המשימה...' : 'Task title...'} />
                </div>
                <div className="space-y-1">
                  <Label>{isRTL ? 'פרטים' : 'Description'}</Label>
                  <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder={isRTL ? 'פרטים נוספים...' : 'Additional details...'} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{isRTL ? 'תאריך' : 'Date'}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-start">
                          {newDueDate ? format(newDueDate, 'dd/MM/yy') : isRTL ? 'בחר תאריך' : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI mode="single" selected={newDueDate} onSelect={setNewDueDate} locale={locale} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label>{isRTL ? 'שעה' : 'Time'}</Label>
                    <Input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{isRTL ? 'סוג' : 'Type'}</Label>
                    <Select value={newType} onValueChange={(v) => setNewType(v as TaskType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task">{isRTL ? 'משימה' : 'Task'}</SelectItem>
                        <SelectItem value="interview">{isRTL ? 'ראיון' : 'Interview'}</SelectItem>
                        <SelectItem value="meeting">{isRTL ? 'פגישה' : 'Meeting'}</SelectItem>
                        <SelectItem value="followup">{isRTL ? 'מעקב' : 'Follow-up'}</SelectItem>
                        <SelectItem value="deadline">{isRTL ? 'דד-ליין' : 'Deadline'}</SelectItem>
                        <SelectItem value="reminder">{isRTL ? 'תזכורת' : 'Reminder'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{isRTL ? 'עדיפות' : 'Priority'}</Label>
                    <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TaskPriority)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{isRTL ? 'נמוכה' : 'Low'}</SelectItem>
                        <SelectItem value="medium">{isRTL ? 'בינונית' : 'Medium'}</SelectItem>
                        <SelectItem value="high">{isRTL ? 'גבוהה' : 'High'}</SelectItem>
                        <SelectItem value="urgent">{isRTL ? 'דחוף' : 'Urgent'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Location & Meeting link */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{isRTL ? 'מיקום' : 'Location'}</Label>
                  <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder={isRTL ? 'כתובת / שם מקום...' : 'Address / venue...'} />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" />{isRTL ? 'לינק לפגישה' : 'Meeting Link'}</Label>
                  <Input value={newMeetingLink} onChange={(e) => setNewMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
                </div>

                {/* External attendees */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" />{isRTL ? 'משתתפים חיצוניים' : 'External Attendees'}</Label>
                  {externalAttendees.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/40 border border-border text-xs">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1">{a.name} — {a.email}</span>
                      <button onClick={() => setExternalAttendees(prev => prev.filter((_, j) => j !== i))}>
                        <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input value={newAttendeeName} onChange={(e) => setNewAttendeeName(e.target.value)} placeholder={isRTL ? 'שם' : 'Name'} className="h-8 text-xs" />
                    <Input value={newAttendeeEmail} onChange={(e) => setNewAttendeeEmail(e.target.value)} placeholder="Email" className="h-8 text-xs" type="email" />
                    <Button type="button" size="sm" variant="outline" className="h-8 px-2 shrink-0" onClick={addAttendee}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{isRTL ? 'מועמד קשור' : 'Related Candidate'}</Label>
                    <Input value={newRelatedCandidate} onChange={(e) => setNewRelatedCandidate(e.target.value)} placeholder={isRTL ? 'שם מועמד...' : 'Candidate name...'} />
                  </div>
                  <div className="space-y-1">
                    <Label>{isRTL ? 'משרה קשורה' : 'Related Job'}</Label>
                    <Input value={newRelatedJob} onChange={(e) => setNewRelatedJob(e.target.value)} placeholder={isRTL ? 'שם המשרה...' : 'Job title...'} />
                  </div>
                </div>

                <Button className="w-full" onClick={() => addTaskMutation.mutate()} disabled={!newTitle.trim() || addTaskMutation.isPending}>
                  {addTaskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Plus className="w-4 h-4 me-2" />}
                  {isRTL ? 'צור אירוע' : 'Create Event'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isRTL ? 'סה"כ משימות' : 'Total Tasks', value: totalTasks, color: 'text-foreground' },
          { label: isRTL ? 'הושלמו' : 'Completed', value: completedTasks, color: 'text-primary' },
          { label: isRTL ? 'היום' : 'Today', value: todayTasks, color: 'text-accent' },
          { label: isRTL ? 'דחוף' : 'Urgent', value: urgentTasks, color: 'text-red-400' },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={(v) => setFilterType(v as TaskType | 'all')}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder={isRTL ? 'סוג' : 'Type'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? 'כל הסוגים' : 'All Types'}</SelectItem>
            <SelectItem value="task">{isRTL ? 'משימה' : 'Task'}</SelectItem>
            <SelectItem value="interview">{isRTL ? 'ראיון' : 'Interview'}</SelectItem>
            <SelectItem value="meeting">{isRTL ? 'פגישה' : 'Meeting'}</SelectItem>
            <SelectItem value="followup">{isRTL ? 'מעקב' : 'Follow-up'}</SelectItem>
            <SelectItem value="deadline">{isRTL ? 'דד-ליין' : 'Deadline'}</SelectItem>
            <SelectItem value="reminder">{isRTL ? 'תזכורת' : 'Reminder'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as TaskPriority | 'all')}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder={isRTL ? 'עדיפות' : 'Priority'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? 'כל העדיפויות' : 'All Priorities'}</SelectItem>
            <SelectItem value="low">{isRTL ? 'נמוכה' : 'Low'}</SelectItem>
            <SelectItem value="medium">{isRTL ? 'בינונית' : 'Medium'}</SelectItem>
            <SelectItem value="high">{isRTL ? 'גבוהה' : 'High'}</SelectItem>
            <SelectItem value="urgent">{isRTL ? 'דחוף' : 'Urgent'}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={showCompleted ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setShowCompleted(!showCompleted)}>
          <CheckCircle2 className="w-3 h-3 me-1" />
          {isRTL ? 'הצג שהושלמו' : 'Show Completed'}
        </Button>
      </div>

      {/* ─── DAY VIEW ─── */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          {/* Day nav header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => subDays(d, 1))}>
              {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </Button>
            <div className="text-center">
              <p className="font-bold text-lg">{format(selectedDate, 'EEEE', { locale })}</p>
              <p className="text-sm text-muted-foreground">{format(selectedDate, 'dd MMMM yyyy', { locale })}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(d => addDays(d, 1))}>
              {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </Button>
          </div>
          {!isToday(selectedDate) && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedDate(new Date())}>
                {isRTL ? 'חזרה להיום' : 'Back to Today'}
              </Button>
            </div>
          )}

          <Card className="bg-card border-border overflow-hidden">
            {/* All-day row */}
            {allDayTasks.length > 0 && (
              <div className="border-b border-border bg-muted/20 px-4 py-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{isRTL ? 'כל היום' : 'All Day'}</p>
                <div className="flex flex-wrap gap-2">
                  {allDayTasks.map(t => (
                    <button
                      key={t.id}
                      className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all', typeBg[t.task_type])}
                      onClick={() => { setSelectedTask(t); setTaskDetailOpen(true); }}
                    >
                      <span>{typeIcons[t.task_type]}</span>
                      <span className={t.is_completed ? 'line-through opacity-60' : ''}>{t.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hourly grid */}
            <div className="overflow-y-auto max-h-[600px]" ref={dayViewRef}>
              {HOURS.map(hour => {
                const hourTasks = tasksByHour[hour] || [];
                const isCurrentHour = isToday(selectedDate) && new Date().getHours() === hour;
                return (
                  <div
                    key={hour}
                    data-hour={hour}
                    className={cn(
                      'flex min-h-[56px] border-b border-border/50 group',
                      isCurrentHour && 'bg-primary/5'
                    )}
                  >
                    {/* Hour label */}
                    <div className={cn(
                      'w-16 shrink-0 px-3 py-2 text-xs text-muted-foreground font-mono border-e border-border/50 flex flex-col justify-start pt-2',
                      isCurrentHour && 'text-primary font-bold'
                    )}>
                      {String(hour).padStart(2, '0')}:00
                    </div>

                    {/* Task slot */}
                    <div
                      className="flex-1 px-2 py-1.5 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => hourTasks.length === 0 && openCreateWithHour(hour)}
                    >
                      {hourTasks.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors select-none">
                          + {isRTL ? 'הוסף אירוע' : 'Add event'}
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {hourTasks.map(t => (
                            <button
                              key={t.id}
                              className={cn(
                                'w-full text-start px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all',
                                typeBg[t.task_type],
                                t.is_completed && 'opacity-50'
                              )}
                              onClick={(e) => { e.stopPropagation(); setSelectedTask(t); setTaskDetailOpen(true); }}
                            >
                              <span>{typeIcons[t.task_type]}</span>
                              <span className={cn('flex-1 truncate', t.is_completed && 'line-through')}>
                                {t.title}
                              </span>
                              {t.due_time && <span className="text-[10px] opacity-70 shrink-0">{t.due_time.slice(0, 5)}</span>}
                              {t.location && <MapPin className="w-3 h-3 opacity-60 shrink-0" />}
                              {t.meeting_link && <Link2 className="w-3 h-3 opacity-60 shrink-0" />}
                              {t.source && t.source !== 'manual' && (
                                <Badge variant="outline" className="text-[8px] px-1 h-3 shrink-0">CRM</Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Empty state */}
          {selectedDateTasks.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'לא נמצאו אירועים היום — לחץ על שעה כלשהי להוספת משימה' : 'No events today — click any hour slot to add a task'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── CALENDAR VIEW ─── */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
                <h3 className="text-base font-semibold">{format(currentMonth, 'MMMM yyyy', { locale })}</h3>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-7 mb-2">
                {dayNames.map((d) => (
                  <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {calDays.map((day) => {
                  const dayTasks = tasksForDate(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const hasTasks = dayTasks.length > 0;
                  const hasUrgent = dayTasks.some((t) => t.priority === 'urgent' && !t.is_completed);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                      className={cn(
                        'relative aspect-square flex flex-col items-center justify-start p-1 rounded-lg transition-all text-xs',
                        !isCurrentMonth && 'opacity-30',
                        isSelected && 'bg-primary text-primary-foreground',
                        !isSelected && isToday(day) && 'border border-primary text-primary',
                        !isSelected && !isToday(day) && 'hover:bg-muted/50',
                        isPast(day) && !isToday(day) && !isSelected && 'text-muted-foreground',
                      )}
                    >
                      <span className="font-medium">{format(day, 'd')}</span>
                      {hasTasks && (
                        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                          {dayTasks.slice(0, 3).map((_, i) => (
                            <span key={i} className={cn('w-1.5 h-1.5 rounded-full', hasUrgent ? 'bg-red-400' : isSelected ? 'bg-primary-foreground' : 'bg-primary')} />
                          ))}
                          {dayTasks.length > 3 && <span className={cn('text-[8px]', isSelected ? 'text-primary-foreground' : 'text-muted-foreground')}>+{dayTasks.length - 3}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-center">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
                  {isRTL ? 'חזרה להיום' : 'Today'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                {format(selectedDate, 'EEEE, d MMMM', { locale })}
                {selectedDateTasks.length > 0 && <Badge variant="secondary" className="text-xs">{selectedDateTasks.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[450px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : selectedDateTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">{isRTL ? 'אין משימות ביום זה' : 'No tasks this day'}</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => { setNewDueDate(selectedDate); setAddDialogOpen(true); }}>
                    <Plus className="w-3 h-3 me-1" />{isRTL ? 'הוסף משימה' : 'Add task'}
                  </Button>
                </div>
              ) : (
                selectedDateTasks.map((task) => (
                  <TaskCard key={task.id} task={task} isRTL={isRTL}
                    onToggle={() => toggleCompleteMutation.mutate({ id: task.id, is_completed: task.is_completed })}
                    onDelete={() => deleteTaskMutation.mutate(task.id)}
                    onClick={() => { setSelectedTask(task); setTaskDetailOpen(true); }}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── LIST VIEW ─── */}
      {viewMode === 'list' && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">{isRTL ? 'אין משימות' : 'No tasks yet'}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 me-2" />{isRTL ? 'הוסף משימה ראשונה' : 'Add first task'}
                </Button>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} isRTL={isRTL} showDate
                  onToggle={() => toggleCompleteMutation.mutate({ id: task.id, is_completed: task.is_completed })}
                  onDelete={() => deleteTaskMutation.mutate(task.id)}
                  onClick={() => { setSelectedTask(task); setTaskDetailOpen(true); }}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={taskDetailOpen} onOpenChange={setTaskDetailOpen}>
        {selectedTask && (
          <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{typeIcons[selectedTask.task_type]}</span>
                <span className={selectedTask.is_completed ? 'line-through opacity-60' : ''}>{selectedTask.title}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={cn('text-xs', typeColors[selectedTask.task_type])}>{selectedTask.task_type}</Badge>
                <Badge variant="outline" className={cn('text-xs', priorityColors[selectedTask.priority])}>{selectedTask.priority}</Badge>
                {selectedTask.source && selectedTask.source !== 'manual' && (
                  <Badge variant="secondary" className="text-xs">📎 {isRTL ? 'מ-CRM' : 'From CRM'}</Badge>
                )}
              </div>

              {selectedTask.description && (
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              )}

              <div className="space-y-1.5 text-sm">
                {selectedTask.due_date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{format(parseISO(selectedTask.due_date), 'dd MMMM yyyy', { locale })}</span>
                    {selectedTask.due_time && <span className="font-medium text-foreground">{selectedTask.due_time.slice(0, 5)}</span>}
                  </div>
                )}
                {selectedTask.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{selectedTask.location}</span>
                  </div>
                )}
                {selectedTask.meeting_link && (
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <a href={selectedTask.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate">{selectedTask.meeting_link}</a>
                  </div>
                )}
                {selectedTask.related_candidate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="w-4 h-4 shrink-0" />
                    <span>{selectedTask.related_candidate}</span>
                  </div>
                )}
              </div>

              {(selectedTask.external_attendees as ExternalAttendee[] || []).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isRTL ? 'משתתפים חיצוניים' : 'External Attendees'}</p>
                  {(selectedTask.external_attendees as ExternalAttendee[]).map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>{a.name} — <a href={`mailto:${a.email}`} className="text-primary hover:underline">{a.email}</a></span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => toggleCompleteMutation.mutate({ id: selectedTask.id, is_completed: selectedTask.is_completed })}
                >
                  {selectedTask.is_completed ? <Circle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {selectedTask.is_completed ? (isRTL ? 'ביטול השלמה' : 'Reopen') : (isRTL ? 'סמן כהושלם' : 'Complete')}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteTaskMutation.mutate(selectedTask.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

interface TaskCardProps {
  task: ScheduleTask;
  isRTL: boolean;
  showDate?: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onClick?: () => void;
}

function TaskCard({ task, isRTL, showDate, onToggle, onDelete, onClick }: TaskCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer',
        task.is_completed ? 'bg-muted/20 border-border/50 opacity-60' : 'bg-card border-border hover:border-primary/30'
      )}
      onClick={onClick}
    >
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="mt-0.5 flex-shrink-0">
        {task.is_completed ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="text-sm">{typeIcons[task.task_type]}</span>
          <span className={cn('text-sm font-medium', task.is_completed && 'line-through text-muted-foreground')}>{task.title}</span>
          {task.source && task.source !== 'manual' && <Badge variant="outline" className="text-[9px] px-1 h-3.5">CRM</Badge>}
        </div>
        {task.description && <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{task.description}</p>}
        <div className="flex flex-wrap gap-1.5 items-center">
          <Badge variant="outline" className={cn('text-xs py-0', typeColors[task.task_type])}>{task.task_type}</Badge>
          <Badge variant="outline" className={cn('text-xs py-0', priorityColors[task.priority])}>{task.priority}</Badge>
          {showDate && task.due_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(parseISO(task.due_date), 'dd/MM')}
              {task.due_time && ` ${task.due_time.slice(0, 5)}`}
            </span>
          )}
          {!showDate && task.due_time && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />{task.due_time.slice(0, 5)}
            </span>
          )}
          {task.location && <MapPin className="w-3 h-3 text-muted-foreground" />}
          {task.meeting_link && <Link2 className="w-3 h-3 text-muted-foreground" />}
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
