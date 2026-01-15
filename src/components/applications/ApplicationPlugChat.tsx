import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  // Quick action suggestions based on context
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

  const generateResponse = (userMessage: string): string => {
    // Context-aware responses (placeholder - will be replaced with AI)
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('interview') || lowerMessage.includes('ראיון')) {
      return isRTL 
        ? `טיפים להתכוננות לראיון ב-${context.companyName}:\n\n1. 🔍 חקור את החברה והתרבות הארגונית\n2. 📝 הכן שאלות למראיין\n3. 💼 תרגל תשובות על הניסיון שלך\n4. ⏰ הגע 10 דקות מוקדם\n\nבהצלחה! 🍀`
        : `Tips for your ${context.companyName} interview:\n\n1. 🔍 Research the company culture\n2. 📝 Prepare questions for the interviewer\n3. 💼 Practice answers about your experience\n4. ⏰ Arrive 10 minutes early\n\nGood luck! 🍀`;
    }
    
    if (lowerMessage.includes('salary') || lowerMessage.includes('negotiate') || lowerMessage.includes('שכר') || lowerMessage.includes('משא ומתן')) {
      return isRTL
        ? `טיפים למשא ומתן על שכר:\n\n1. 📊 תחקור את טווח השכר בתעשייה\n2. 💪 הדגש את הערך שאתה מביא\n3. 🎯 תן מספר ספציפי, לא טווח\n4. 🤝 זכור שזה משא ומתן, לא וויכוח`
        : `Salary negotiation tips:\n\n1. 📊 Research industry salary ranges\n2. 💪 Highlight the value you bring\n3. 🎯 Give a specific number, not a range\n4. 🤝 Remember it's a negotiation, not an argument`;
    }
    
    if (lowerMessage.includes('summarize') || lowerMessage.includes('תסכם') || lowerMessage.includes('summary')) {
      return isRTL
        ? `סיכום המועמדות שלך:\n\n📌 משרה: ${context.jobTitle}\n🏢 חברה: ${context.companyName}\n📍 מיקום: ${context.location || 'לא צוין'}\n💼 סוג: ${context.jobType || 'לא צוין'}\n📊 סטטוס: ${context.status}\n${context.matchScore ? `⭐ התאמה: ${context.matchScore}%` : ''}`
        : `Your application summary:\n\n📌 Position: ${context.jobTitle}\n🏢 Company: ${context.companyName}\n📍 Location: ${context.location || 'Not specified'}\n💼 Type: ${context.jobType || 'Not specified'}\n📊 Status: ${context.status}\n${context.matchScore ? `⭐ Match: ${context.matchScore}%` : ''}`;
    }
    
    if (lowerMessage.includes('ask') || lowerMessage.includes('question') || lowerMessage.includes('שאל') || lowerMessage.includes('שאלה')) {
      return isRTL
        ? `שאלות מומלצות לשאול את המראיין:\n\n1. "איך נראה יום טיפוסי בתפקיד?"\n2. "מה הציפיות ל-90 הימים הראשונים?"\n3. "מה האתגרים הגדולים של הצוות?"\n4. "איך נמדדת הצלחה בתפקיד?"\n5. "מה הצעדים הבאים בתהליך?"`
        : `Great questions to ask the interviewer:\n\n1. "What does a typical day look like?"\n2. "What are the expectations for the first 90 days?"\n3. "What are the team's biggest challenges?"\n4. "How is success measured in this role?"\n5. "What are the next steps in the process?"`;
    }
    
    // Default response
    return isRTL
      ? `אני כאן לעזור לך עם המועמדות ל-${context.jobTitle}! אפשר לשאול אותי על:\n• הכנה לראיון\n• משא ומתן על שכר\n• שאלות למראיין\n• טיפים כלליים`
      : `I'm here to help with your ${context.jobTitle} application! You can ask me about:\n• Interview preparation\n• Salary negotiation\n• Questions for the interviewer\n• General tips`;
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

    // Simulate AI response delay
    setTimeout(async () => {
      const response = generateResponse(input);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);

      // Save AI response
      if (user) {
        await supabase.from('chat_history').insert({
          user_id: user.id,
          message: response,
          sender: 'ai',
          context: { applicationId, jobTitle: context.jobTitle, companyName: context.companyName },
        });
      }
    }, 1000);
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
          
          {isLoading && (
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
