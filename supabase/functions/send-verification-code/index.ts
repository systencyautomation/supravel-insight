import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVerificationRequest {
  email: string;
  invitation_id: string;
  invitation_type?: 'organization' | 'member'; // 'organization' = onboarding, 'member' = member invitation
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, invitation_id, invitation_type = 'organization' }: SendVerificationRequest = await req.json();

    if (!email || !invitation_id) {
      return new Response(
        JSON.stringify({ error: "Email e invitation_id são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending verification code to ${email} for ${invitation_type} invitation ${invitation_id}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit: max 5 codes per email in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCodes } = await supabase
      .from("email_verification_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", oneHourAgo);

    if (recentCodes && recentCodes >= 5) {
      console.log(`Rate limit exceeded for ${email}`);
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Aguarde alguns minutos." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate 6-digit code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Invalidate previous unused codes for this email/invitation
    const invalidateQuery = supabase
      .from("email_verification_codes")
      .update({ used: true })
      .eq("email", email)
      .eq("used", false);
    
    if (invitation_type === 'member') {
      await invalidateQuery.eq("member_invitation_id", invitation_id);
    } else {
      await invalidateQuery.eq("invitation_id", invitation_id);
    }

    // Build insert data based on invitation type
    const insertData: Record<string, unknown> = {
      email,
      code,
      expires_at: expiresAt,
    };
    
    if (invitation_type === 'member') {
      insertData.member_invitation_id = invitation_id;
    } else {
      insertData.invitation_id = invitation_id;
    }

    // Save new code
    const { error: insertError } = await supabase
      .from("email_verification_codes")
      .insert(insertData);

    if (insertError) {
      console.error("Error saving verification code:", insertError);
      throw insertError;
    }

    // Send email with code
    const emailResponse = await resend.emails.send({
      from: "Gestão de Comissões <noreply@dash.supravel.com.br>",
      to: [email],
      subject: "Seu código de verificação",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td style="padding: 40px 40px 30px;">
                      <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #18181b; text-align: center;">
                        Código de Verificação
                      </h1>
                      <p style="margin: 0 0 30px; font-size: 16px; color: #52525b; text-align: center; line-height: 1.5;">
                        Use o código abaixo para confirmar seu email e criar sua conta:
                      </p>
                      <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
                        <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #18181b;">
                          ${code}
                        </span>
                      </div>
                      <p style="margin: 0 0 10px; font-size: 14px; color: #71717a; text-align: center;">
                        Este código expira em <strong>10 minutos</strong>.
                      </p>
                      <p style="margin: 0; font-size: 14px; color: #a1a1aa; text-align: center;">
                        Se você não solicitou este código, ignore este email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
                      <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                        Gestão de Comissões - Sistema de Gestão Empresarial
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Verification email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado com sucesso" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-code:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao enviar código" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
