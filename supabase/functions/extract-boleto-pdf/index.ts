import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedBoleto {
  valor: number;
  vencimento: string;
  numero?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { boleto_base64, organization_id, sale_id, emission_date } = await req.json();

    if (!boleto_base64 || !organization_id || !sale_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'boleto_base64, organization_id, and sale_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch org's AI API key
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('ai_api_key')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!org.ai_api_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AI API key not configured for this organization. Configure it in Settings > Integrations.',
          code: 'AI_KEY_MISSING'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI Gateway with the org's API key
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${org.ai_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em análise de documentos financeiros brasileiros. Extraia dados de boletos bancários de PDFs."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise este PDF de boleto bancário. Extraia TODOS os boletos encontrados no documento. Para cada boleto, retorne: valor (numérico), data de vencimento (formato YYYY-MM-DD), e número do boleto se visível. Use a tool extract_boletos para retornar os dados."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${boleto_base64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_boletos",
              description: "Retorna os boletos extraídos do PDF",
              parameters: {
                type: "object",
                properties: {
                  boletos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        valor: { type: "number", description: "Valor do boleto em reais" },
                        vencimento: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD" },
                        numero: { type: "string", description: "Número do boleto ou nosso número" }
                      },
                      required: ["valor", "vencimento"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["boletos"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_boletos" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Try again later.', code: 'RATE_LIMITED' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Add funds to continue.', code: 'PAYMENT_REQUIRED' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    // Extract boletos from tool call response
    let extractedBoletos: ExtractedBoleto[] = [];
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        extractedBoletos = args.boletos || [];
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }

    if (extractedBoletos.length === 0) {
      console.log('No boletos extracted from PDF');
      return new Response(
        JSON.stringify({ success: true, message: 'No boletos found in PDF', boletos: [], installments_inserted: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracted ${extractedBoletos.length} boletos from PDF`);

    // Sort boletos by due date
    extractedBoletos.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());

    // Determine entrada: first boleto with due date <= 3 days from emission
    let valorEntrada = 0;
    let parcelasParaSalvar = extractedBoletos;
    let primeiroBoletoeEntrada = false;

    if (emission_date && extractedBoletos[0]?.vencimento) {
      const diffDias = Math.abs(
        (new Date(extractedBoletos[0].vencimento).getTime() - new Date(emission_date).getTime())
        / (1000 * 60 * 60 * 24)
      );
      primeiroBoletoeEntrada = diffDias <= 3;

      if (primeiroBoletoeEntrada) {
        valorEntrada = extractedBoletos[0].valor || 0;
        parcelasParaSalvar = extractedBoletos.slice(1);
      } else {
        // Get total_value from sale to calculate entrada
        const { data: sale } = await supabase
          .from('sales')
          .select('total_value')
          .eq('id', sale_id)
          .single();

        const totalNf = sale?.total_value || 0;
        const somaBoletos = extractedBoletos.reduce((sum, b) => sum + (b.valor || 0), 0);
        valorEntrada = Math.max(0, totalNf - somaBoletos);
      }
    }

    // Delete existing installments for this sale before inserting new ones
    await supabase
      .from('installments')
      .delete()
      .eq('sale_id', sale_id)
      .eq('organization_id', organization_id);

    // Insert installments
    let installmentsInserted = 0;
    if (parcelasParaSalvar.length > 0) {
      const installmentsToInsert = parcelasParaSalvar.map((boleto, index) => ({
        organization_id,
        sale_id,
        installment_number: index + 1,
        value: boleto.valor || 0,
        due_date: boleto.vencimento || null,
        status: 'pendente'
      }));

      const { error: installError } = await supabase
        .from('installments')
        .insert(installmentsToInsert);

      if (installError) {
        console.error('Error inserting installments:', installError);
      } else {
        installmentsInserted = installmentsToInsert.length;
      }
    }

    // Update sale with valor_entrada and payment_method
    const paymentMethod = parcelasParaSalvar.length > 1 ? 'parcelado_boleto' : 
                          parcelasParaSalvar.length === 1 ? 'parcelado_boleto' : 'a_vista';

    await supabase
      .from('sales')
      .update({ 
        valor_entrada: valorEntrada,
        payment_method: paymentMethod
      })
      .eq('id', sale_id);

    return new Response(
      JSON.stringify({
        success: true,
        boletos: extractedBoletos,
        installments_inserted: installmentsInserted,
        valor_entrada: valorEntrada,
        primeiro_boleto_e_entrada: primeiroBoletoeEntrada,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error extracting boleto:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
