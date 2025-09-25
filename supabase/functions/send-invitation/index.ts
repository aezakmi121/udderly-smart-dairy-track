import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Simple HTML email template
function createInvitationEmail(inviterName: string, role: string, signupUrl: string, farmName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're invited to join ${farmName}</title>
    </head>
    <body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif; background-color: #f6f9fc; margin: 0; padding: 0;">
      <div style="background-color: #ffffff; margin: 0 auto; padding: 20px 0 48px; margin-bottom: 64px; max-width: 600px;">
        
        <div style="padding: 32px 24px; background-color: #16a34a; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0;">
            🐄 ${farmName}
          </h1>
        </div>
        
        <h1 style="color: #333; font-size: 28px; font-weight: bold; margin: 40px 24px 20px; padding: 0; text-align: center;">
          You're Invited!
        </h1>
        
        <p style="color: #333; font-size: 16px; margin: 16px 24px; line-height: 1.5;">
          <strong>${inviterName}</strong> has invited you to join their dairy farm management system 
          as a <strong>${role}</strong>.
        </p>
        
        <p style="color: #333; font-size: 16px; margin: 16px 24px; line-height: 1.5;">
          This system helps manage:
        </p>
        
        <div style="margin: 24px; padding: 16px; background-color: #f8f9fa; border-radius: 8px;">
          <p style="color: #333; font-size: 14px; margin: 8px 0; line-height: 1.4;">• Cattle management and tracking</p>
          <p style="color: #333; font-size: 14px; margin: 8px 0; line-height: 1.4;">• Milk production monitoring</p>
          <p style="color: #333; font-size: 14px; margin: 8px 0; line-height: 1.4;">• Feed management</p>
          <p style="color: #333; font-size: 14px; margin: 8px 0; line-height: 1.4;">• Health and vaccination records</p>
          <p style="color: #333; font-size: 14px; margin: 8px 0; line-height: 1.4;">• Analytics and reporting</p>
        </div>
        
        <div style="text-align: center; margin: 32px 24px;">
          <a href="${signupUrl}" target="_blank" style="background-color: #16a34a; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 16px 24px;">
            Accept Invitation & Create Account
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px; margin: 16px 24px; line-height: 1.4;">
          This invitation will expire in 7 days. If you didn't expect this invitation, 
          you can safely ignore this email.
        </p>
        
        <p style="color: #666; font-size: 14px; margin: 32px 24px 0; line-height: 1.4;">
          Best regards,<br>
          The ${farmName} Team
        </p>
        
      </div>
    </body>
    </html>
  `;
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

    // Create HTML email using our template function
    const html = createInvitationEmail(
      inviterName,
      role,
      signupUrl,
      "Dairy Farm Management System"
    );

    console.log("Invitation created successfully - email functionality disabled for now");
    console.log("Email would be sent to:", email);
    console.log("Signup URL:", signupUrl);

    // For now, just return success without sending email
    // TODO: Re-enable email sending once Resend dependency is resolved
    return new Response(
      JSON.stringify({ 
        message: "Invitation created successfully (email sending temporarily disabled)",
        invitationId: invitationToken,
        signupUrl: signupUrl
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