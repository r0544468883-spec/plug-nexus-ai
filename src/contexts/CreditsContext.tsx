import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from './LanguageContext';

interface UserCredits {
  id: string;
  user_id: string;
  daily_fuel: number;
  permanent_fuel: number;
  is_onboarded: boolean;
  last_refill_date: string;
  pings_today: number;
  referral_code: string | null;
  vouches_given_this_month: number;
  vouches_received_this_month: number;
}

interface CreditTransaction {
  id: string;
  amount: number;
  credit_type: 'daily' | 'permanent';
  action_type: string;
  description: string | null;
  created_at: string;
}

interface CreditsContextType {
  credits: UserCredits | null;
  isLoading: boolean;
  totalCredits: number;
  transactions: CreditTransaction[];
  refreshCredits: () => Promise<void>;
  deductCredits: (action: string, customAmount?: number) => Promise<{ success: boolean; error?: string }>;
  awardCredits: (action: string, taskId?: string, referralCode?: string) => Promise<{ success: boolean; awarded?: number; error?: string }>;
  canAfford: (amount: number) => boolean;
  markOnboarded: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export const CreditsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const totalCredits = (credits?.daily_fuel || 0) + (credits?.permanent_fuel || 0);

  const refreshCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch credits
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (creditsError) throw creditsError;

      // If no credits record exists yet (shouldn't happen due to trigger, but fallback)
      if (!creditsData) {
        console.log('[CreditsContext] No credits record found, will be created by trigger');
        setCredits(null);
      } else {
        // Check if daily fuel needs reset
        const today = new Date().toISOString().split('T')[0];
        if (creditsData.last_refill_date !== today) {
          // Reset daily fuel locally and update in background
          const updatedCredits = {
            ...creditsData,
            daily_fuel: 20,
            pings_today: 0,
            last_refill_date: today,
          };
          setCredits(updatedCredits as UserCredits);
          
          // Update in database
          await supabase
            .from('user_credits')
            .update({ 
              daily_fuel: 20, 
              pings_today: 0, 
              last_refill_date: today 
            })
            .eq('user_id', user.id);

          toast.success(
            isRTL ? '⚡ הדלק היומי שלך התמלא!' : '⚡ Your daily fuel has been refilled!',
            { duration: 3000 }
          );
        } else {
          setCredits(creditsData as UserCredits);
        }
      }

      // Fetch recent transactions
      const { data: txData } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setTransactions((txData || []) as CreditTransaction[]);
    } catch (error) {
      console.error('[CreditsContext] Error fetching credits:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isRTL]);

  // Initial load and refresh on user change
  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[CreditsContext] Realtime update:', payload);
          if (payload.new) {
            setCredits(payload.new as UserCredits);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const deductCredits = useCallback(async (action: string, customAmount?: number) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('deduct-credits', {
        body: { action, customAmount }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error === 'Insufficient credits') {
          toast.error(
            isRTL ? '❌ אין מספיק קרדיטים' : '❌ Insufficient credits',
            {
              description: isRTL 
                ? `צריך ${data.required} קרדיטים, יש לך ${data.available}`
                : `Need ${data.required} credits, you have ${data.available}`,
            }
          );
        }
        return { success: false, error: data.error };
      }

      // Update local state
      setCredits(prev => prev ? {
        ...prev,
        daily_fuel: data.daily_fuel,
        permanent_fuel: data.permanent_fuel,
        pings_today: data.pings_today ?? prev.pings_today,
      } : null);

      await refreshCredits();
      return { success: true };
    } catch (error: any) {
      console.error('[CreditsContext] Deduct error:', error);
      return { success: false, error: error.message };
    }
  }, [user, isRTL, refreshCredits]);

  const awardCredits = useCallback(async (action: string, taskId?: string, referralCode?: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('award-credits', {
        body: { action, taskId, referralCode }
      });

      if (error) throw error;

      if (data.error) {
        if (data.already_completed || data.already_referred) {
          return { success: false, error: data.error };
        }
        if (data.cap_reached) {
          toast.info(
            isRTL ? '🔒 הגעת למגבלה' : '🔒 Limit reached',
            {
              description: isRTL 
                ? `כבר הרווחת את המקסימום להיום/לחודש`
                : `You've already earned the maximum for today/this month`,
            }
          );
          return { success: false, error: data.error };
        }
        return { success: false, error: data.error };
      }

      // Show success toast with mint green styling
      toast.success(
        isRTL ? `⚡ +${data.awarded} דלק קבוע!` : `⚡ +${data.awarded} Permanent Fuel!`,
        { 
          duration: 3000,
          style: { 
            background: 'hsl(var(--accent))',
            color: 'hsl(var(--accent-foreground))',
          }
        }
      );

      // Update local state
      setCredits(prev => prev ? {
        ...prev,
        permanent_fuel: data.permanent_fuel,
      } : null);

      await refreshCredits();
      return { success: true, awarded: data.awarded };
    } catch (error: any) {
      console.error('[CreditsContext] Award error:', error);
      return { success: false, error: error.message };
    }
  }, [user, isRTL, refreshCredits]);

  const canAfford = useCallback((amount: number) => {
    return totalCredits >= amount;
  }, [totalCredits]);

  const markOnboarded = useCallback(async () => {
    if (!user || !credits) return;

    try {
      await supabase
        .from('user_credits')
        .update({ is_onboarded: true })
        .eq('user_id', user.id);

      setCredits(prev => prev ? { ...prev, is_onboarded: true } : null);
    } catch (error) {
      console.error('[CreditsContext] Error marking onboarded:', error);
    }
  }, [user, credits]);

  return (
    <CreditsContext.Provider value={{
      credits,
      isLoading,
      totalCredits,
      transactions,
      refreshCredits,
      deductCredits,
      awardCredits,
      canAfford,
      markOnboarded,
    }}>
      {children}
    </CreditsContext.Provider>
  );
};

export const useCredits = () => {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
};
