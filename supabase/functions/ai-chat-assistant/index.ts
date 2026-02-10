import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool definitions for function calling
const tools = [
  {
    type: "function",
    function: {
      name: "buscar_venda",
      description: "Busca detalhes completos de uma venda pela número da NF-e. Retorna dados do cliente, valores, comissões, impostos e status.",
      parameters: {
        type: "object",
        properties: {
          nf_numero: { type: "string", description: "Número da NF-e para buscar" },
        },
        required: ["nf_numero"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_comissoes",
      description: "Lista e soma comissões e over price das vendas em um período. Retorna totais por status e detalhamento.",
      parameters: {
        type: "object",
        properties: {
          data_inicio: { type: "string", description: "Data início no formato YYYY-MM-DD" },
          data_fim: { type: "string", description: "Data fim no formato YYYY-MM-DD" },
        },
        required: ["data_inicio", "data_fim"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verificar_financeiro",
      description: "Verifica o status financeiro de uma venda: parcelas, boletos, entrada e pagamentos realizados.",
      parameters: {
        type: "object",
        properties: {
          nf_numero: { type: "string", description: "Número da NF-e da venda para verificar" },
        },
        required: ["nf_numero"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resumo_estoque",
      description: "Retorna o resumo do estoque atual da organização com modelos, quantidades e preços.",
      parameters: {
        type: "object",
        properties: {
          filtro_modelo: { type: "string", description: "Filtro opcional por nome do modelo (busca parcial)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_parcelas_vencidas",
      description: "Lista todas as parcelas pendentes ou vencidas, com detalhes de cliente e vencimento.",
      parameters: {
        type: "object",
        properties: {
          apenas_vencidas: { type: "boolean", description: "Se true, mostra apenas vencidas. Se false, mostra todas as pendentes." },
        },
      },
    },
  },
];

// Execute tool calls against the database
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  serviceClient: ReturnType<typeof createClient>,
  orgId: string
): Promise<string> {
  try {
    switch (toolName) {
      case "buscar_venda": {
        const nf = String(args.nf_numero || "");
        const { data, error } = await serviceClient
          .from("sales")
          .select("*")
          .eq("organization_id", orgId)
          .ilike("nfe_number", `%${nf}%`)
          .limit(5);

        if (error) return JSON.stringify({ error: error.message });
        if (!data?.length) return JSON.stringify({ resultado: "Nenhuma venda encontrada com essa NF." });

        // Enrich with installments
        const enriched = await Promise.all(
          data.map(async (sale) => {
            const { data: installments } = await serviceClient
              .from("installments")
              .select("installment_number, value, due_date, status, paid_at")
              .eq("sale_id", sale.id)
              .order("installment_number");

            return {
              nf: sale.nfe_number,
              cliente: sale.client_name,
              cnpj: sale.client_cnpj,
              data_emissao: sale.emission_date,
              uf_destino: sale.uf_destiny,
              valor_total_nf: sale.total_value,
              valor_tabela: sale.table_value,
              valor_entrada: sale.valor_entrada,
              over_price_bruto: sale.over_price,
              over_price_liquido: sale.over_price_liquido,
              icms: sale.icms,
              pis_cofins: sale.pis_cofins,
              ir_csll: sale.ir_csll,
              percentual_comissao: sale.percentual_comissao,
              percentual_icms: sale.percentual_icms,
              comissao_calculada: sale.commission_calculated,
              status: sale.status,
              produto_modelo: sale.produto_modelo,
              produto_descricao: sale.produto_descricao,
              metodo_pagamento: sale.payment_method,
              observacoes: sale.observacoes,
              parcelas: installments || [],
            };
          })
        );

        return JSON.stringify({ vendas: enriched });
      }

      case "listar_comissoes": {
        const inicio = String(args.data_inicio || "");
        const fim = String(args.data_fim || "");

        let query = serviceClient
          .from("sales")
          .select("nfe_number, client_name, total_value, table_value, over_price, over_price_liquido, commission_calculated, percentual_comissao, status, emission_date")
          .eq("organization_id", orgId);

        if (inicio) query = query.gte("emission_date", inicio);
        if (fim) query = query.lte("emission_date", fim);

        const { data, error } = await query.order("emission_date", { ascending: false }).limit(100);
        if (error) return JSON.stringify({ error: error.message });

        const totais = {
          total_vendas: data?.reduce((acc, s) => acc + (Number(s.total_value) || 0), 0) || 0,
          total_over_bruto: data?.reduce((acc, s) => acc + (Number(s.over_price) || 0), 0) || 0,
          total_over_liquido: data?.reduce((acc, s) => acc + (Number(s.over_price_liquido) || 0), 0) || 0,
          total_comissao_atribuida: data?.reduce((acc, s) => acc + (Number(s.commission_calculated) || 0), 0) || 0,
          qtd_vendas: data?.length || 0,
          por_status: {
            pendente: data?.filter(s => s.status === "pendente").length || 0,
            aprovado: data?.filter(s => s.status === "aprovado").length || 0,
            pago: data?.filter(s => s.status === "pago").length || 0,
            rejeitado: data?.filter(s => s.status === "rejeitado").length || 0,
          },
        };

        return JSON.stringify({
          periodo: { inicio, fim },
          totais,
          vendas: data?.map(s => ({
            nf: s.nfe_number,
            cliente: s.client_name,
            total: s.total_value,
            tabela: s.table_value,
            over_liquido: s.over_price_liquido,
            comissao: s.commission_calculated,
            pct_comissao: s.percentual_comissao,
            status: s.status,
            data: s.emission_date,
          })),
        });
      }

      case "verificar_financeiro": {
        const nf = String(args.nf_numero || "");
        const { data: sales, error } = await serviceClient
          .from("sales")
          .select("id, nfe_number, client_name, total_value, valor_entrada, status, payment_method")
          .eq("organization_id", orgId)
          .ilike("nfe_number", `%${nf}%`)
          .limit(1);

        if (error) return JSON.stringify({ error: error.message });
        if (!sales?.length) return JSON.stringify({ resultado: "Venda não encontrada." });

        const sale = sales[0];
        const { data: installments } = await serviceClient
          .from("installments")
          .select("installment_number, value, due_date, status, paid_at")
          .eq("sale_id", sale.id)
          .order("installment_number");

        const hoje = new Date().toISOString().split("T")[0];
        const parcelas = installments || [];
        const vencidas = parcelas.filter(p => p.status !== "pago" && p.due_date && p.due_date < hoje);
        const pagas = parcelas.filter(p => p.status === "pago");
        const pendentes = parcelas.filter(p => p.status !== "pago");

        return JSON.stringify({
          venda: {
            nf: sale.nfe_number,
            cliente: sale.client_name,
            valor_total: sale.total_value,
            entrada: sale.valor_entrada,
            status: sale.status,
            pagamento: sale.payment_method,
          },
          parcelas: {
            total: parcelas.length,
            pagas: pagas.length,
            pendentes: pendentes.length,
            vencidas: vencidas.length,
            valor_total_parcelas: parcelas.reduce((a, p) => a + Number(p.value), 0),
            valor_pago: pagas.reduce((a, p) => a + Number(p.value), 0),
            valor_pendente: pendentes.reduce((a, p) => a + Number(p.value), 0),
          },
          detalhamento: parcelas.map(p => ({
            parcela: p.installment_number,
            valor: p.value,
            vencimento: p.due_date,
            status: p.status,
            pago_em: p.paid_at,
            vencida: p.status !== "pago" && p.due_date && p.due_date < hoje,
          })),
        });
      }

      case "resumo_estoque": {
        const filtro = args.filtro_modelo ? String(args.filtro_modelo) : null;
        let query = serviceClient
          .from("inventory")
          .select("model_name, internal_code, base_price, quantity, marca, capacidade, classe_tipo, bateria, mastro, moeda, qtd_reservado, qtd_dealer, qtd_demo, qtd_patio")
          .eq("organization_id", orgId);

        if (filtro) query = query.ilike("model_name", `%${filtro}%`);

        const { data, error } = await query.order("model_name").limit(50);
        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({
          total_modelos: data?.length || 0,
          total_unidades: data?.reduce((a, i) => a + (i.quantity || 0), 0) || 0,
          itens: data?.map(i => ({
            modelo: i.model_name,
            codigo: i.internal_code,
            marca: i.marca,
            preco: i.base_price,
            moeda: i.moeda,
            qtd_total: i.quantity,
            qtd_reservado: i.qtd_reservado,
            qtd_dealer: i.qtd_dealer,
            qtd_demo: i.qtd_demo,
            qtd_patio: i.qtd_patio,
            tipo: i.classe_tipo,
            capacidade: i.capacidade,
            bateria: i.bateria,
            mastro: i.mastro,
          })),
        });
      }

      case "listar_parcelas_vencidas": {
        const hoje = new Date().toISOString().split("T")[0];
        const apenasVencidas = args.apenas_vencidas !== false;

        let query = serviceClient
          .from("installments")
          .select("installment_number, value, due_date, status, sale_id")
          .eq("organization_id", orgId)
          .neq("status", "pago");

        if (apenasVencidas) {
          query = query.lt("due_date", hoje);
        }

        const { data: parcelas, error } = await query.order("due_date").limit(100);
        if (error) return JSON.stringify({ error: error.message });

        // Get sale details for each installment
        const saleIds = [...new Set((parcelas || []).map(p => p.sale_id))];
        let salesMap: Record<string, { client_name: string; nfe_number: string }> = {};

        if (saleIds.length > 0) {
          const { data: sales } = await serviceClient
            .from("sales")
            .select("id, client_name, nfe_number")
            .in("id", saleIds);
          sales?.forEach(s => { salesMap[s.id] = { client_name: s.client_name, nfe_number: s.nfe_number }; });
        }

        return JSON.stringify({
          total: parcelas?.length || 0,
          valor_total: parcelas?.reduce((a, p) => a + Number(p.value), 0) || 0,
          parcelas: parcelas?.map(p => ({
            parcela: p.installment_number,
            valor: p.value,
            vencimento: p.due_date,
            status: p.status,
            cliente: salesMap[p.sale_id]?.client_name || "N/A",
            nf: salesMap[p.sale_id]?.nfe_number || "N/A",
            vencida: p.due_date && p.due_date < hoje,
          })),
        });
      }

      default:
        return JSON.stringify({ error: `Ferramenta desconhecida: ${toolName}` });
    }
  } catch (err) {
    console.error(`Tool ${toolName} error:`, err);
    return JSON.stringify({ error: `Erro ao executar ${toolName}: ${err instanceof Error ? err.message : "Erro desconhecido"}` });
  }
}

const SYSTEM_PROMPT = `Você é um assistente de dados de negócios especializado em vendas de equipamentos industriais (empilhadeiras, transpaleteiras, etc). Responda em português brasileiro de forma clara e objetiva.

## REGRAS DE NEGÓCIO OBRIGATÓRIAS

### Valor Presente (VP)
- Taxa de juros mensal para boleto: **2,2% a.m.**
- Taxa de juros mensal para cartão: **3,5% a.m.**
- Fórmula: VP = Entrada + Σ(Parcela / (1 + taxa)^n)
- O "Valor Real" da venda é o Valor Presente, não o valor da NF

### Margem Líquida (Over Price)
- Over Price Bruto = Valor Real (VP) - Valor de Tabela
- Deduções aplicadas em CASCATA:
  1. ICMS (4%, 7% ou 12% conforme UF) sobre o Over Bruto
  2. PIS/COFINS: **9,25%** sobre (Over Bruto - ICMS)
  3. IR/CSLL: **34%** sobre (Over Bruto - ICMS - PIS/COFINS)
- Over Price Líquido = Over Bruto - ICMS - PIS/COFINS - IR/CSLL

### Comissão da Empresa
- Comissão Base = Valor de Tabela × Percentual de Comissão
- Comissão Total Empresa = Comissão Base + Over Price Líquido

## FERRAMENTAS DISPONÍVEIS
Use as ferramentas para consultar dados reais. NUNCA invente dados.
- buscar_venda: para detalhes de uma NF específica
- listar_comissoes: para somar comissões de um período
- verificar_financeiro: para status de boletos/parcelas de uma venda
- resumo_estoque: para consultar o estoque
- listar_parcelas_vencidas: para ver parcelas atrasadas

## FORMATAÇÃO
- Valores monetários: R$ X.XXX,XX
- Use tabelas markdown quando listar múltiplos itens
- Seja conciso mas completo
- Se não encontrar dados, informe claramente`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate JWT
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    // Service role client for data queries
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user role and org
    const { data: roles, error: rolesError } = await serviceClient
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", userId);

    if (rolesError || !roles?.length) {
      return new Response(JSON.stringify({ error: "No role found" }), { status: 403, headers: corsHeaders });
    }

    const userRole = roles[0];
    if (!["admin", "manager", "super_admin", "saas_admin"].includes(userRole.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: corsHeaders });
    }

    const orgId = userRole.organization_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "No organization found" }), { status: 403, headers: corsHeaders });
    }

    // Get org's AI API key
    const { data: org, error: orgError } = await serviceClient
      .from("organizations")
      .select("ai_api_key")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), { status: 404, headers: corsHeaders });
    }

    // Check for API key - try org key first, fallback to Lovable AI
    const orgApiKey = org.ai_api_key;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!orgApiKey && !lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "API_KEY_MISSING", message: "Por favor, configure sua chave de IA nas configurações do Gerente." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which API to use
    const useOrgKey = !!orgApiKey;
    const apiKey = orgApiKey || lovableApiKey!;
    const apiUrl = useOrgKey
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const model = useOrgKey ? "gpt-4o-mini" : "google/gemini-3-flash-preview";

    const { messages } = await req.json();

    // Build conversation with system prompt
    const conversationMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Step 1: Call AI with tools (non-streaming to handle function calls)
    const initialResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (!initialResponse.ok) {
      const errText = await initialResponse.text();
      console.error("AI API error:", initialResponse.status, errText);
      
      if (initialResponse.status === 401 || initialResponse.status === 403) {
        return new Response(
          JSON.stringify({ error: "API_KEY_INVALID", message: "A chave de IA configurada é inválida. Verifique nas configurações." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (initialResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const initialResult = await initialResponse.json();
    const assistantMessage = initialResult.choices?.[0]?.message;

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ error: "Resposta vazia da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: If there are tool calls, execute them
    if (assistantMessage.tool_calls?.length > 0) {
      console.log(`Executing ${assistantMessage.tool_calls.length} tool call(s)`);

      // Add assistant message with tool_calls to conversation
      const updatedMessages = [...conversationMessages, assistantMessage];

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (tc: { id: string; function: { name: string; arguments: string } }) => {
          const args = JSON.parse(tc.function.arguments || "{}");
          console.log(`Tool: ${tc.function.name}`, args);
          const result = await executeTool(tc.function.name, args, serviceClient, orgId);
          return {
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          };
        })
      );

      // Add tool results to conversation
      updatedMessages.push(...toolResults);

      // Step 3: Call AI again with tool results (streaming)
      const finalResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: updatedMessages,
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        const errText = await finalResponse.text();
        console.error("AI final response error:", finalResponse.status, errText);
        return new Response(
          JSON.stringify({ error: "Erro ao processar resposta da IA" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - stream the direct response
    // Re-call with streaming since initial was non-streaming
    const streamResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const errText = await streamResponse.text();
      console.error("AI stream error:", streamResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Erro no streaming da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
