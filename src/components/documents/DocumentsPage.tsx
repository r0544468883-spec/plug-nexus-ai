import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSigningDocuments, SigningDocument, DocumentTemplate } from '@/hooks/useSigningDocuments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText, Plus, Send, Eye, CheckCircle, XCircle, Clock, AlertCircle,
  Trash2, RotateCcw, FileEdit, Download, Users, ArrowLeft, ArrowRight,
  Mail, MessageCircle, Zap, User, Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const STATUS_CONFIG = {
  draft: { labelHe: 'טיוטה', labelEn: 'Draft', color: 'bg-secondary text-secondary-foreground', icon: FileEdit },
  sent: { labelHe: 'נשלח', labelEn: 'Sent', color: 'bg-blue-500/20 text-blue-700', icon: Send },
  viewed: { labelHe: 'נצפה', labelEn: 'Viewed', color: 'bg-yellow-500/20 text-yellow-700', icon: Eye },
  signed: { labelHe: 'נחתם', labelEn: 'Signed', color: 'bg-green-500/20 text-green-700', icon: CheckCircle },
  declined: { labelHe: 'נדחה', labelEn: 'Declined', color: 'bg-red-500/20 text-red-700', icon: XCircle },
  expired: { labelHe: 'פג תוקף', labelEn: 'Expired', color: 'bg-orange-500/20 text-orange-700', icon: AlertCircle },
  cancelled: { labelHe: 'בוטל', labelEn: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: Trash2 },
};

const CHANNEL_CONFIG = {
  plug: {
    labelHe: 'פלאג (בתוך האפליקציה)',
    labelEn: 'Plug (In-App)',
    icon: Zap,
    color: 'border-primary/40 bg-primary/5 hover:bg-primary/10',
    selectedColor: 'border-primary bg-primary/15',
    iconColor: 'text-primary',
    requiresEmail: false,
    requiresPhone: false,
  },
  email: {
    labelHe: 'מייל',
    labelEn: 'Email',
    icon: Mail,
    color: 'border-blue-400/40 bg-blue-50/50 hover:bg-blue-50',
    selectedColor: 'border-blue-500 bg-blue-50',
    iconColor: 'text-blue-500',
    requiresEmail: true,
    requiresPhone: false,
  },
  whatsapp: {
    labelHe: 'וואטסאפ',
    labelEn: 'WhatsApp',
    icon: MessageCircle,
    color: 'border-green-400/40 bg-green-50/50 hover:bg-green-50',
    selectedColor: 'border-green-500 bg-green-50',
    iconColor: 'text-green-500',
    requiresEmail: false,
    requiresPhone: true,
  },
} as const;

type SendChannel = keyof typeof CHANNEL_CONFIG;

interface SendDialogState {
  documentId: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  channel: SendChannel;
}

interface DocumentsPageProps {
  onBack?: () => void;
}

