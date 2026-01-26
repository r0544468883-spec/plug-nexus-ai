import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ApplicationContext {
  jobTitle: string;
  companyName: string;
  status: string;
  matchScore: number | null;
  location: string | null;
  jobType: string | null;
}

interface ApplicationPlugChatProps {
  applicationId: string;
  context: ApplicationContext;
}

export function ApplicationPlugChat({ applicationId, context }: ApplicationPlugChatProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'he';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const suggestions = isRTL ? [
    'עזור לי להתכונן לראיון',
    'מה כדאי לשאול את המראיין?',
    'איך לנהל משא ומתן על שכר?',
    'תסכם לי את המשרה',
  ] : [
    'Help me prepare for the interview',
    'What should I ask the interviewer?',
    'How to negotiate salary?',
    'Summarize this job for me',
  ];

  // Initial greeting
  useEffect(() => {
    const greeting: Message = {
      id: 'greeting',
      content: isRTL 
        ? `היי! אני Plug 🔌 אני כאן לעזור לך עם המועמדות ל-${context.jobTitle} ב-${context.companyName}. מה תרצה לדעת?`
        : `Hey! I'm Plug 🔌 I'm here to help you with your ${context.jobTitle} application at ${context.companyName}. What would you like to know?`,
      sender: 'ai',
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, [applicationId, context.jobTitle, context.companyName, isRTL]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamAIResponse = async (userMessages: { role: string; content: string }[]): Promise<string> => {
    abortControllerRef.current = new AbortController();
    
    // Get the user's session token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      throw new Error('No active session - please log in');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plug-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ 
        messages: userMessages,
        context: {
          jobTitle: context.jobTitle,
          companyName: context.companyName,
          status: context.status,
          matchScore: context.matchScore,
          location: context.location,
          jobType: context.jobType,
        }
      }),
      signal: abortControllerRef.current.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get AI response');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.sender === 'ai' && last.id !== 'greeting') {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: fullContent } : m
                );
              }
              return [...prev, {
                id: (Date.now() + 1).toString(),
                content: fullContent,
                sender: 'ai' as const,
                timestamp: new Date(),
              }];
            });
          }
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    return fullContent;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Save to chat history
    if (user) {
      await supabase.from('chat_history').insert({
        user_id: user.id,
        message: input,
        sender: 'user',
        context: { applicationId, jobTitle: context.jobTitle, companyName: context.companyName },
      });
    }

    try {
      // Build message history
      const recentMessages = messages.slice(-10).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      recentMessages.push({ role: 'user', content: userMessage.content });

      const aiResponse = await streamAIResponse(recentMessages);

      // Save AI response
      if (user) {
        await supabase.from('chat_history').insert({
          user_id: user.id,
          message: aiResponse,
          sender: 'ai',
          context: { applicationId, jobTitle: context.jobTitle, companyName: context.companyName },
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
      
      // Check if it's a session/auth error - show humorous message
      if (errorMessage.includes('No active session') || errorMessage.includes('log in') || errorMessage.includes('Unauthorized')) {
        toast.error(
          isRTL 
            ? '🔌 אופס! הכבל שלי התנתק...' 
            : '🔌 Oops! My cable got unplugged...',
          {
            description: isRTL 
              ? 'אני עובד על לחבר את עצמי מחדש. נסה שוב בעוד רגע!'
              : "I'm working on reconnecting myself. Try again in a moment!",
          }
        );
      } else {
        toast.error(errorMessage);
      }
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: errorMessage.includes('No active session') || errorMessage.includes('Unauthorized')
          ? (isRTL ? '🔌 אוי, מישהו שלף לי את החשמל! עובד על לחבר את עצמי מחדש...' : "🔌 Oh no, someone unplugged me! Working on reconnecting...")
          : (isRTL ? 'מצטער, נתקלתי בשגיאה. נסה שוב.' : 'Sorry, I encountered an error. Please try again.'),
        sender: 'ai',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="flex flex-col h-[400px]">
      {/* Messages */}
      <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {message.sender === 'ai' && (
                  <div className="flex items-center gap-1 mb-1 text-accent">
                    <Sparkles className="h-3 w-3" />
                    <span className="text-xs font-medium">Plug</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.sender !== 'ai' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Suggestions */}
      <div className="flex flex-wrap gap-1 py-2">
        {suggestions.slice(0, 2).map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => handleSuggestionClick(suggestion)}
            className="text-xs px-2 py-1 rounded-full bg-secondary/50 hover:bg-secondary text-foreground transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isRTL ? 'שאל את Plug...' : 'Ask Plug...'}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          dir={isRTL ? 'rtl' : 'ltr'}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
