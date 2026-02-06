import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Secret promo code - validated server-side only
const PROMO_CODES: Record<string, { type: 'unlimited' | 'bonus'; amount?: number }> = {
  'Plugismybestfriend': { type: 'unlimited' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code } = await req.json();
    
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code exists (case-sensitive)
    const promoConfig = PROMO_CODES[code];
    
    if (!promoConfig) {
      console.log(`Invalid promo code attempt: ${code.substring(0, 3)}...`);
      return new Response(
        JSON.stringify({ error: 'Invalid promo code', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already redeemed this code
    const { data: existingRedemption } = await supabase
      .from('promo_code_redemptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('code', code)
      .maybeSingle();

    if (existingRedemption) {
      return new Response(
        JSON.stringify({ error: 'Code already redeemed', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply the promo code
    let creditsAwarded = 0;
    
    if (promoConfig.type === 'unlimited') {
      // Set a very high amount of permanent fuel (999999)
      creditsAwarded = 999999;
      
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          permanent_fuel: 999999,
          daily_fuel: 999999 
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating credits:', updateError);
        throw new Error('Failed to apply promo code');
      }
    } else if (promoConfig.type === 'bonus' && promoConfig.amount) {
      creditsAwarded = promoConfig.amount;
      
      const { error: updateError } = await supabase.rpc('increment_permanent_fuel', {
        p_user_id: user.id,
        p_amount: promoConfig.amount
      });

      if (updateError) {
        console.error('Error incrementing credits:', updateError);
        throw new Error('Failed to apply promo code');
      }
    }

    // Record the redemption
    await supabase
      .from('promo_code_redemptions')
      .insert({
        user_id: user.id,
        code: code,
        credits_awarded: creditsAwarded
      });

    // Log the transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        action: 'promo_code',
        amount: creditsAwarded,
        fuel_type: 'permanent',
        description: `Promo code: ${code.substring(0, 4)}***`
      });

    console.log(`Promo code redeemed by user ${user.id}: ${creditsAwarded} credits`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        creditsAwarded,
        message: promoConfig.type === 'unlimited' ? 'Unlimited fuel activated! 🚀' : `${creditsAwarded} fuel added!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Promo code error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to redeem code', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
