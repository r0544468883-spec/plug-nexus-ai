import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff,
  Play, 
  Square, 
  RotateCcw,
  Loader2,
  Camera,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Download,
  Volume2,
  VolumeX,
  Languages
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InterviewQuestion {
  id: string;
  question: string;
  category: 'behavioral' | 'technical' | 'situational';
  tip?: string;
}

interface VideoPracticeSessionProps {
  questions: InterviewQuestion[];
  onComplete: () => void;
  onBack: () => void;
}

export function VideoPracticeSession({ questions, onComplete, onBack }: VideoPracticeSessionProps) {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognitionLang, setRecognitionLang] = useState<'he' | 'en'>(isRTL ? 'he' : 'en');

  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Speech recognition for Hebrew/English
  const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  };

  const initRecognition = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return null;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Use manually selected recognition language
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
    };

    recognition.onend = () => {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log('Recognition restart failed:', e);
        }
      }
    };

    return recognition;
  }, [recognitionLang, isListening]);

  // Reinitialize speech recognition when recognition language changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [recognitionLang]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Text-to-Speech: Read question aloud
  const speakQuestion = useCallback(() => {
    if (!currentQuestion || isSpeaking) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
    utterance.lang = isRTL ? 'he-IL' : 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;

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

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      streamRef.current = stream;
      setPermissionGranted(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Prevent echo
        await videoRef.current.play();
      }

      setIsPreviewing(true);
      toast.success(isRTL ? 'המצלמה מוכנה!' : 'Camera ready!');
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      if (error.name === 'NotAllowedError') {
        toast.error(isRTL ? 'נא לאשר גישה למצלמה ולמיקרופון' : 'Please allow camera and microphone access');
        setPermissionGranted(false);
      } else {
        toast.error(isRTL ? 'שגיאה בהפעלת המצלמה' : 'Error starting camera');
      }
    } finally {
      setIsInitializing(false);
    }
  }, [isRTL]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsPreviewing(false);
  }, []);

  const handleStartRecording = async () => {
    if (!streamRef.current) {
      await startCamera();
      return;
    }

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      videoChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: mimeType });
        setRecordedVideo(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);

      // Start speech recognition for transcription
      if (!recognitionRef.current) {
        recognitionRef.current = initRecognition();
      }
      if (recognitionRef.current) {
        setTranscript('');
        setInterimTranscript('');
        setIsListening(true);
        recognitionRef.current.start();
      }

      toast.success(isRTL ? 'ההקלטה החלה!' : 'Recording started!');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error(isRTL ? 'שגיאה בהפעלת ההקלטה' : 'Error starting recording');
    }
  };

  const handleStopRecording = () => {
    // Stop speech recognition
    if (recognitionRef.current) {
      setIsListening(false);
      recognitionRef.current.stop();
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    toast.success(isRTL ? 'ההקלטה הסתיימה' : 'Recording stopped');
  };

  const handlePlayRecording = () => {
    if (!recordedVideo || !playbackVideoRef.current) return;

    const videoUrl = URL.createObjectURL(recordedVideo);
    playbackVideoRef.current.src = videoUrl;
    playbackVideoRef.current.play();
  };

  const handleDownload = () => {
    if (!recordedVideo) return;

    const url = URL.createObjectURL(recordedVideo);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-practice-q${currentQuestionIndex + 1}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(isRTL ? 'הסרטון הורד!' : 'Video downloaded!');
  };

  const handleReset = () => {
    setRecordedVideo(null);
    setTranscript('');
    setInterimTranscript('');
    if (playbackVideoRef.current) {
      playbackVideoRef.current.src = '';
    }
  };

  const handleNextQuestion = () => {
    handleReset();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      stopCamera();
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
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => { stopCamera(); onBack(); }} className="gap-2">
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isRTL ? 'חזור' : 'Back'}
        </Button>
        <Badge variant="outline" className="gap-1">
          <Video className="w-3 h-3" />
          {isRTL ? 'אימון וידאו' : 'Video Practice'}
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

      {/* Video Display */}
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-video bg-muted">
            {/* Live Preview */}
            <video
              ref={videoRef}
              className={cn(
                "absolute inset-0 w-full h-full object-cover",
                recordedVideo ? "hidden" : "block"
              )}
              playsInline
              muted
            />

            {/* Recorded Playback */}
            <video
              ref={playbackVideoRef}
              className={cn(
                "absolute inset-0 w-full h-full object-cover",
                recordedVideo ? "block" : "hidden"
              )}
              playsInline
              controls
            />

            {/* No Camera Placeholder */}
            {!isPreviewing && !recordedVideo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                {isInitializing ? (
                  <>
                    <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
                    <p className="text-muted-foreground">
                      {isRTL ? 'מפעיל מצלמה...' : 'Starting camera...'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                      <VideoOff className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-center px-4">
                      {isRTL 
                        ? 'לחץ על "הפעל מצלמה" להתחלה'
                        : 'Click "Start Camera" to begin'}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Recording Indicator */}
            {isRecording && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-sm font-medium">REC</span>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcript Display */}
      {(transcript || interimTranscript || isRecording) && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
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
              {/* Language Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleRecognitionLang}
                disabled={isRecording}
                className="gap-2"
              >
                <Languages className="w-4 h-4" />
                {recognitionLang === 'he' ? '🇮🇱' : '🇬🇧'}
              </Button>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 min-h-[60px] max-h-[150px] overflow-y-auto">
              <p className="text-sm leading-relaxed" dir={recognitionLang === 'he' ? 'rtl' : 'ltr'}>
                {transcript + (interimTranscript ? ' ' + interimTranscript : '') || (
                  <span className="text-muted-foreground italic">
                    {isRTL ? 'התחל לדבר...' : 'Start speaking...'}
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!isPreviewing && !recordedVideo ? (
          <Button
            size="lg"
            onClick={startCamera}
            disabled={isInitializing}
            className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            {isInitializing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
            {isRTL ? 'הפעל מצלמה' : 'Start Camera'}
          </Button>
        ) : !isRecording && !recordedVideo ? (
          <>
            <Button
              size="lg"
              onClick={handleStartRecording}
              className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              <Video className="w-5 h-5" />
              {isRTL ? 'התחל הקלטה' : 'Start Recording'}
            </Button>
            <Button variant="outline" size="lg" onClick={stopCamera} className="gap-2">
              <VideoOff className="w-5 h-5" />
              {isRTL ? 'כבה מצלמה' : 'Stop Camera'}
            </Button>
          </>
        ) : isRecording ? (
          <Button
            size="lg"
            variant="destructive"
            onClick={handleStopRecording}
            className="gap-2"
          >
            <Square className="w-5 h-5" />
            {isRTL ? 'עצור הקלטה' : 'Stop Recording'}
          </Button>
        ) : recordedVideo ? (
          <>
            <Button variant="outline" size="lg" onClick={handlePlayRecording} className="gap-2">
              <Play className="w-5 h-5" />
              {isRTL ? 'נגן' : 'Play'}
            </Button>
            <Button variant="outline" size="lg" onClick={handleDownload} className="gap-2">
              <Download className="w-5 h-5" />
              {isRTL ? 'הורד' : 'Download'}
            </Button>
            <Button variant="ghost" size="lg" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-5 h-5" />
              {isRTL ? 'נקה' : 'Reset'}
            </Button>
          </>
        ) : null}
      </div>

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
