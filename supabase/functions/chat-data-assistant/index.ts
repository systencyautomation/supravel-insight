import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const { messages } = await req.json();

    // Fetch organization data in parallel
    const [salesResult, installmentsResult, inventoryResult, repsResult] = await Promise.all([
      serviceClient
        .from("sales")
        .select("client_name, nfe_number, total_value, table_value, over_price, status, commission_calculated, emission_date, produto_modelo, payment_method, uf_destiny, percentual_comissao")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50),
      serviceClient
        .from("installments")
        .select("value, due_date, status, installment_number, sale_id")
        .eq("organization_id", orgId)
        .in("status", ["pendente", "vencido", "pending"])
        .order("due_date")
        .limit(50),
      serviceClient
        .from("inventory")
        .select("model_name, base_price, quantity, marca, capacidade, classe_tipo")
        .eq("organization_id", orgId)
        .order("model_name")
        .limit(50),
      serviceClient
        .from("representatives")
        .select("name, company, email, position, active")
        .eq("organization_id", orgId)
        .eq("active", true)
        .limit(30),
    ]);

    // Build context
    const salesCtx = (salesResult.data || []).map((s) =>
      `- ${s.client_name || "Sem cliente"} | NF ${s.nfe_number || "N/A"} | Modelo: ${s.produto_modelo || "N/A"} | Total: R$${s.total_value?.toFixed(2) || "0"} | Tabela: R$${s.table_value?.toFixed(2) || "0"} | Over: R$${s.over_price?.toFixed(2) || "0"} | Status: ${s.status || "N/A"} | Comissão: R$${s.commission_calculated?.toFixed(2) || "0"} | %Comissão: ${s.percentual_comissao || "N/A"}% | Pgto: ${s.payment_method || "N/A"} | UF: ${s.uf_destiny || "N/A"} | Data: ${s.emission_date || "N/A"}`
    ).join("\n");

    const installCtx = (installmentsResult.data || []).map((i) =>
      `- Parcela ${i.installment_number} | R$${i.value.toFixed(2)} | Venc: ${i.due_date || "N/A"} | Status: ${i.status}`
    ).join("\n");

    const invCtx = (inventoryResult.data || []).map((i) =>
      `- ${i.model_name} | Marca: ${i.marca || "N/A"} | Preço: R$${i.base_price?.toFixed(2) || "0"} | Qtd: ${i.quantity || 0} | Tipo: ${i.classe_tipo || "N/A"} | Capacidade: ${i.capacidade || "N/A"}`
    ).join("\n");

    const repsCtx = (repsResult.data || []).map((r) =>
      `- ${r.name} | Empresa: ${r.company || "N/A"} | Cargo: ${r.position || "N/A"}`
    ).join("\n");

    const systemPrompt = `Você é um assistente de dados de negócios. Responda em português brasileiro de forma clara e objetiva.
Você tem acesso aos dados reais da organização do usuário. Use-os para responder perguntas sobre vendas, comissões, parcelas, estoque, representantes, etc.

## DADOS DA ORGANIZAÇÃO

### Últimas 50 Vendas
${salesCtx || "Nenhuma venda encontrada."}

### Parcelas Pendentes/Vencidas
${installCtx || "Nenhuma parcela pendente."}

### Estoque (${inventoryResult.data?.length || 0} itens)
${invCtx || "Estoque vazio."}

### Representantes Ativos
${repsCtx || "Nenhum representante ativo."}

## INSTRUÇÕES
- Responda APENAS com base nos dados acima. Se não tiver a informação, diga que não encontrou.
- Faça cálculos quando solicitado (totais, médias, contagens).
- Formate valores monetários como R$ X.XXX,XX.
- Use markdown para formatar tabelas e listas quando apropriado.
- Seja conciso mas completo.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-data-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
