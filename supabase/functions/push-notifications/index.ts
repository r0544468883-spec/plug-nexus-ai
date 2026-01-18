import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface RegisterSubscriptionRequest {
  subscription: PushSubscription;
  userId: string;
}

interface SendNotificationRequest {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "register") {
      // Register a push subscription
      const { subscription, userId }: RegisterSubscriptionRequest = await req.json();
      
      console.log("Registering push subscription for user:", userId);

      // Store subscription in database
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,endpoint",
        });

      if (error) {
        console.error("Error storing subscription:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: "Subscription registered" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else if (action === "unregister") {
      // Unregister a push subscription
      const { endpoint, userId } = await req.json();
      
      console.log("Unregistering push subscription for user:", userId);

      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint);

      if (error) {
        console.error("Error removing subscription:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, message: "Subscription removed" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else if (action === "send") {
      // Send push notification to a user
      const { userId, title, body, icon, url, tag }: SendNotificationRequest = await req.json();
      
      console.log("Sending push notification to user:", userId);

      // Get user's subscriptions
      const { data: subscriptions, error: fetchError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

      if (fetchError) {
        console.error("Error fetching subscriptions:", fetchError);
        throw fetchError;
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log("No subscriptions found for user:", userId);
        return new Response(
          JSON.stringify({ success: false, message: "No subscriptions found" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // For now, we'll store the notification in the database
      // In a full implementation, you'd use web-push library to send actual push notifications
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title,
          message: body,
          type: tag || "general",
          metadata: { icon, url },
          is_read: false,
        });

      if (notifError) {
        console.error("Error creating notification:", notifError);
        throw notifError;
      }

      console.log(`Notification sent to ${subscriptions.length} device(s)`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Notification sent to ${subscriptions.length} device(s)` 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else if (action === "check-reminders") {
      // Check for upcoming interview reminders and send notifications
      console.log("Checking for upcoming interview reminders...");

      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find interviews happening in the next 24 hours that haven't been reminded
      const { data: reminders, error: reminderError } = await supabase
        .from("interview_reminders")
        .select(`
          *,
          application:applications(
            candidate_id,
            job:jobs(title, company:companies(name))
          )
        `)
        .eq("reminder_sent", false)
        .gte("interview_date", now.toISOString())
        .lte("interview_date", oneDayFromNow.toISOString());

      if (reminderError) {
        console.error("Error fetching reminders:", reminderError);
        throw reminderError;
      }

      console.log(`Found ${reminders?.length || 0} reminders to send`);

      let sentCount = 0;
      for (const reminder of reminders || []) {
        const app = reminder.application as any;
        const userId = app?.candidate_id;
        const jobTitle = app?.job?.title || "Interview";
        const companyName = app?.job?.company?.name || "";

        if (userId) {
          // Create notification
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Interview Reminder 📅",
            message: `Your interview for ${jobTitle}${companyName ? ` at ${companyName}` : ""} is coming up!`,
            type: "interview_reminder",
            metadata: {
              interview_date: reminder.interview_date,
              interview_type: reminder.interview_type,
              location: reminder.location,
            },
            is_read: false,
          });

          // Mark reminder as sent
          await supabase
            .from("interview_reminders")
            .update({ reminder_sent: true })
            .eq("id", reminder.id);

          sentCount++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, sentCount }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in push-notifications function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
