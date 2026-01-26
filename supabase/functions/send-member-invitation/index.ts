import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  guestName: string | null;
  organizationName: string;
  inviterName: string;
  inviteLink: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { email, guestName, organizationName, inviterName, inviteLink, role }: InvitationRequest = await req.json();

    console.log(`Sending member invitation to ${email} for org ${organizationName}`);

    const roleLabels: Record<string, string> = {
      admin: "Gerente",
      manager: "Analista",
      seller: "Vendedor",
      representative: "Representante",
    };
    const roleLabel = roleLabels[role] || role;

    const greeting = guestName ? `Olá ${guestName}` : "Olá";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Gestão de Comissões <noreply@supravelconnect.com.br>",
        to: [email],
        subject: `${organizationName} - Convite para acessar o sistema`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background-color: #1a1a2e; padding: 20px; border-radius: 8px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SUPRAVEL</h1>
                <p style="color: #888; margin: 5px 0 0 0; font-size: 12px;">Sistema de Gestão de Comissões</p>
              </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1a1a2e; margin-top: 0;">Você foi convidado!</h2>
              
              <p>${greeting},</p>
              
              <p>
                <strong>${inviterName}</strong> convidou você para fazer parte da equipe da empresa 
                <strong>${organizationName}</strong> no sistema de Gestão de Comissões.
              </p>
              
              <p>Você foi convidado como: <strong>${roleLabel}</strong></p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" 
                   style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Criar Minha Conta
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
                <br>
                <a href="${inviteLink}" style="color: #4f46e5; word-break: break-all;">${inviteLink}</a>
              </p>
            </div>
            
            <div style="text-align: center; color: #888; font-size: 12px;">
              <p>Este convite expira em 7 dias.</p>
              <p>Se você não esperava este convite, pode ignorar este email.</p>
              <p style="margin-top: 20px;">
                © ${new Date().getFullYear()} Supravel - Sistema de Gestão de Comissões
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Resend API error:", error);
      throw new Error(error);
    }

    const data = await res.json();
    console.log("Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