export function DocumentsPage({ onBack }: DocumentsPageProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const { user } = useAuth();
  const BackIcon = isHebrew ? ArrowRight : ArrowLeft;

  const {
    documents, templates, stats, isLoading,
    createDocument, sendDocument, cancelDocument, sendReminder, createTemplate,
  } = useSigningDocuments();

  const [tab, setTab] = useState('documents');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<SigningDocument | null>(null);
  const [sendDialog, setSendDialog] = useState<SendDialogState | null>(null);
  const [createForm, setCreateForm] = useState({ title: '', content_html: '', template_id: '', expires_days: '7' });
  const [templateForm, setTemplateForm] = useState({ name: '', description: '', content_html: '', category: 'general' });

  const handleCreateDoc = () => {
    if (!createForm.title) return;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(createForm.expires_days || '7'));
    createDocument.mutate({
      title: createForm.title,
      content_html: createForm.content_html || templates.find(t => t.id === createForm.template_id)?.content_html || '',
      template_id: createForm.template_id || undefined,
      expires_at: expiresAt.toISOString(),
    });
    setShowCreateDialog(false);
    setCreateForm({ title: '', content_html: '', template_id: '', expires_days: '7' });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setCreateForm(prev => ({ ...prev, template_id: templateId, content_html: template.content_html, title: prev.title || template.name }));
    }
  };

  const openSendDialog = (docId: string) => {
    setSendDialog({ documentId: docId, recipientName: '', recipientEmail: '', recipientPhone: '', channel: 'plug' });
  };

  const handleSend = () => {
    if (!sendDialog || !sendDialog.recipientName) return;
    const cfg = CHANNEL_CONFIG[sendDialog.channel];
    if (cfg.requiresEmail && !sendDialog.recipientEmail) return;
    if (cfg.requiresPhone && !sendDialog.recipientPhone) return;

    sendDocument.mutate({
      documentId: sendDialog.documentId,
      recipientName: sendDialog.recipientName,
      recipientEmail: sendDialog.recipientEmail || undefined,
      recipientPhone: sendDialog.recipientPhone || undefined,
      channel: sendDialog.channel,
    });

    // Open WhatsApp or email client
    if (sendDialog.channel === 'whatsapp' && sendDialog.recipientPhone) {
      const msg = encodeURIComponent(`שלום ${sendDialog.recipientName}, נשלח לך מסמך לחתימה דיגיטלית דרך PLUG.`);
      window.open(`https://wa.me/${sendDialog.recipientPhone.replace(/\D/g, '')}?text=${msg}`, '_blank');
    } else if (sendDialog.channel === 'email' && sendDialog.recipientEmail) {
      window.open(`mailto:${sendDialog.recipientEmail}?subject=מסמך לחתימה&body=שלום ${sendDialog.recipientName}, נשלח לך מסמך לחתימה דיגיטלית דרך PLUG.`, '_blank');
    }

    setSendDialog(null);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {isHebrew ? config.labelHe : config.labelEn}
      </span>
    );
  };

  const getChannelBadge = (channel: string | null) => {
    if (!channel) return null;
    const cfg = CHANNEL_CONFIG[channel as SendChannel];
    if (!cfg) return null;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${cfg.iconColor} bg-current/10`}>
        <Icon className="w-3 h-3" />
      </span>
    );
  };

  const isSendValid = () => {
    if (!sendDialog || !sendDialog.recipientName) return false;
    const cfg = CHANNEL_CONFIG[sendDialog.channel];
    if (cfg.requiresEmail && !sendDialog.recipientEmail) return false;
    if (cfg.requiresPhone && !sendDialog.recipientPhone) return false;
    return true;
  };

  return (
    <div className="space-y-6" dir={isHebrew ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <BackIcon className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {isHebrew ? 'מסמכים לחתימה' : 'eSignature Documents'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isHebrew ? 'ניהול מסמכים וחתימות דיגיטליות' : 'Manage documents and digital signatures'}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {isHebrew ? 'מסמך חדש' : 'New Document'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isHebrew ? 'סה"כ' : 'Total', value: stats.total, icon: FileText, color: 'text-primary' },
          { label: isHebrew ? 'ממתין' : 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-500' },
          { label: isHebrew ? 'נחתם' : 'Signed', value: stats.signed, icon: CheckCircle, color: 'text-green-500' },
          { label: isHebrew ? 'נדחה' : 'Declined', value: stats.declined, icon: XCircle, color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="documents">{isHebrew ? 'מסמכים' : 'Documents'}</TabsTrigger>
          <TabsTrigger value="templates">{isHebrew ? 'תבניות' : 'Templates'}</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : documents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">{isHebrew ? 'אין מסמכים עדיין' : 'No documents yet'}</p>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isHebrew ? 'צור מסמך ראשון' : 'Create First Document'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <Card key={doc.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setViewingDoc(doc)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <FileText className="w-8 h-8 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{doc.title}</p>
                        {getStatusBadge(doc.status)}
                        {getChannelBadge(doc.send_channel)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="font-mono">{doc.document_number}</span>
                        <span>{format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: he })}</span>
                        {doc.recipient_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{doc.recipient_name}</span>}
                        {doc.view_count > 0 && <span><Eye className="w-3 h-3 inline me-1" />{doc.view_count}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {doc.status === 'draft' && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openSendDialog(doc.id)}>
                          <Send className="w-3 h-3" />
                          {isHebrew ? 'שלח' : 'Send'}
                        </Button>
                      )}
                      {(doc.status === 'sent' || doc.status === 'viewed') && (
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => sendReminder.mutate(doc.id)}>
                          <RotateCcw className="w-3 h-3" />
                          {isHebrew ? 'תזכורת' : 'Remind'}
                        </Button>
                      )}
                      {(doc.status === 'draft' || doc.status === 'sent') && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive gap-1" onClick={() => cancelDocument.mutate(doc.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowTemplateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {isHebrew ? 'תבנית חדשה' : 'New Template'}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <Card key={template.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{template.name}</p>
                      {template.description && <p className="text-sm text-muted-foreground mt-0.5">{template.description}</p>}
                      <Badge variant="secondary" className="mt-2 text-xs">{template.category}</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      setCreateForm(prev => ({ ...prev, template_id: template.id, content_html: template.content_html, title: template.name }));
                      setShowCreateDialog(true);
                    }}>
                      {isHebrew ? 'השתמש' : 'Use'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Send Dialog */}
      <Dialog open={!!sendDialog} onOpenChange={() => setSendDialog(null)}>
        <DialogContent className="sm:max-w-md" dir={isHebrew ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {isHebrew ? 'שליחת מסמך לחתימה' : 'Send Document for Signing'}
            </DialogTitle>
          </DialogHeader>
          {sendDialog && (
            <div className="space-y-5">
              {/* Recipient */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">{isHebrew ? '👤 פרטי הנמען' : '👤 Recipient Details'}</p>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="ps-9"
                    placeholder={isHebrew ? 'שם מלא *' : 'Full name *'}
                    value={sendDialog.recipientName}
                    onChange={e => setSendDialog(p => p ? { ...p, recipientName: e.target.value } : null)}
                  />
                </div>
                {(sendDialog.channel === 'email' || sendDialog.channel === 'plug') && (
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="ps-9"
                      type="email"
                      placeholder={isHebrew ? `כתובת מייל${sendDialog.channel === 'email' ? ' *' : ' (אופציונלי)'}` : `Email${sendDialog.channel === 'email' ? ' *' : ' (optional)'}`}
                      value={sendDialog.recipientEmail}
                      onChange={e => setSendDialog(p => p ? { ...p, recipientEmail: e.target.value } : null)}
                    />
                  </div>
                )}
                {(sendDialog.channel === 'whatsapp') && (
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="ps-9"
                      type="tel"
                      placeholder={isHebrew ? 'מספר טלפון *' : 'Phone number *'}
                      value={sendDialog.recipientPhone}
                      onChange={e => setSendDialog(p => p ? { ...p, recipientPhone: e.target.value } : null)}
                    />
                  </div>
                )}
              </div>

              {/* Channel Selection */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">{isHebrew ? '📤 ערוץ שליחה' : '📤 Send Via'}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(CHANNEL_CONFIG) as [SendChannel, typeof CHANNEL_CONFIG[SendChannel]][]).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const isSelected = sendDialog.channel === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSendDialog(p => p ? { ...p, channel: key } : null)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${isSelected ? cfg.selectedColor : cfg.color}`}
                      >
                        <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                        <span className="text-xs text-center leading-tight">
                          {isHebrew ? cfg.labelHe : cfg.labelEn}
                        </span>
                        {isSelected && <div className={`w-2 h-2 rounded-full ${cfg.iconColor.replace('text-', 'bg-')}`} />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {sendDialog.channel === 'plug' && (isHebrew ? '📱 הנמען יקבל התראה בתוך האפליקציה' : '📱 Recipient gets an in-app notification')}
                  {sendDialog.channel === 'email' && (isHebrew ? '📧 ייפתח לקוח המייל שלך עם ההודעה' : '📧 Your email client will open with the message')}
                  {sendDialog.channel === 'whatsapp' && (isHebrew ? '💬 ייפתח וואטסאפ עם ההודעה המוכנה' : '💬 WhatsApp will open with a pre-written message')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setSendDialog(null)}>{isHebrew ? 'ביטול' : 'Cancel'}</Button>
            <Button onClick={handleSend} disabled={!isSendValid()} className="gap-2">
              <Send className="w-4 h-4" />
              {isHebrew ? 'שלח מסמך' : 'Send Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Document Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isHebrew ? 'מסמך חדש לחתימה' : 'New Signing Document'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{isHebrew ? 'תבנית (אופציונלי)' : 'Template (optional)'}</label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={isHebrew ? 'בחר תבנית...' : 'Select template...'} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{isHebrew ? 'כותרת המסמך *' : 'Document Title *'}</label>
              <Input
                value={createForm.title}
                onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
                placeholder={isHebrew ? 'הסכם עבודה – ישראל ישראלי' : 'Employment Agreement – John Doe'}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{isHebrew ? 'תוכן המסמך (HTML)' : 'Document Content (HTML)'}</label>
              <Textarea
                value={createForm.content_html}
                onChange={e => setCreateForm(p => ({ ...p, content_html: e.target.value }))}
                placeholder={isHebrew ? 'תוכן המסמך...' : 'Document content...'}
                rows={10}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{isHebrew ? 'תוקף (ימים)' : 'Expires in (days)'}</label>
              <Select value={createForm.expires_days} onValueChange={v => setCreateForm(p => ({ ...p, expires_days: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['3', '7', '14', '30'].map(d => <SelectItem key={d} value={d}>{d} {isHebrew ? 'ימים' : 'days'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>{isHebrew ? 'ביטול' : 'Cancel'}</Button>
            <Button onClick={handleCreateDoc} disabled={!createForm.title}>
              {isHebrew ? 'צור מסמך' : 'Create Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Detail Dialog */}
      {viewingDoc && (
        <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewingDoc.title}
                {getStatusBadge(viewingDoc.status)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">{isHebrew ? 'מספר מסמך:' : 'Doc #:'}</span> <span className="font-mono font-medium">{viewingDoc.document_number}</span></div>
                <div><span className="text-muted-foreground">{isHebrew ? 'נוצר:' : 'Created:'}</span> {format(new Date(viewingDoc.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}</div>
                {viewingDoc.recipient_name && <div><span className="text-muted-foreground">{isHebrew ? 'נמען:' : 'Recipient:'}</span> {viewingDoc.recipient_name}</div>}
                {viewingDoc.send_channel && <div><span className="text-muted-foreground">{isHebrew ? 'ערוץ:' : 'Channel:'}</span> {isHebrew ? CHANNEL_CONFIG[viewingDoc.send_channel as SendChannel]?.labelHe : CHANNEL_CONFIG[viewingDoc.send_channel as SendChannel]?.labelEn}</div>}
                {viewingDoc.sent_at && <div><span className="text-muted-foreground">{isHebrew ? 'נשלח:' : 'Sent:'}</span> {format(new Date(viewingDoc.sent_at), 'dd/MM/yyyy HH:mm', { locale: he })}</div>}
                {viewingDoc.signed_at && <div><span className="text-muted-foreground">{isHebrew ? 'נחתם:' : 'Signed:'}</span> {format(new Date(viewingDoc.signed_at), 'dd/MM/yyyy HH:mm', { locale: he })}</div>}
                {viewingDoc.expires_at && <div><span className="text-muted-foreground">{isHebrew ? 'תוקף עד:' : 'Expires:'}</span> {format(new Date(viewingDoc.expires_at), 'dd/MM/yyyy', { locale: he })}</div>}
                <div><span className="text-muted-foreground">{isHebrew ? 'נצפה:' : 'Views:'}</span> {viewingDoc.view_count}</div>
              </div>

              {viewingDoc.signature_data && (
                <div>
                  <p className="text-sm font-medium mb-2">{isHebrew ? 'חתימה:' : 'Signature:'}</p>
                  <img src={viewingDoc.signature_data} alt="Signature" className="border rounded-lg max-h-24 bg-white p-2" />
                </div>
              )}

              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-muted/30 text-sm"
                dangerouslySetInnerHTML={{ __html: viewingDoc.content_html }} />
            </div>
            <DialogFooter className="gap-2">
              {viewingDoc.status === 'draft' && (
                <Button onClick={() => { setViewingDoc(null); openSendDialog(viewingDoc.id); }} className="gap-2">
                  <Send className="w-4 h-4" />
                  {isHebrew ? 'שלח לחתימה' : 'Send for Signing'}
                </Button>
              )}
              {(viewingDoc.status === 'sent' || viewingDoc.status === 'viewed') && (
                <Button variant="outline" onClick={() => { sendReminder.mutate(viewingDoc.id); }} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  {isHebrew ? 'שלח תזכורת' : 'Send Reminder'}
                </Button>
              )}
              <Button variant="ghost" onClick={() => setViewingDoc(null)}>{isHebrew ? 'סגור' : 'Close'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isHebrew ? 'תבנית מסמך חדשה' : 'New Document Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder={isHebrew ? 'שם התבנית' : 'Template name'} value={templateForm.name} onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))} />
            <Input placeholder={isHebrew ? 'תיאור (אופציונלי)' : 'Description (optional)'} value={templateForm.description} onChange={e => setTemplateForm(p => ({ ...p, description: e.target.value }))} />
            <Select value={templateForm.category} onValueChange={v => setTemplateForm(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['employment', 'nda', 'offer', 'general'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder={isHebrew ? 'תוכן התבנית (HTML)...' : 'Template content (HTML)...'} value={templateForm.content_html} onChange={e => setTemplateForm(p => ({ ...p, content_html: e.target.value }))} rows={10} className="font-mono text-xs" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowTemplateDialog(false)}>{isHebrew ? 'ביטול' : 'Cancel'}</Button>
            <Button onClick={() => { createTemplate.mutate(templateForm as Parameters<typeof createTemplate.mutate>[0]); setShowTemplateDialog(false); }} disabled={!templateForm.name}>
              {isHebrew ? 'שמור תבנית' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
