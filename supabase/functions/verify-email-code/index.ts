import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  email: string;
  code: string;
  invitation_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, invitation_id }: VerifyCodeRequest = await req.json();

    if (!email || !code || !invitation_id) {
      return new Response(
        JSON.stringify({ valid: false, error: "Parâmetros inválidos" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Verifying code for ${email}, invitation ${invitation_id}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find valid code
    const now = new Date().toISOString();
    const { data: verificationCode, error: fetchError } = await supabase
      .from("email_verification_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("invitation_id", invitation_id)
      .eq("used", false)
      .gte("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verificationCode) {
      console.log("Invalid or expired code:", fetchError?.message);
      return new Response(
        JSON.stringify({ valid: false, error: "Código inválido ou expirado" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark code as used
    const { error: updateError } = await supabase
      .from("email_verification_codes")
      .update({ used: true })
      .eq("id", verificationCode.id);

    if (updateError) {
      console.error("Error marking code as used:", updateError);
      // Continue anyway - code was valid
    }

    console.log("Code verified successfully for", email);

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-email-code:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message || "Erro ao verificar código" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
