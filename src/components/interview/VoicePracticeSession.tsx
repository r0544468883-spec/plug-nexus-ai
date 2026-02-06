import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  RotateCcw,
  Volume2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Languages,
  VolumeX
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InterviewQuestion {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'situational';
  tip?: string;
}

interface VoicePracticeSessionProps {
  questions: InterviewQuestion[];
  onComplete: () => void;
  onBack: () => void;
}

export function VoicePracticeSession({ questions, onComplete, onBack }: VoicePracticeSessionProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognitionLang, setRecognitionLang] = useState<'he' | 'en'>(isRTL ? 'he' : 'en');

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Check for speech recognition support
  const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  };

  const initRecognition = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      toast.error(isRTL ? 'הדפדפן לא תומך בזיהוי קולי' : 'Speech recognition not supported');
      return null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Use the manually selected recognition language
    recognition.lang = recognitionLang === 'he' ? 'he-IL' : 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + ' ' + finalTranscript);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error(isRTL ? 'הרשאת מיקרופון נדחתה' : 'Microphone permission denied');
        setPermissionGranted(false);
      } else if (event.error !== 'no-speech') {
        console.log('Recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still in listening mode
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log('Recognition restart failed:', e);
        }
      }
    };

    return recognition;
  }, [recognitionLang, isListening, isRTL]);

  // Reinitialize speech recognition when recognition language changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [recognitionLang]);

  // Text-to-Speech: Read question aloud
  const speakQuestion = useCallback(() => {
    if (!currentQuestion || isSpeaking) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
    utterance.lang = isRTL ? 'he-IL' : 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Try to find a voice for the language
    const voices = window.speechSynthesis.getVoices();
    const langCode = isRTL ? 'he' : 'en';
    const voice = voices.find(v => v.lang.startsWith(langCode));
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error(isRTL ? 'שגיאה בהקראה' : 'Speech error');
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [currentQuestion, isRTL, isSpeaking]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleRecognitionLang = () => {
    const newLang = recognitionLang === 'he' ? 'en' : 'he';
    setRecognitionLang(newLang);
    toast.info(newLang === 'he' ? 'שפת זיהוי: עברית 🇮🇱' : 'Recognition: English 🇬🇧');
  };

  const handleStartRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;
      setPermissionGranted(true);

      // Start audio recording
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        setRecordedAudio(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);

      // Start speech recognition
      if (!recognitionRef.current) {
        recognitionRef.current = initRecognition();
      }

      if (recognitionRef.current) {
        setTranscript('');
        setInterimTranscript('');
        setIsListening(true);
        recognitionRef.current.start();
      }

      toast.success(isRTL ? 'ההקלטה החלה - דבר!' : 'Recording started - speak now!');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError') {
        toast.error(isRTL ? 'נא לאשר גישה למיקרופון' : 'Please allow microphone access');
        setPermissionGranted(false);
      } else {
        toast.error(isRTL ? 'שגיאה בהפעלת ההקלטה' : 'Error starting recording');
      }
    }
  };

  const handleStopRecording = () => {
    // Stop speech recognition
    if (recognitionRef.current) {
      setIsListening(false);
      recognitionRef.current.stop();
    }

    // Stop audio recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    toast.success(isRTL ? 'ההקלטה הסתיימה' : 'Recording stopped');
  };

  const handlePlayRecording = () => {
    if (!recordedAudio) return;

    const audioUrl = URL.createObjectURL(recordedAudio);
    audioRef.current = new Audio(audioUrl);
    
    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };
    audioRef.current.onerror = () => {
      setIsPlaying(false);
      toast.error(isRTL ? 'שגיאה בהשמעה' : 'Playback error');
    };

    audioRef.current.play();
  };

  const handleStopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    setTranscript('');
    setInterimTranscript('');
    setRecordedAudio(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleNextQuestion = () => {
    handleReset();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevQuestion = () => {
    handleReset();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const fullTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '');

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isRTL ? 'חזור' : 'Back'}
        </Button>
        <Badge variant="outline" className="gap-1">
          <Mic className="w-3 h-3" />
          {isRTL ? 'אימון קולי' : 'Voice Practice'}
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isRTL 
              ? `שאלה ${currentQuestionIndex + 1} מתוך ${questions.length}` 
              : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Current Question */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline">
              {currentQuestion?.category === 'behavioral' && (isRTL ? 'התנהגותי' : 'Behavioral')}
              {currentQuestion?.category === 'technical' && (isRTL ? 'טכני' : 'Technical')}
              {currentQuestion?.category === 'situational' && (isRTL ? 'סיטואציוני' : 'Situational')}
            </Badge>
            {/* Read aloud button */}
            <Button
              variant="outline"
              size="sm"
              onClick={isSpeaking ? stopSpeaking : speakQuestion}
              className="gap-2"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  {isRTL ? 'עצור' : 'Stop'}
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  {isRTL ? 'הקרא בקול' : 'Read Aloud'}
                </>
              )}
            </Button>
          </div>
          <h2 className="text-xl font-semibold mb-4">{currentQuestion?.question}</h2>
          {currentQuestion?.tip && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
              <Lightbulb className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{currentQuestion.tip}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recording Controls */}
      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-6">
          {/* Microphone Status */}
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center",
                isRecording 
                  ? "bg-destructive/20 text-destructive" 
                  : "bg-primary/10 text-primary"
              )}
            >
              {isRecording ? (
                <Mic className="w-10 h-10" />
              ) : (
                <MicOff className="w-10 h-10" />
              )}
            </motion.div>

            <p className="text-sm text-muted-foreground text-center">
              {isRecording 
                ? (isRTL ? 'מקליט... לחץ לעצירה' : 'Recording... click to stop')
                : (isRTL ? 'לחץ להתחלת הקלטה' : 'Click to start recording')}
            </p>
          </div>

          {/* Language Toggle for Recognition */}
          <div className="flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleRecognitionLang}
              disabled={isRecording}
              className="gap-2"
            >
              <Languages className="w-4 h-4" />
              {recognitionLang === 'he' ? '🇮🇱 עברית' : '🇬🇧 English'}
            </Button>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {!isRecording ? (
              <Button
                size="lg"
                onClick={handleStartRecording}
                className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                <Mic className="w-5 h-5" />
                {isRTL ? 'התחל הקלטה' : 'Start Recording'}
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStopRecording}
                className="gap-2"
              >
                <Square className="w-5 h-5" />
                {isRTL ? 'עצור הקלטה' : 'Stop Recording'}
              </Button>
            )}

            {recordedAudio && !isRecording && (
              <>
                {!isPlaying ? (
                  <Button variant="outline" size="lg" onClick={handlePlayRecording} className="gap-2">
                    <Play className="w-5 h-5" />
                    {isRTL ? 'השמע' : 'Play'}
                  </Button>
                ) : (
                  <Button variant="outline" size="lg" onClick={handleStopPlayback} className="gap-2">
                    <Square className="w-5 h-5" />
                    {isRTL ? 'עצור' : 'Stop'}
                  </Button>
                )}
                <Button variant="ghost" size="lg" onClick={handleReset} className="gap-2">
                  <RotateCcw className="w-5 h-5" />
                  {isRTL ? 'נקה' : 'Reset'}
                </Button>
              </>
            )}
          </div>

          {/* Transcript Display */}
          {(fullTranscript || isRecording) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Volume2 className="w-4 h-4 text-primary" />
                {isRTL ? 'תמלול' : 'Transcript'}
                {isRecording && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    {isRTL ? 'מקליט...' : 'Recording...'}
                  </span>
                )}
              </div>
              <div className="p-4 rounded-lg bg-muted/50 min-h-[100px] max-h-[200px] overflow-y-auto">
                <p className="text-sm leading-relaxed">
                  {fullTranscript || (
                    <span className="text-muted-foreground italic">
                      {isRTL ? 'התחל לדבר...' : 'Start speaking...'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevQuestion}
          disabled={currentQuestionIndex === 0}
          className="gap-2"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isRTL ? 'הקודם' : 'Previous'}
        </Button>
        <Button onClick={handleNextQuestion} className="gap-2">
          {currentQuestionIndex === questions.length - 1 
            ? (isRTL ? 'סיים' : 'Finish')
            : (isRTL ? 'הבא' : 'Next')}
          {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
