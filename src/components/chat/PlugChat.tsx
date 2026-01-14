import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export function PlugChat() {
  const { t, direction } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!error && data) {
      setMessages(data.map(msg => ({
        id: msg.id,
        content: msg.message,
        sender: msg.sender as 'user' | 'ai',
        timestamp: new Date(msg.created_at),
      })));
    }
  };

  const saveMessage = async (content: string, sender: 'user' | 'ai') => {
    if (!user) return;

    await supabase
      .from('chat_history')
      .insert({
        user_id: user.id,
        message: content,
        sender,
      });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Save user message
    await saveMessage(userMessage.content, 'user');

    // Simulate AI response (will be replaced with actual AI integration)
    setTimeout(async () => {
      const aiResponse = generatePlugResponse(userMessage.content);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      await saveMessage(aiResponse, 'ai');
      setIsLoading(false);
    }, 1000);
  };

  const generatePlugResponse = (userInput: string): string => {
    // Placeholder responses - will be replaced with Gemini AI
    const responses = [
      "Got it! I'm analyzing your request... 🔍 This will be much more powerful once we connect the AI engine!",
      "Interesting question! Once the Gemini integration is complete, I'll be able to help you with that in detail.",
      "I'm Plug, your AI HR assistant! Soon I'll be able to search candidates, analyze CVs, and much more.",
      "Processing... ⚡ The full AI capabilities are coming soon. For now, I'm just learning the ropes!",
      "That's a great question about HR! My full powers will be unlocked once we integrate the AI engine.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Show initial greeting if no messages
  const showGreeting = messages.length === 0;

  return (
    <div className="flex flex-col h-[500px] rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">Plug</h3>
          <p className="text-xs text-muted-foreground">Your AI HR Assistant</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showGreeting && (
          <div className="flex justify-center py-8">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </div>
              <h4 className="font-semibold text-lg mb-2">{t('plug.greeting')}</h4>
              <p className="text-muted-foreground text-sm">
                Ask me anything about candidates, jobs, documents, or HR processes!
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.sender === 'user' ? 'flex-row-reverse' : ''
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              message.sender === 'user' 
                ? 'bg-primary/20 text-primary' 
                : 'bg-accent/20 text-accent'
            )}>
              {message.sender === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>
            <div className={cn(
              'max-w-[75%] rounded-2xl px-4 py-2.5',
              message.sender === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm rtl:rounded-tr-2xl rtl:rounded-tl-sm'
                : 'bg-muted text-foreground rounded-tl-sm rtl:rounded-tl-2xl rtl:rounded-tr-sm plug-ai-highlight'
            )}>
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p className={cn(
                'text-[10px] mt-1',
                message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span className="text-sm text-muted-foreground">{t('plug.thinking')}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('plug.placeholder')}
            className="flex-1 h-11 rounded-xl"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-11 w-11 rounded-xl"
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
