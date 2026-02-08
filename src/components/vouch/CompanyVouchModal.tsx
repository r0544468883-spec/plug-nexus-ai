import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Star, Loader2, Fuel, AlertTriangle, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyVouchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  companyId: string;
  companyName: string;
  triggerType: 'time_based' | 'stage_change' | 'completion';
  triggerStage?: string;
  onComplete?: () => void;
}

const CREDIT_REWARDS = {
  completion: 50,
  stage_change: 10,
  time_based: 10,
};

type ProcessOutcome = 'hired' | 'rejected' | 'ghosted' | 'withdrew' | 'ongoing';

export function CompanyVouchModal({
  open,
  onOpenChange,
  applicationId,
  companyId,
  companyName,
  triggerType,
  triggerStage,
  onComplete,
}: CompanyVouchModalProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { refreshCredits } = useCredits();
  const queryClient = useQueryClient();
  const isHebrew = language === 'he';

  const [ratings, setRatings] = useState({
    communication: 0,
    process_speed: 0,
    transparency: 0,
    overall: 0,
  });
  const [outcome, setOutcome] = useState<ProcessOutcome | ''>('');
  const [feedback, setFeedback] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  const creditsReward = CREDIT_REWARDS[triggerType];

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Submit the company vouch
      const { error: vouchError } = await supabase
        .from('company_vouches')
        .upsert({
          user_id: user.id,
          company_id: companyId,
          application_id: applicationId,
          communication_rating: ratings.communication || null,
          process_speed_rating: ratings.process_speed || null,
          transparency_rating: ratings.transparency || null,
          overall_rating: ratings.overall || null,
          process_outcome: outcome || null,
          feedback_text: feedback || null,
          would_recommend: wouldRecommend,
        }, {
          onConflict: 'user_id,company_id,application_id'
        });

      if (vouchError) throw vouchError;

      // Mark the prompt as completed and award credits
      const { error: promptError } = await supabase
        .from('company_vouch_prompts')
        .upsert({
          user_id: user.id,
          application_id: applicationId,
          company_id: companyId,
          trigger_type: triggerType,
          trigger_stage: triggerStage,
          vouch_completed: true,
          vouch_completed_at: new Date().toISOString(),
          credits_awarded: creditsReward,
        }, {
          onConflict: 'user_id,application_id,trigger_type,trigger_stage'
        });

      if (promptError) throw promptError;

      // Award credits via edge function
      const { error: creditError } = await supabase.functions.invoke('award-credits', {
        body: {
          userId: user.id,
          amount: creditsReward,
          creditType: 'permanent',
          actionType: 'company_vouch',
          description: `Company vouch for ${companyName}`,
        },
      });

      if (creditError) throw creditError;
    },
    onSuccess: () => {
      toast.success(
        isHebrew 
          ? `תודה! קיבלת +${creditsReward} דלק קבוע 🚀` 
          : `Thanks! You earned +${creditsReward} Permanent Fuel 🚀`
      );
      refreshCredits();
      queryClient.invalidateQueries({ queryKey: ['company-vouch-prompts'] });
      onComplete?.();
      onOpenChange(false);
    },
    onError: () => {
      toast.error(isHebrew ? 'שגיאה בשליחה' : 'Failed to submit');
    },
  });

  const handleDismiss = async () => {
    if (!user?.id) return;

    await supabase
      .from('company_vouch_prompts')
      .upsert({
        user_id: user.id,
        application_id: applicationId,
        company_id: companyId,
        trigger_type: triggerType,
        trigger_stage: triggerStage,
        dismissed: true,
      }, {
        onConflict: 'user_id,application_id,trigger_type,trigger_stage'
      });

    onOpenChange(false);
  };

  const StarRating = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: number; 
    onChange: (v: number) => void; 
    label: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={cn(
                'h-6 w-6 transition-colors',
                star <= value 
                  ? 'fill-accent text-accent' 
                  : 'text-muted-foreground/30'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );

  const outcomeOptions: { value: ProcessOutcome; label: string; labelHe: string }[] = [
    { value: 'hired', label: 'Got hired! 🎉', labelHe: 'התקבלתי! 🎉' },
    { value: 'rejected', label: 'Rejected', labelHe: 'נדחיתי' },
    { value: 'ghosted', label: 'Ghosted 👻', labelHe: 'גוסטינג 👻' },
    { value: 'withdrew', label: 'I withdrew', labelHe: 'פרשתי' },
    { value: 'ongoing', label: 'Still ongoing', labelHe: 'עדיין בתהליך' },
  ];

  const isValid = ratings.overall > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {isHebrew 
              ? `איך התהליך ב-${companyName}?` 
              : `How was the process at ${companyName}?`}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-accent font-medium">
            <Fuel className="h-4 w-4" />
            {isHebrew 
              ? `שתף וקבל +${creditsReward} דלק קבוע!` 
              : `Share and earn +${creditsReward} Permanent Fuel!`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4" dir={isHebrew ? 'rtl' : 'ltr'}>
          {/* Ratings */}
          <div className="grid gap-4">
            <StarRating
              value={ratings.communication}
              onChange={(v) => setRatings((r) => ({ ...r, communication: v }))}
              label={isHebrew ? 'תקשורת ומענה' : 'Communication & Response'}
            />
            <StarRating
              value={ratings.process_speed}
              onChange={(v) => setRatings((r) => ({ ...r, process_speed: v }))}
              label={isHebrew ? 'מהירות התהליך' : 'Process Speed'}
            />
            <StarRating
              value={ratings.transparency}
              onChange={(v) => setRatings((r) => ({ ...r, transparency: v }))}
              label={isHebrew ? 'שקיפות' : 'Transparency'}
            />
            <StarRating
              value={ratings.overall}
              onChange={(v) => setRatings((r) => ({ ...r, overall: v }))}
              label={isHebrew ? 'ציון כללי *' : 'Overall Rating *'}
            />
          </div>

          {/* Process Outcome */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'איך הסתיים התהליך?' : 'How did it end?'}</Label>
            <RadioGroup
              value={outcome}
              onValueChange={(v) => setOutcome(v as ProcessOutcome)}
              className="grid grid-cols-2 gap-2"
            >
              {outcomeOptions.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2 rtl:space-x-reverse">
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <Label htmlFor={opt.value} className="text-sm cursor-pointer">
                    {isHebrew ? opt.labelHe : opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Would Recommend */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'האם תמליץ על החברה?' : 'Would you recommend this company?'}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={wouldRecommend === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setWouldRecommend(true)}
              >
                {isHebrew ? 'כן 👍' : 'Yes 👍'}
              </Button>
              <Button
                type="button"
                variant={wouldRecommend === false ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setWouldRecommend(false)}
              >
                {isHebrew ? 'לא 👎' : 'No 👎'}
              </Button>
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <Label>{isHebrew ? 'משהו נוסף? (אופציונלי)' : 'Anything else? (optional)'}</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={isHebrew ? 'שתף את החוויה שלך...' : 'Share your experience...'}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Disclaimer */}
          <div className="flex gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <Star className="h-4 w-4 flex-shrink-0 text-accent" />
            <p>
              {isHebrew 
                ? '(*) חשוב לדעת: ה-VOUCH לחברות הוא אנונימי לחלוטין. אנו מצפים מקהילת PLUG לא לעשות שימוש לרעה במערכת, אלא לייצר שקיפות אמיתית שתעזור לכולנו למנוע תופעות כמו גוסטינג ולייעל את תהליכי הגיוס.'
                : '(*) Important: Company VOUCHes are completely anonymous. We expect the PLUG community not to abuse this system, but to create real transparency that helps us all prevent issues like ghosting and improve hiring processes.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={handleDismiss}>
              {isHebrew ? 'לא עכשיו' : 'Not now'}
            </Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!isValid || submitMutation.isPending}
              className="gap-2"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Fuel className="h-4 w-4" />
              )}
              {isHebrew ? `שלח וקבל +${creditsReward}` : `Submit & Earn +${creditsReward}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
