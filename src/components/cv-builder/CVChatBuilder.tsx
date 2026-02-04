import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CVData, defaultCVData, Experience, Education, Language as CVLanguage, Project } from './types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  User, Briefcase, GraduationCap, Code, Globe, FolderOpen, 
  Send, Sparkles, Loader2, CheckCircle, Plus, ArrowRight, 
  Palette, Download, Image as ImageIcon
} from 'lucide-react';

type BuilderStep = 'personal' | 'experience' | 'education' | 'skills' | 'languages' | 'projects' | 'style' | 'generate';

interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'action';
  content: string;
  step?: BuilderStep;
  completed?: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const CVChatBuilder = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isHe = language === 'he';
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [cvData, setCvData] = useState<CVData>(defaultCVData);
  const [currentStep, setCurrentStep] = useState<BuilderStep>('personal');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  
  // Current input fields based on step
  const [tempExperience, setTempExperience] = useState<Partial<Experience>>({});
  const [tempEducation, setTempEducation] = useState<Partial<Education>>({});

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessages: ChatMessage[] = [
      {
        id: generateId(),
        type: 'bot',
        content: isHe 
          ? '👋 שלום! אני כאן לעזור לך ליצור קורות חיים מרשימים. בוא נתחיל עם הפרטים האישיים שלך.'
          : "👋 Hi! I'm here to help you create an impressive CV. Let's start with your personal details.",
        step: 'personal',
      },
      {
        id: generateId(),
        type: 'bot',
        content: isHe ? 'מה השם המלא שלך?' : "What's your full name?",
        step: 'personal',
      },
    ];
    setMessages(welcomeMessages);
  }, [isHe]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addBotMessage = (content: string, step?: BuilderStep) => {
    setMessages(prev => [...prev, {
      id: generateId(),
      type: 'bot',
      content,
      step,
    }]);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: generateId(),
      type: 'user',
      content,
    }]);
  };

  const addActionMessage = (content: string, completed: boolean = false) => {
    setMessages(prev => [...prev, {
      id: generateId(),
      type: 'action',
      content,
      completed,
    }]);
  };

  const handleInput = (value: string) => {
    if (!value.trim()) return;
    
    addUserMessage(value);
    setInputValue('');

    // Process based on current step
    switch (currentStep) {
      case 'personal':
        handlePersonalInput(value);
        break;
      case 'experience':
        handleExperienceInput(value);
        break;
      case 'education':
        handleEducationInput(value);
        break;
      case 'skills':
        handleSkillsInput(value);
        break;
      case 'languages':
        handleLanguagesInput(value);
        break;
      case 'projects':
        handleProjectsInput(value);
        break;
    }
  };

  const handlePersonalInput = (value: string) => {
    const { personalInfo } = cvData;
    
    if (!personalInfo.fullName) {
      setCvData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, fullName: value }
      }));
      addActionMessage(`✓ ${isHe ? 'שם' : 'Name'}: ${value}`, true);
      addBotMessage(isHe ? 'מה התפקיד או התואר המקצועי שלך?' : "What's your professional title?");
    } else if (!personalInfo.title) {
      setCvData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, title: value }
      }));
      addActionMessage(`✓ ${isHe ? 'תפקיד' : 'Title'}: ${value}`, true);
      addBotMessage(isHe ? 'מה כתובת האימייל שלך?' : "What's your email address?");
    } else if (!personalInfo.email) {
      setCvData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, email: value }
      }));
      addActionMessage(`✓ ${isHe ? 'אימייל' : 'Email'}: ${value}`, true);
      addBotMessage(isHe ? 'מה מספר הטלפון שלך?' : "What's your phone number?");
    } else if (!personalInfo.phone) {
      setCvData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, phone: value }
      }));
      addActionMessage(`✓ ${isHe ? 'טלפון' : 'Phone'}: ${value}`, true);
      addBotMessage(isHe ? 'איפה אתה ממוקם? (עיר, מדינה)' : 'Where are you located? (City, Country)');
    } else if (!personalInfo.location) {
      setCvData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, location: value }
      }));
      addActionMessage(`✓ ${isHe ? 'מיקום' : 'Location'}: ${value}`, true);
      addBotMessage(isHe ? 'ספר לי בקצרה על עצמך (תקציר מקצועי):' : 'Tell me briefly about yourself (professional summary):');
    } else if (!personalInfo.summary) {
      setCvData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, summary: value }
      }));
      addActionMessage(`✓ ${isHe ? 'תקציר' : 'Summary'}: ${value.substring(0, 50)}...`, true);
      
      // Move to experience
      setCurrentStep('experience');
      addBotMessage(
        isHe 
          ? '🎉 מצוין! עכשיו בוא נוסיף את הניסיון התעסוקתי שלך. ספר לי על המשרה האחרונה שלך - שם החברה והתפקיד:'
          : "🎉 Great! Now let's add your work experience. Tell me about your most recent job - company name and role:",
        'experience'
      );
    }
  };

  const handleExperienceInput = (value: string) => {
    if (!tempExperience.company) {
      // First input: company and role
      const parts = value.split(/[-–,@]/);
      const company = parts[0]?.trim() || value;
      const role = parts[1]?.trim() || '';
      
      setTempExperience({ company, role });
      addActionMessage(`${isHe ? 'חברה' : 'Company'}: ${company}${role ? `, ${isHe ? 'תפקיד' : 'Role'}: ${role}` : ''}`);
      
      if (!role) {
        addBotMessage(isHe ? 'מה היה התפקיד שלך?' : 'What was your role?');
      } else {
        addBotMessage(isHe ? 'מתי התחלת ומתי סיימת? (לדוגמה: 2020-2023 או 2020-היום)' : 'When did you start and end? (e.g., 2020-2023 or 2020-present)');
      }
    } else if (!tempExperience.role) {
      setTempExperience(prev => ({ ...prev, role: value }));
      addActionMessage(`${isHe ? 'תפקיד' : 'Role'}: ${value}`);
      addBotMessage(isHe ? 'מתי התחלת ומתי סיימת?' : 'When did you start and end?');
    } else if (!tempExperience.startDate) {
      const dates = value.split(/[-–]/);
      const startDate = dates[0]?.trim() || value;
      const endDate = dates[1]?.trim();
      const current = endDate?.toLowerCase().includes('present') || endDate?.includes('היום') || !endDate;
      
      setTempExperience(prev => ({ ...prev, startDate, endDate: current ? null : endDate, current }));
      addActionMessage(`${isHe ? 'תקופה' : 'Period'}: ${startDate} - ${current ? (isHe ? 'היום' : 'Present') : endDate}`);
      addBotMessage(isHe ? 'תאר בקצרה מה עשית בתפקיד (כל נקודה בשורה נפרדת):' : 'Briefly describe what you did (each point on a new line):');
    } else {
      // Bullets - complete this experience
      const bullets = value.split('\n').filter(Boolean);
      const newExp: Experience = {
        id: generateId(),
        company: tempExperience.company!,
        role: tempExperience.role!,
        startDate: tempExperience.startDate!,
        endDate: tempExperience.endDate || null,
        current: tempExperience.current || false,
        bullets,
      };
      
      setCvData(prev => ({
        ...prev,
        experience: [...prev.experience, newExp]
      }));
      
      addActionMessage(`✓ ${isHe ? 'נוסף' : 'Added'}: ${newExp.role} @ ${newExp.company}`, true);
      setTempExperience({});
      
      // Ask if more experience
      addBotMessage(isHe ? 'רוצה להוסיף עוד ניסיון תעסוקתי? (כן/לא)' : 'Want to add more work experience? (yes/no)');
    }
  };

  const handleExperienceMore = (yes: boolean) => {
    if (yes) {
      addBotMessage(isHe ? 'ספר לי על המשרה הבאה - שם החברה והתפקיד:' : 'Tell me about the next job - company name and role:');
    } else {
      setCurrentStep('education');
      addBotMessage(
        isHe 
          ? '📚 עכשיו נוסיף השכלה. שם המוסד והתואר?'
          : "📚 Now let's add education. Institution name and degree?",
        'education'
      );
    }
  };

  const handleEducationInput = (value: string) => {
    if (!tempEducation.institution) {
      const parts = value.split(/[-–,]/);
      const institution = parts[0]?.trim() || value;
      const degree = parts[1]?.trim() || '';
      
      setTempEducation({ institution, degree });
      addActionMessage(`${isHe ? 'מוסד' : 'Institution'}: ${institution}`);
      
      if (!degree) {
        addBotMessage(isHe ? 'מה התואר שלך?' : 'What degree did you get?');
      } else {
        addBotMessage(isHe ? 'באיזה תחום?' : 'In what field?');
      }
    } else if (!tempEducation.degree) {
      setTempEducation(prev => ({ ...prev, degree: value }));
      addActionMessage(`${isHe ? 'תואר' : 'Degree'}: ${value}`);
      addBotMessage(isHe ? 'באיזה תחום?' : 'In what field?');
    } else if (!tempEducation.field) {
      setTempEducation(prev => ({ ...prev, field: value }));
      addActionMessage(`${isHe ? 'תחום' : 'Field'}: ${value}`);
      addBotMessage(isHe ? 'שנות הלימודים? (לדוגמה: 2016-2020)' : 'Years of study? (e.g., 2016-2020)');
    } else {
      const dates = value.split(/[-–]/);
      const newEdu: Education = {
        id: generateId(),
        institution: tempEducation.institution!,
        degree: tempEducation.degree!,
        field: tempEducation.field!,
        startDate: dates[0]?.trim() || value,
        endDate: dates[1]?.trim() || '',
      };
      
      setCvData(prev => ({
        ...prev,
        education: [...prev.education, newEdu]
      }));
      
      addActionMessage(`✓ ${isHe ? 'נוסף' : 'Added'}: ${newEdu.degree} - ${newEdu.institution}`, true);
      setTempEducation({});
      
      addBotMessage(isHe ? 'רוצה להוסיף עוד השכלה? (כן/לא)' : 'Want to add more education? (yes/no)');
    }
  };

  const handleEducationMore = (yes: boolean) => {
    if (yes) {
      addBotMessage(isHe ? 'שם המוסד והתואר הבא?' : 'Next institution and degree?');
    } else {
      setCurrentStep('skills');
      addBotMessage(
        isHe 
          ? '🛠️ עכשיו נוסיף כישורים. רשום את הכישורים הטכניים שלך (מופרדים בפסיקים):'
          : "🛠️ Now let's add skills. List your technical skills (comma-separated):",
        'skills'
      );
    }
  };

  const handleSkillsInput = (value: string) => {
    if (cvData.skills.technical.length === 0) {
      const skills = value.split(',').map(s => s.trim()).filter(Boolean);
      setCvData(prev => ({
        ...prev,
        skills: { ...prev.skills, technical: skills }
      }));
      addActionMessage(`✓ ${isHe ? 'כישורים טכניים' : 'Technical skills'}: ${skills.length} ${isHe ? 'נוספו' : 'added'}`, true);
      addBotMessage(isHe ? 'כישורים רכים (תקשורת, עבודת צוות וכו\'):' : 'Soft skills (communication, teamwork, etc.):');
    } else {
      const skills = value.split(',').map(s => s.trim()).filter(Boolean);
      setCvData(prev => ({
        ...prev,
        skills: { ...prev.skills, soft: skills }
      }));
      addActionMessage(`✓ ${isHe ? 'כישורים רכים' : 'Soft skills'}: ${skills.length} ${isHe ? 'נוספו' : 'added'}`, true);
      
      setCurrentStep('languages');
      addBotMessage(
        isHe 
          ? '🌍 אילו שפות אתה דובר? (לדוגמה: עברית - שפת אם, אנגלית - שוטף)'
          : '🌍 What languages do you speak? (e.g., English - native, Spanish - fluent)',
        'languages'
      );
    }
  };

  const handleLanguagesInput = (value: string) => {
    const langEntries = value.split(',').map(l => {
      const parts = l.split(/[-–:]/);
      return {
        name: parts[0]?.trim() || l.trim(),
        level: (parts[1]?.trim().toLowerCase() || 'intermediate') as CVLanguage['level'],
      };
    });
    
    setCvData(prev => ({
      ...prev,
      skills: { ...prev.skills, languages: langEntries }
    }));
    
    addActionMessage(`✓ ${isHe ? 'שפות' : 'Languages'}: ${langEntries.map(l => l.name).join(', ')}`, true);
    
    setCurrentStep('style');
    addBotMessage(
      isHe 
        ? '🎨 מעולה! עכשיו בחר סגנון לקורות החיים. איזה סגנון מתאים לך?'
        : '🎨 Excellent! Now choose a style for your CV. Which style suits you?',
      'style'
    );
  };

  const handleProjectsInput = (value: string) => {
    // Simple project add
    const proj: Project = {
      id: generateId(),
      name: value,
      description: '',
    };
    setCvData(prev => ({
      ...prev,
      projects: [...prev.projects, proj]
    }));
    addActionMessage(`✓ ${isHe ? 'פרויקט' : 'Project'}: ${value}`, true);
  };

  const selectStyle = (style: string) => {
    setCvData(prev => ({
      ...prev,
      settings: { ...prev.settings, colorPreset: style as any }
    }));
    addUserMessage(style);
    addActionMessage(`✓ ${isHe ? 'סגנון' : 'Style'}: ${style}`, true);
    
    setCurrentStep('generate');
    addBotMessage(
      isHe 
        ? '🚀 מושלם! הכל מוכן. לחץ על הכפתור למטה כדי ליצור את קורות החיים שלך עם AI!'
        : '🚀 Perfect! Everything is ready. Click the button below to generate your CV with AI!',
      'generate'
    );
  };

  const generateCV = async () => {
    setIsGenerating(true);
    addBotMessage(isHe ? '⏳ יוצר את קורות החיים שלך...' : '⏳ Generating your CV...');
    
    try {
      const { data, error } = await supabase.functions.invoke('cv-generate-visual', {
        body: { cvData },
      });
      
      if (error) throw error;
      
      if (data?.image) {
        setGeneratedImage(data.image);
        addBotMessage(
          isHe 
            ? '🎉 קורות החיים שלך מוכנים! אתה יכול להוריד אותם או לערוך ולנסות שוב.'
            : '🎉 Your CV is ready! You can download it or edit and try again.'
        );
      } else {
        addBotMessage(
          isHe 
            ? '✨ הנתונים נשמרו! כרגע יצירת תמונה עדיין בפיתוח, אבל אתה יכול להוריד PDF מהעורך המלא.'
            : '✨ Data saved! Image generation is still in development, but you can download a PDF from the full editor.'
        );
      }
      
      // Save to profile
      await supabase
        .from('profiles')
        .update({ cv_data: JSON.parse(JSON.stringify(cvData)) })
        .eq('user_id', user?.id);
        
      toast.success(isHe ? 'קורות החיים נשמרו!' : 'CV saved!');
      
    } catch (err) {
      console.error('CV generation error:', err);
      toast.error(isHe ? 'שגיאה ביצירת קורות החיים' : 'Error generating CV');
      addBotMessage(isHe ? '❌ אירעה שגיאה. נסה שוב.' : '❌ An error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleYesNo = (value: string) => {
    const isYes = value.toLowerCase().includes('yes') || value.includes('כן');
    
    if (currentStep === 'experience') {
      handleExperienceMore(isYes);
    } else if (currentStep === 'education') {
      handleEducationMore(isYes);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputValue.trim();
    if (!value) return;
    
    // Check for yes/no responses
    if (['yes', 'no', 'כן', 'לא'].some(w => value.toLowerCase() === w)) {
      handleYesNo(value);
      addUserMessage(value);
      setInputValue('');
      return;
    }
    
    handleInput(value);
  };

  const styleOptions = [
    { id: 'default', label: isHe ? 'מודרני כחול' : 'Modern Blue', color: '#3b82f6' },
    { id: 'professional', label: isHe ? 'עסקי נייבי' : 'Professional Navy', color: '#1e3a5f' },
    { id: 'creative', label: isHe ? 'יצירתי סגול' : 'Creative Purple', color: '#8b5cf6' },
    { id: 'minimal', label: isHe ? 'מינימלי אפור' : 'Minimal Gray', color: '#374151' },
    { id: 'bold', label: isHe ? 'נועז אדום' : 'Bold Red', color: '#dc2626' },
    { id: 'elegant', label: isHe ? 'אלגנטי טורקיז' : 'Elegant Teal', color: '#0d9488' },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold">{isHe ? 'בונה קורות חיים AI' : 'AI CV Builder'}</h1>
            <p className="text-xs text-muted-foreground">
              {isHe ? 'שיחה → קורות חיים מעוצבים' : 'Conversation → Designed CV'}
            </p>
          </div>
        </div>
        
        {/* Progress badges */}
        <div className="hidden md:flex items-center gap-2">
          {['personal', 'experience', 'education', 'skills', 'style'].map((step, idx) => {
            const steps: BuilderStep[] = ['personal', 'experience', 'education', 'skills', 'style'];
            const currentIdx = steps.indexOf(currentStep);
            const isCompleted = idx < currentIdx;
            const isCurrent = step === currentStep;
            
            return (
              <Badge 
                key={step}
                variant={isCompleted ? 'default' : isCurrent ? 'secondary' : 'outline'}
                className="text-xs"
              >
                {isCompleted && <CheckCircle className="w-3 h-3 me-1" />}
                {step === 'personal' && (isHe ? 'אישי' : 'Personal')}
                {step === 'experience' && (isHe ? 'ניסיון' : 'Experience')}
                {step === 'education' && (isHe ? 'השכלה' : 'Education')}
                {step === 'skills' && (isHe ? 'כישורים' : 'Skills')}
                {step === 'style' && (isHe ? 'סגנון' : 'Style')}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.type === 'bot' && (
                <div className="flex gap-2 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-2">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              )}
              
              {msg.type === 'user' && (
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-none px-4 py-2 max-w-[80%]">
                  <p className="text-sm">{msg.content}</p>
                </div>
              )}
              
              {msg.type === 'action' && (
                <div className="w-full">
                  <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-1.5">
                    {msg.completed && <CheckCircle className="w-4 h-4 text-accent" />}
                    <span className="text-xs text-accent">{msg.content}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Style Selection */}
          {currentStep === 'style' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
              {styleOptions.map((style) => (
                <Button
                  key={style.id}
                  variant="outline"
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => selectStyle(style.id)}
                >
                  <div 
                    className="w-8 h-8 rounded-full border-2"
                    style={{ backgroundColor: style.color }}
                  />
                  <span className="text-xs">{style.label}</span>
                </Button>
              ))}
            </div>
          )}
          
          {/* Generate Button */}
          {currentStep === 'generate' && (
            <div className="flex justify-center mt-6">
              <Button
                size="lg"
                onClick={generateCV}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isHe ? 'יוצר...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {isHe ? 'צור קורות חיים עם AI' : 'Generate CV with AI'}
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Generated Image */}
          {generatedImage && (
            <Card className="mt-6 overflow-hidden">
              <CardContent className="p-0">
                <img 
                  src={generatedImage} 
                  alt="Generated CV" 
                  className="w-full"
                />
                <div className="p-4 flex gap-2">
                  <Button className="flex-1 gap-2" asChild>
                    <a href={generatedImage} download="my-cv.png">
                      <Download className="w-4 h-4" />
                      {isHe ? 'הורד' : 'Download'}
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      {currentStep !== 'generate' && currentStep !== 'style' && (
        <form onSubmit={handleSubmit} className="p-4 border-t bg-card">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isHe ? 'הקלד תשובה...' : 'Type your answer...'}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
