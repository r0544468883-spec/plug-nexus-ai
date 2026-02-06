import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Credit costs for different actions
const CREDIT_COSTS: Record<string, number> = {
  'cv_builder': 10,
  'interview_prep': 5,
  'resume_match': 3,
  'ping': 15, // Only charged after 4 free pings
};

const FREE_PINGS_PER_DAY = 4;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the user's JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get their ID
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, customAmount } = await req.json();
    
    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deduct-credits] User ${user.id} requesting ${action}`);

    // Get current credits
    const { data: credits, error: creditsError } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (creditsError || !credits) {
      console.error('[deduct-credits] Credits not found:', creditsError);
      return new Response(
        JSON.stringify({ error: 'Credits not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if daily fuel needs reset (date changed)
    const today = new Date().toISOString().split('T')[0];
    let dailyFuel = credits.daily_fuel;
    let pingsToday = credits.pings_today;
    
    if (credits.last_refill_date !== today) {
      console.log('[deduct-credits] Resetting daily fuel for user', user.id);
      dailyFuel = 20;
      pingsToday = 0;
      
      await supabase
        .from('user_credits')
        .update({ 
          daily_fuel: 20, 
          last_refill_date: today,
          pings_today: 0 
        })
        .eq('user_id', user.id);
    }

    // Handle ping action specially (4 free per day)
    let amountToDeduct = customAmount || CREDIT_COSTS[action] || 0;
    
    if (action === 'ping') {
      if (pingsToday < FREE_PINGS_PER_DAY) {
        // Free ping - just increment counter
        await supabase
          .from('user_credits')
          .update({ pings_today: pingsToday + 1 })
          .eq('user_id', user.id);

        console.log(`[deduct-credits] Free ping ${pingsToday + 1}/${FREE_PINGS_PER_DAY}`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            free_ping: true,
            pings_used: pingsToday + 1,
            pings_remaining: FREE_PINGS_PER_DAY - (pingsToday + 1),
            daily_fuel: dailyFuel,
            permanent_fuel: credits.permanent_fuel
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Beyond free pings, charge 15 credits
      amountToDeduct = CREDIT_COSTS['ping'];
    }

    // Check total available credits
    const totalCredits = dailyFuel + credits.permanent_fuel;
    
    if (totalCredits < amountToDeduct) {
      console.log(`[deduct-credits] Insufficient credits: ${totalCredits} < ${amountToDeduct}`);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits',
          required: amountToDeduct,
          available: totalCredits,
          daily_fuel: dailyFuel,
          permanent_fuel: credits.permanent_fuel
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Priority: Deduct from daily_fuel first, then permanent_fuel
    let dailyDeduct = Math.min(dailyFuel, amountToDeduct);
    let permanentDeduct = amountToDeduct - dailyDeduct;
    
    const newDailyFuel = dailyFuel - dailyDeduct;
    const newPermanentFuel = credits.permanent_fuel - permanentDeduct;
    const newPingsToday = action === 'ping' ? pingsToday + 1 : pingsToday;

    // Update credits
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ 
        daily_fuel: newDailyFuel,
        permanent_fuel: newPermanentFuel,
        pings_today: newPingsToday,
        last_refill_date: today,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[deduct-credits] Update error:', updateError);
      throw updateError;
    }

    // Log the transaction(s)
    const transactions = [];
    if (dailyDeduct > 0) {
      transactions.push({
        user_id: user.id,
        amount: -dailyDeduct,
        credit_type: 'daily',
        action_type: action,
        description: `Used ${dailyDeduct} daily fuel for ${action}`
      });
    }
    if (permanentDeduct > 0) {
      transactions.push({
        user_id: user.id,
        amount: -permanentDeduct,
        credit_type: 'permanent',
        action_type: action,
        description: `Used ${permanentDeduct} permanent fuel for ${action}`
      });
    }

    if (transactions.length > 0) {
      await supabase.from('credit_transactions').insert(transactions);
    }

    console.log(`[deduct-credits] Success: ${action} cost ${amountToDeduct} (daily: -${dailyDeduct}, perm: -${permanentDeduct})`);

    return new Response(
      JSON.stringify({ 
        success: true,
        deducted: amountToDeduct,
        daily_fuel: newDailyFuel,
        permanent_fuel: newPermanentFuel,
        total_credits: newDailyFuel + newPermanentFuel,
        pings_today: newPingsToday
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[deduct-credits] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
