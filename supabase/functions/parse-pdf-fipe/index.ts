import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: 'PDF base64 é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Sending PDF to AI for parsing...");

    const prompt = `Analise esta imagem/documento PDF de uma tabela FIPE de empilhadeiras ou equipamentos industriais.

TAREFA: Extraia TODOS os itens da tabela e retorne um JSON com um array de objetos.

Cada objeto deve ter os seguintes campos (use null se não encontrar):
- cod: código interno do equipamento (string)
- classe_tipo: classe ou tipo do equipamento (string)
- marca: fabricante/marca (string)
- modelo: nome do modelo (string)
- capacidade: capacidade de carga (string, ex: "2500kg")
- mastro: tipo de mastro (string)
- bateria: especificação da bateria (string)
- carregador: especificação do carregador (string)
- acessorios: acessórios inclusos (string)
- pneus: tipo de pneus (string)
- garfos: especificação dos garfos (string)
- cor: cor do equipamento (string)
- valor_cliente: preço para cliente (número, sem formatação)
- comissao_pct: percentual de comissão (número, apenas o valor numérico)
- valor_icms_12: valor com ICMS 12% (número)
- valor_icms_7: valor com ICMS 7% (número)
- valor_icms_4: valor com ICMS 4% (número)
- qtd_total: quantidade total disponível (número)
- qtd_reservado: quantidade reservada (número)
- qtd_dealer: quantidade dealer (número)
- qtd_demo: quantidade demo (número)
- qtd_patio: quantidade no pátio (número)
- disponibilidade: data de disponibilidade (string)
- moeda: moeda (string, ex: "BRL", "USD")

IMPORTANTE:
1. Extraia TODOS os itens da tabela, não apenas alguns
2. Para valores monetários, remova R$, pontos de milhar e converta vírgula para ponto
3. Para percentuais, extraia apenas o número (ex: "5%" -> 5)
4. Se um campo não existir na tabela, use null
5. Retorne APENAS o JSON válido, sem markdown, sem explicações
6. Retorne o JSON em formato COMPACTO (minificado, sem indentação) para economizar espaço

Formato de resposta esperado:
{"items": [...]}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 64000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    console.log("AI response received, parsing JSON...");
    console.log("Raw AI response length:", content.length);
    console.log("Raw AI response start:", content.substring(0, 200));

    // Try to parse the JSON from the response
    let parsedItems;
    let cleanContent = content;
    
    // Remove markdown code blocks more aggressively
    // Handle: ```json, ``` json, ```JSON, etc.
    cleanContent = cleanContent.replace(/^[\s\S]*?```(?:json|JSON)?\s*\n?/m, '');
    cleanContent = cleanContent.replace(/\n?```[\s\S]*$/m, '');
    
    // Fallback: find first { and last } to extract pure JSON
    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
    }
    
    cleanContent = cleanContent.trim();
    
    console.log("Cleaned content length:", cleanContent.length);
    console.log("Cleaned content start:", cleanContent.substring(0, 200));
    
    try {
      parsedItems = JSON.parse(cleanContent);
    } catch (parseError) {
      console.log('Initial JSON parse failed, attempting to repair truncated JSON...');
      console.log('Parse error:', parseError);
      
      // Try to repair truncated JSON
      let repairedContent = cleanContent;
      
      // Count open/close brackets and braces
      const openBraces = (repairedContent.match(/{/g) || []).length;
      const openBrackets = (repairedContent.match(/\[/g) || []).length;
      
      // Find the last complete object (ends with },)
      const lastCompleteObject = repairedContent.lastIndexOf('},');
      if (lastCompleteObject > 0) {
        // Cut off incomplete item and keep everything up to the last complete object
        repairedContent = repairedContent.substring(0, lastCompleteObject + 1);
        console.log('Trimmed to last complete object at position:', lastCompleteObject);
      } else {
        // Try finding last complete object without comma (might be the last item)
        const lastObjectEnd = repairedContent.lastIndexOf('}');
        const lastObjectStart = repairedContent.lastIndexOf('{"');
        if (lastObjectEnd > lastObjectStart && lastObjectStart > 0) {
          // Check if this object is incomplete
          const possibleObject = repairedContent.substring(lastObjectStart, lastObjectEnd + 1);
          try {
            JSON.parse(possibleObject);
            // Object is complete, keep it
          } catch {
            // Object is incomplete, remove it
            repairedContent = repairedContent.substring(0, lastObjectStart);
            // Remove trailing comma if present
            repairedContent = repairedContent.replace(/,\s*$/, '');
            console.log('Removed incomplete last object');
          }
        }
      }
      
      // Count remaining brackets/braces after trimming
      const remainingOpenBrackets = (repairedContent.match(/\[/g) || []).length;
      const remainingCloseBrackets = (repairedContent.match(/\]/g) || []).length;
      const remainingOpenBraces = (repairedContent.match(/{/g) || []).length;
      const remainingCloseBraces = (repairedContent.match(/}/g) || []).length;
      
      // Add missing closing brackets and braces
      const missingBrackets = remainingOpenBrackets - remainingCloseBrackets;
      const missingBraces = remainingOpenBraces - remainingCloseBraces;
      
      repairedContent += ']'.repeat(Math.max(0, missingBrackets));
      repairedContent += '}'.repeat(Math.max(0, missingBraces));
      
      console.log(`Added ${Math.max(0, missingBrackets)} closing brackets and ${Math.max(0, missingBraces)} closing braces`);
      
      try {
        parsedItems = JSON.parse(repairedContent);
        console.log('JSON repair successful! Recovered items.');
      } catch (repairError) {
        console.error('JSON repair also failed:', repairError);
        console.error('Failed to parse AI response (first 500 chars):', content.substring(0, 500));
        console.error('Failed to parse AI response (last 500 chars):', content.substring(content.length - 500));
        throw new Error('Não foi possível interpretar a resposta da IA. Verifique se o PDF contém uma tabela válida.');
      }
    }

    const items = parsedItems.items || parsedItems;
    
    if (!Array.isArray(items)) {
      throw new Error('Resposta inválida: esperado um array de itens');
    }

    console.log(`Successfully parsed ${items.length} items from PDF`);

    return new Response(
      JSON.stringify({ items, count: items.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-pdf-fipe:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
