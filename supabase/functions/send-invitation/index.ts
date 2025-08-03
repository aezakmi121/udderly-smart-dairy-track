import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { InvitationEmail } from "./_templates/invitation-email.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify the user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || userRole?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, role, inviterName }: InvitationRequest = await req.json();

    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store invitation in database
    const { error: insertError } = await supabaseClient
      .from("invitations")
      .insert({
        email,
        role,
        token: invitationToken,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing invitation:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create signup URL with invitation token
    const signupUrl = `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "supabase.com") || "https://gjimccbtclynetngfrpw.supabase.com"}/auth/v1/verify?token=${invitationToken}&type=invite&redirect_to=${encodeURIComponent(Deno.env.get("SITE_URL") || "https://2d32d2de-68e0-4e6c-a137-eb09985ceae9.lovableproject.com")}`;

    // Render email template
    const html = await renderAsync(
      React.createElement(InvitationEmail, {
        inviterName,
        role,
        signupUrl,
        farmName: "Dairy Farm Management System",
      })
    );

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "Dairy Farm Manager <onboarding@resend.dev>",
      to: [email],
      subject: `You're invited to join ${inviterName}'s dairy farm`,
      html,
    });

    console.log("Invitation email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        message: "Invitation sent successfully",
        invitationId: invitationToken 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
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