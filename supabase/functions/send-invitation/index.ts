import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  inviteLink: string;
  organizationName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { email, inviteLink, organizationName }: InvitationRequest = await req.json();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Gestão de Comissões <onboarding@resend.dev>",
        to: [email],
        subject: "Convite para Gestão de Comissões",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Roboto', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px; }
              .container { max-width: 500px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; }
              .header { background: #1a1a1a; padding: 24px; text-align: center; }
              .header h1 { color: #ffffff; margin: 0; font-size: 18px; font-weight: 500; }
              .content { padding: 32px 24px; }
              .content p { color: #333333; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; }
              .button { display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 32px; font-size: 14px; font-weight: 500; margin: 16px 0; }
              .footer { border-top: 1px solid #e0e0e0; padding: 16px 24px; }
              .footer p { color: #666666; font-size: 12px; margin: 0; }
              .company { color: #dc2626; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Gestão de Comissões</h1>
              </div>
              <div class="content">
                <p>Olá,</p>
                <p>Você foi convidado para configurar sua conta no sistema de <strong>Gestão de Comissões</strong>${organizationName ? ` para a empresa <span class="company">${organizationName}</span>` : ''}.</p>
                <p>Clique no botão abaixo para completar seu cadastro:</p>
                <a href="${inviteLink}" class="button">Configurar Minha Conta</a>
                <p style="font-size: 12px; color: #666666;">Se o botão não funcionar, copie e cole este link no navegador:<br>${inviteLink}</p>
              </div>
              <div class="footer">
                <p>Este convite expira em 7 dias. Se você não solicitou este convite, ignore este email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error);
    }

    const data = await res.json();
    console.log("Invitation email sent:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
