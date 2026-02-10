import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────
const tools = [
  {
    type: "function",
    function: {
      name: "buscar_venda",
      description:
        "Busca vendas por número de NF-e, nome do cliente, CNPJ ou status. Retorna dados completos incluindo comissões, impostos, parcelas, vendedor interno e representante vinculado.",
      parameters: {
        type: "object",
        properties: {
          nf_numero: { type: "string", description: "Número da NF-e (busca parcial)" },
          cliente: { type: "string", description: "Nome do cliente (busca parcial)" },
          cnpj: { type: "string", description: "CNPJ do cliente" },
          status: { type: "string", description: "Status da venda: pendente, aprovado, pago, rejeitado" },
          limite: { type: "number", description: "Máximo de resultados (padrão 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_comissoes",
      description:
        "Agrega comissões e over price por período. Retorna totais gerais, breakdown por status, e lista detalhada de vendas com comissões.",
      parameters: {
        type: "object",
        properties: {
          data_inicio: { type: "string", description: "Data início YYYY-MM-DD" },
          data_fim: { type: "string", description: "Data fim YYYY-MM-DD" },
          vendedor_id: { type: "string", description: "UUID do vendedor interno para filtrar" },
          representante_id: { type: "string", description: "UUID do representante para filtrar" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verificar_financeiro",
      description:
        "Consulta status financeiro completo de uma venda: parcelas, boletos pagos/vencidos, entrada, conciliação de valores. Usa Dedução Reversa: Entrada = Total_NF - Σ Boletos.",
      parameters: {
        type: "object",
        properties: {
          nf_numero: { type: "string", description: "Número da NF-e" },
          venda_id: { type: "string", description: "UUID da venda (alternativo à NF)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resumo_estoque",
      description:
        "Consulta o estoque completo: modelos, código interno, marca, capacidade, mastro, bateria, pneus, garfos, cor, preços por faixa ICMS (4%, 7%, 12%), moeda, quantidades (total, reservado, dealer, demo, pátio) e disponibilidade.",
      parameters: {
        type: "object",
        properties: {
          filtro_modelo: { type: "string", description: "Busca parcial pelo nome do modelo (ex: CDD12J)" },
          filtro_marca: { type: "string", description: "Filtro por marca" },
          filtro_tipo: { type: "string", description: "Filtro por classe/tipo" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_parcelas",
      description:
        "Lista parcelas/boletos com filtros avançados. Pode filtrar por status (vencidas, pendentes, pagas), por período de vencimento e por cliente.",
      parameters: {
        type: "object",
        properties: {
          apenas_vencidas: { type: "boolean", description: "Se true, apenas vencidas (default true)" },
          status: { type: "string", description: "Filtro: pendente, pago, vencido" },
          data_inicio: { type: "string", description: "Vencimento a partir de YYYY-MM-DD" },
          data_fim: { type: "string", description: "Vencimento até YYYY-MM-DD" },
          cliente: { type: "string", description: "Nome do cliente para filtrar" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_representantes",
      description:
        "Lista empresas representantes (representative_companies) e seus membros (company_members). Pode buscar por nome, CNPJ, tipo (MEI/empresa), posição (indicador/representante) e status ativo/inativo.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da empresa representante (busca parcial)" },
          cnpj: { type: "string", description: "CNPJ da empresa" },
          posicao: { type: "string", description: "indicador ou representante" },
          incluir_membros: { type: "boolean", description: "Se true, inclui membros/funcionários da empresa" },
          apenas_ativos: { type: "boolean", description: "Se true, apenas empresas ativas (default true)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_equipe",
      description:
        "Lista membros da organização (user_roles + profiles) com seus cargos. Retorna vendedores internos, gerentes e administradores. Cruza user_roles com profiles para nome e email.",
      parameters: {
        type: "object",
        properties: {
          cargo: { type: "string", description: "Filtro por role: admin, manager, seller, representative" },
          nome: { type: "string", description: "Busca por nome (parcial)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_fipe",
      description:
        "Consulta a tabela FIPE (fipe_documents) carregada pela organização. Retorna headers e linhas do documento de referência de preços.",
      parameters: {
        type: "object",
        properties: {
          filtro: { type: "string", description: "Termo de busca nas linhas do documento FIPE" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_organizacao",
      description:
        "Retorna dados cadastrais da organização: CNPJ, razão social, endereço, telefone, email de contato, configurações de comissão (comissão base, percentual over) e status de automação IMAP.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_convites",
      description:
        "Lista convites de membros (member_invitations) pendentes, aceitos ou expirados para a organização.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filtro: pendente, aceito, expirado" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_documentos_venda",
      description:
        "Lista documentos anexados a vendas (sale_documents): XMLs, PDFs, boletos. Pode filtrar por NF ou tipo de documento.",
      parameters: {
        type: "object",
        properties: {
          nf_numero: { type: "string", description: "Número da NF-e para filtrar" },
          tipo_documento: { type: "string", description: "Tipo: xml, pdf, boleto" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_log_emails",
      description:
        "Lista o log de processamento de emails (NFe automática via IMAP): status, remetente, assunto, chaves NFe encontradas.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filtro: processado, erro, ignorado" },
          limite: { type: "number", description: "Máximo de resultados (padrão 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_comissao_simulada",
      description:
        "Simula o cálculo de comissão líquida para um cenário hipotético, aplicando a cascata de impostos e juros. Útil para 'e se o valor da NF fosse X?'",
      parameters: {
        type: "object",
        properties: {
          valor_nf: { type: "number", description: "Valor total da NF" },
          valor_tabela: { type: "number", description: "Valor de tabela do equipamento" },
          uf: { type: "string", description: "UF destino para cálculo ICMS (ex: SP, BA, AM)" },
          num_parcelas: { type: "number", description: "Número de parcelas (para cálculo VP)" },
          valor_entrada: { type: "number", description: "Valor da entrada (default 0)" },
          percentual_comissao: { type: "number", description: "Percentual de comissão da empresa sobre valor tabela" },
        },
        required: ["valor_nf", "valor_tabela", "uf"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cruzar_cliente_representante",
      description:
        "Busca qual representante está vinculado a uma venda ou cliente. Cruza sales → representative_companies → company_members para identificar o responsável comercial de um cliente.",
      parameters: {
        type: "object",
        properties: {
          cliente_nome: { type: "string", description: "Nome do cliente para buscar vínculo" },
          nf_numero: { type: "string", description: "Número da NF para identificar o representante" },
        },
      },
    },
  },
];

// ─── ICMS RATES ──────────────────────────────────────────────────────
const ICMS_RATES: Record<string, number> = {
  SP: 0.12, RJ: 0.12, MG: 0.12, RS: 0.12, PR: 0.12, SC: 0.12, ES: 0.12,
  BA: 0.07, PE: 0.07, CE: 0.07, PA: 0.07, MA: 0.07, GO: 0.07, AM: 0.07,
  MT: 0.07, MS: 0.07, DF: 0.07,
  default: 0.04,
};
function getIcmsRate(uf: string): number {
  return ICMS_RATES[uf?.toUpperCase()] ?? ICMS_RATES["default"];
}

// ─── TOOL EXECUTOR ───────────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  db: ReturnType<typeof createClient>,
  orgId: string
): Promise<string> {
  try {
    switch (name) {
      // ── VENDAS ──────────────────────────────────────────────
      case "buscar_venda": {
        const limit = Number(args.limite) || 10;
        let q = db.from("sales").select("*").eq("organization_id", orgId);
        if (args.nf_numero) q = q.ilike("nfe_number", `%${args.nf_numero}%`);
        if (args.cliente) q = q.ilike("client_name", `%${args.cliente}%`);
        if (args.cnpj) q = q.ilike("client_cnpj", `%${args.cnpj}%`);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
        if (error) return JSON.stringify({ error: error.message });
        if (!data?.length) return JSON.stringify({ resultado: "Nenhuma venda encontrada." });

        const enriched = await Promise.all(data.map(async (sale) => {
          const { data: parcelas } = await db.from("installments").select("*").eq("sale_id", sale.id).order("installment_number");
          
          // Resolve seller name
          let vendedor_nome = null;
          if (sale.internal_seller_id) {
            const { data: profile } = await db.from("profiles").select("full_name, email").eq("id", sale.internal_seller_id).single();
            vendedor_nome = profile?.full_name || profile?.email;
          }

          // Resolve representative name
          let representante_nome = null;
          if (sale.representative_id) {
            const { data: rep } = await db.from("representative_companies").select("name, position").eq("id", sale.representative_id).single();
            representante_nome = rep?.name;
          }

          return {
            id: sale.id,
            nf: sale.nfe_number,
            cliente: sale.client_name,
            cnpj_cliente: sale.client_cnpj,
            data_emissao: sale.emission_date,
            uf_destino: sale.uf_destiny,
            valor_total_nf: sale.total_value,
            valor_tabela: sale.table_value,
            valor_entrada: sale.valor_entrada,
            entrada_calculada: sale.entrada_calculada,
            valor_presente: sale.valor_presente,
            over_price_bruto: sale.over_price,
            over_price_liquido: sale.over_price_liquido,
            icms: sale.icms,
            icms_tabela: sale.icms_tabela,
            pis_cofins: sale.pis_cofins,
            ir_csll: sale.ir_csll,
            percentual_comissao: sale.percentual_comissao,
            percentual_icms: sale.percentual_icms,
            comissao_calculada: sale.commission_calculated,
            status: sale.status,
            produto_modelo: sale.produto_modelo,
            produto_descricao: sale.produto_descricao,
            produto_marca: sale.produto_marca,
            produto_codigo: sale.produto_codigo,
            produto_numero_serie: sale.produto_numero_serie,
            metodo_pagamento: sale.payment_method,
            observacoes: sale.observacoes,
            motivo_rejeicao: sale.motivo_rejeicao,
            vendedor_interno: vendedor_nome,
            vendedor_interno_id: sale.internal_seller_id,
            vendedor_pct: sale.internal_seller_percent,
            representante: representante_nome,
            representante_id: sale.representative_id,
            representante_pct: sale.representative_percent,
            emitente_nome: sale.emitente_nome,
            emitente_cnpj: sale.emitente_cnpj,
            emitente_uf: sale.emitente_uf,
            nfe_key: sale.nfe_key,
            total_produtos: sale.total_produtos,
            total_ipi: sale.total_ipi,
            analise_ia: sale.analise_ia_status,
            ia_commentary: sale.ia_commentary,
            aprovado_por: sale.aprovado_por,
            aprovado_em: sale.aprovado_em,
            parcelas: parcelas?.map(p => ({
              numero: p.installment_number,
              valor: p.value,
              vencimento: p.due_date,
              status: p.status,
              pago_em: p.paid_at,
            })) || [],
          };
        }));

        return JSON.stringify({ vendas: enriched, total: enriched.length });
      }

      // ── COMISSÕES ───────────────────────────────────────────
      case "listar_comissoes": {
        let q = db.from("sales")
          .select("nfe_number, client_name, total_value, table_value, over_price, over_price_liquido, commission_calculated, percentual_comissao, status, emission_date, internal_seller_id, internal_seller_percent, representative_id, representative_percent, icms, pis_cofins, ir_csll")
          .eq("organization_id", orgId);
        if (args.data_inicio) q = q.gte("emission_date", String(args.data_inicio));
        if (args.data_fim) q = q.lte("emission_date", String(args.data_fim));
        if (args.vendedor_id) q = q.eq("internal_seller_id", String(args.vendedor_id));
        if (args.representante_id) q = q.eq("representative_id", String(args.representante_id));
        const { data, error } = await q.order("emission_date", { ascending: false }).limit(200);
        if (error) return JSON.stringify({ error: error.message });

        const totais = {
          qtd_vendas: data?.length || 0,
          total_faturamento: data?.reduce((a, s) => a + (Number(s.total_value) || 0), 0) || 0,
          total_over_bruto: data?.reduce((a, s) => a + (Number(s.over_price) || 0), 0) || 0,
          total_over_liquido: data?.reduce((a, s) => a + (Number(s.over_price_liquido) || 0), 0) || 0,
          total_comissao: data?.reduce((a, s) => a + (Number(s.commission_calculated) || 0), 0) || 0,
          total_icms: data?.reduce((a, s) => a + (Number(s.icms) || 0), 0) || 0,
          total_pis_cofins: data?.reduce((a, s) => a + (Number(s.pis_cofins) || 0), 0) || 0,
          total_ir_csll: data?.reduce((a, s) => a + (Number(s.ir_csll) || 0), 0) || 0,
          por_status: {
            pendente: data?.filter(s => s.status === "pendente").length || 0,
            aprovado: data?.filter(s => s.status === "aprovado").length || 0,
            pago: data?.filter(s => s.status === "pago").length || 0,
            rejeitado: data?.filter(s => s.status === "rejeitado").length || 0,
          },
        };

        return JSON.stringify({
          periodo: { inicio: args.data_inicio || "sem filtro", fim: args.data_fim || "sem filtro" },
          totais,
          vendas: data?.map(s => ({
            nf: s.nfe_number, cliente: s.client_name, total: s.total_value, tabela: s.table_value,
            over_bruto: s.over_price, over_liquido: s.over_price_liquido, comissao: s.commission_calculated,
            pct_comissao: s.percentual_comissao, status: s.status, data: s.emission_date,
          })),
        });
      }

      // ── FINANCEIRO ──────────────────────────────────────────
      case "verificar_financeiro": {
        let sale: any = null;
        if (args.venda_id) {
          const { data } = await db.from("sales").select("*").eq("id", String(args.venda_id)).eq("organization_id", orgId).single();
          sale = data;
        } else if (args.nf_numero) {
          const { data } = await db.from("sales").select("*").eq("organization_id", orgId).ilike("nfe_number", `%${args.nf_numero}%`).limit(1).single();
          sale = data;
        }
        if (!sale) return JSON.stringify({ resultado: "Venda não encontrada." });

        const { data: parcelas } = await db.from("installments").select("*").eq("sale_id", sale.id).order("installment_number");
        const hoje = new Date().toISOString().split("T")[0];
        const items = parcelas || [];
        const pagas = items.filter(p => p.status === "pago");
        const pendentes = items.filter(p => p.status !== "pago");
        const vencidas = pendentes.filter(p => p.due_date && p.due_date < hoje);
        const totalParcelas = items.reduce((a, p) => a + Number(p.value), 0);

        // Dedução Reversa
        const entradaCalculada = (Number(sale.total_value) || 0) - totalParcelas;

        return JSON.stringify({
          venda: {
            nf: sale.nfe_number, cliente: sale.client_name, valor_total_nf: sale.total_value,
            entrada_registrada: sale.valor_entrada, entrada_por_deducao_reversa: entradaCalculada,
            status: sale.status, pagamento: sale.payment_method,
          },
          parcelas: {
            total: items.length, pagas: pagas.length, pendentes: pendentes.length, vencidas: vencidas.length,
            valor_total_parcelas: totalParcelas,
            valor_pago: pagas.reduce((a, p) => a + Number(p.value), 0),
            valor_pendente: pendentes.reduce((a, p) => a + Number(p.value), 0),
            valor_vencido: vencidas.reduce((a, p) => a + Number(p.value), 0),
          },
          detalhamento: items.map(p => ({
            parcela: p.installment_number, valor: p.value, vencimento: p.due_date,
            status: p.status, pago_em: p.paid_at, vencida: p.status !== "pago" && p.due_date && p.due_date < hoje,
          })),
        });
      }

      // ── ESTOQUE ─────────────────────────────────────────────
      case "resumo_estoque": {
        let q = db.from("inventory").select("*").eq("organization_id", orgId);
        if (args.filtro_modelo) q = q.ilike("model_name", `%${args.filtro_modelo}%`);
        if (args.filtro_marca) q = q.ilike("marca", `%${args.filtro_marca}%`);
        if (args.filtro_tipo) q = q.ilike("classe_tipo", `%${args.filtro_tipo}%`);
        const { data, error } = await q.order("model_name").limit(100);
        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({
          total_modelos: data?.length || 0,
          total_unidades: data?.reduce((a, i) => a + (i.quantity || 0), 0) || 0,
          itens: data?.map(i => ({
            modelo: i.model_name, codigo: i.internal_code, marca: i.marca, tipo: i.classe_tipo,
            capacidade: i.capacidade, mastro: i.mastro, bateria: i.bateria, carregador: i.carregador,
            pneus: i.pneus, garfos: i.garfos, cor: i.cor, acessorios: i.acessorios,
            preco_base: i.base_price, moeda: i.moeda,
            preco_icms_12: i.valor_icms_12, preco_icms_7: i.valor_icms_7, preco_icms_4: i.valor_icms_4,
            pct_comissao: i.base_commission_pct,
            qtd_total: i.quantity, qtd_reservado: i.qtd_reservado,
            qtd_dealer: i.qtd_dealer, qtd_demo: i.qtd_demo, qtd_patio: i.qtd_patio,
            disponibilidade: i.disponibilidade_data,
          })),
        });
      }

      // ── PARCELAS ────────────────────────────────────────────
      case "listar_parcelas": {
        const hoje = new Date().toISOString().split("T")[0];
        const apenasVencidas = args.apenas_vencidas !== false;
        let q = db.from("installments").select("*").eq("organization_id", orgId);
        if (args.status === "pago") q = q.eq("status", "pago");
        else if (args.status !== "pago") q = q.neq("status", "pago");
        if (apenasVencidas && args.status !== "pago") q = q.lt("due_date", hoje);
        if (args.data_inicio) q = q.gte("due_date", String(args.data_inicio));
        if (args.data_fim) q = q.lte("due_date", String(args.data_fim));
        const { data: parcelas, error } = await q.order("due_date").limit(150);
        if (error) return JSON.stringify({ error: error.message });

        const saleIds = [...new Set((parcelas || []).map(p => p.sale_id))];
        const salesMap: Record<string, any> = {};
        if (saleIds.length > 0) {
          const { data: sales } = await db.from("sales").select("id, client_name, nfe_number").in("id", saleIds);
          sales?.forEach(s => { salesMap[s.id] = s; });
        }

        // Filter by client if requested
        let filtered = parcelas || [];
        if (args.cliente) {
          const term = String(args.cliente).toLowerCase();
          filtered = filtered.filter(p => salesMap[p.sale_id]?.client_name?.toLowerCase().includes(term));
        }

        return JSON.stringify({
          total: filtered.length,
          valor_total: filtered.reduce((a, p) => a + Number(p.value), 0),
          parcelas: filtered.map(p => ({
            parcela: p.installment_number, valor: p.value, vencimento: p.due_date,
            status: p.status, pago_em: p.paid_at,
            cliente: salesMap[p.sale_id]?.client_name || "N/A",
            nf: salesMap[p.sale_id]?.nfe_number || "N/A",
            vencida: p.status !== "pago" && p.due_date && p.due_date < hoje,
          })),
        });
      }

      // ── REPRESENTANTES ──────────────────────────────────────
      case "buscar_representantes": {
        const ativos = args.apenas_ativos !== false;
        let q = db.from("representative_companies").select("*").eq("organization_id", orgId);
        if (ativos) q = q.eq("active", true);
        if (args.nome) q = q.ilike("name", `%${args.nome}%`);
        if (args.cnpj) q = q.ilike("cnpj", `%${args.cnpj}%`);
        if (args.posicao) q = q.eq("position", args.posicao);
        const { data: companies, error } = await q.order("name");
        if (error) return JSON.stringify({ error: error.message });

        let result = (companies || []).map(c => ({
          id: c.id, nome: c.name, cnpj: c.cnpj, tipo: c.company_type,
          posicao: c.position, sede: c.sede, tecnica: c.is_technical, ativo: c.active,
          membros: [] as any[],
        }));

        if (args.incluir_membros && result.length > 0) {
          const ids = result.map(r => r.id);
          const { data: members } = await db.from("company_members").select("*").in("company_id", ids);
          if (members) {
            const byCompany: Record<string, any[]> = {};
            members.forEach(m => {
              if (!byCompany[m.company_id]) byCompany[m.company_id] = [];
              byCompany[m.company_id].push({ nome: m.name, email: m.email, telefone: m.phone, cargo: m.role, tecnico: m.is_technical });
            });
            result = result.map(r => ({ ...r, membros: byCompany[r.id] || [] }));
          }
        }

        return JSON.stringify({ total: result.length, representantes: result });
      }

      // ── EQUIPE ──────────────────────────────────────────────
      case "buscar_equipe": {
        let q = db.from("user_roles").select("user_id, role").eq("organization_id", orgId);
        if (args.cargo) q = q.eq("role", args.cargo);
        const { data: roles, error } = await q;
        if (error) return JSON.stringify({ error: error.message });
        if (!roles?.length) return JSON.stringify({ resultado: "Nenhum membro encontrado." });

        const userIds = roles.map(r => r.user_id);
        let pq = db.from("profiles").select("id, full_name, email").in("id", userIds);
        if (args.nome) pq = pq.ilike("full_name", `%${args.nome}%`);
        const { data: profiles } = await pq;

        const profileMap: Record<string, any> = {};
        profiles?.forEach(p => { profileMap[p.id] = p; });

        const membros = roles
          .filter(r => profileMap[r.user_id])
          .map(r => ({
            id: r.user_id,
            nome: profileMap[r.user_id]?.full_name,
            email: profileMap[r.user_id]?.email,
            cargo: r.role,
          }));

        return JSON.stringify({ total: membros.length, membros });
      }

      // ── FIPE ────────────────────────────────────────────────
      case "consultar_fipe": {
        const { data, error } = await db.from("fipe_documents").select("*").eq("organization_id", orgId).order("uploaded_at", { ascending: false }).limit(1);
        if (error) return JSON.stringify({ error: error.message });
        if (!data?.length) return JSON.stringify({ resultado: "Nenhuma tabela FIPE carregada." });

        const doc = data[0];
        let rows = doc.rows as any[];
        if (args.filtro && Array.isArray(rows)) {
          const term = String(args.filtro).toLowerCase();
          rows = rows.filter((row: any) => JSON.stringify(row).toLowerCase().includes(term));
        }

        return JSON.stringify({
          arquivo: doc.file_name, headers: doc.headers, total_linhas: doc.row_count,
          linhas_filtradas: rows.length,
          dados: rows.slice(0, 50),
        });
      }

      // ── ORGANIZAÇÃO ─────────────────────────────────────────
      case "consultar_organizacao": {
        const { data, error } = await db.from("organizations")
          .select("name, slug, cnpj, razao_social, endereco, cidade, estado, cep, telefone, email_contato, comissao_base, comissao_over_percent, automation_active, active")
          .eq("id", orgId).single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ organizacao: data });
      }

      // ── CONVITES ────────────────────────────────────────────
      case "consultar_convites": {
        let q = db.from("member_invitations").select("email, guest_name, role, status, created_at, expires_at, permissions").eq("organization_id", orgId);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ total: data?.length || 0, convites: data });
      }

      // ── DOCUMENTOS DE VENDA ─────────────────────────────────
      case "consultar_documentos_venda": {
        let q = db.from("sale_documents").select("id, sale_id, document_type, filename, file_size, created_at").eq("organization_id", orgId);
        if (args.tipo_documento) q = q.ilike("document_type", `%${args.tipo_documento}%`);
        
        if (args.nf_numero) {
          const { data: sales } = await db.from("sales").select("id").eq("organization_id", orgId).ilike("nfe_number", `%${args.nf_numero}%`);
          if (sales?.length) q = q.in("sale_id", sales.map(s => s.id));
          else return JSON.stringify({ resultado: "Nenhuma venda encontrada com essa NF." });
        }
        
        const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ total: data?.length || 0, documentos: data });
      }

      // ── LOG DE EMAILS ───────────────────────────────────────
      case "consultar_log_emails": {
        const limite = Number(args.limite) || 20;
        let q = db.from("email_processing_log").select("*").eq("organization_id", orgId);
        if (args.status) q = q.eq("status", args.status);
        const { data, error } = await q.order("processed_at", { ascending: false }).limit(limite);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({
          total: data?.length || 0,
          logs: data?.map(l => ({
            email_de: l.email_from, assunto: l.email_subject, status: l.status,
            motivo: l.reason, chaves_nfe: l.nfe_keys, qtd_xmls: l.xmls_count,
            processado_em: l.processed_at,
          })),
        });
      }

      // ── SIMULADOR DE COMISSÃO ───────────────────────────────
      case "calcular_comissao_simulada": {
        const valorNF = Number(args.valor_nf) || 0;
        const valorTabela = Number(args.valor_tabela) || 0;
        const uf = String(args.uf || "SP");
        const numParcelas = Number(args.num_parcelas) || 1;
        const valorEntrada = Number(args.valor_entrada) || 0;
        const pctComissao = Number(args.percentual_comissao) || 0;
        const taxaJuros = 0.022; // 2,2% a.m.

        // Valor Presente
        let vpParcelas = 0;
        const valorParcelado = valorNF - valorEntrada;
        const valorParcela = numParcelas > 0 ? valorParcelado / numParcelas : 0;
        for (let n = 1; n <= numParcelas; n++) {
          vpParcelas += valorParcela / Math.pow(1 + taxaJuros, n);
        }
        const valorPresente = valorEntrada + vpParcelas;

        // Over Price com cascata
        const overBruto = valorPresente - valorTabela;
        const icmsRate = getIcmsRate(uf);
        const icms = overBruto * icmsRate;
        const basePisCofins = overBruto - icms;
        const pisCofins = basePisCofins * 0.0925;
        const baseIrCsll = basePisCofins - pisCofins;
        const irCsll = baseIrCsll * 0.34;
        const overLiquido = overBruto - icms - pisCofins - irCsll;

        // Comissão base
        const comissaoBase = valorTabela * (pctComissao / 100);
        const comissaoTotal = comissaoBase + overLiquido;

        return JSON.stringify({
          entrada: { valor_nf: valorNF, valor_tabela: valorTabela, uf, parcelas: numParcelas, entrada: valorEntrada },
          calculo: {
            valor_presente: +valorPresente.toFixed(2),
            over_price_bruto: +overBruto.toFixed(2),
            icms: { taxa: icmsRate, valor: +icms.toFixed(2) },
            pis_cofins: { taxa: 0.0925, valor: +pisCofins.toFixed(2) },
            ir_csll: { taxa: 0.34, valor: +irCsll.toFixed(2) },
            over_price_liquido: +overLiquido.toFixed(2),
            comissao_base_tabela: +comissaoBase.toFixed(2),
            comissao_total_empresa: +comissaoTotal.toFixed(2),
          },
        });
      }

      // ── CRUZAMENTO CLIENTE × REPRESENTANTE ──────────────────
      case "cruzar_cliente_representante": {
        let salesQuery = db.from("sales").select("id, nfe_number, client_name, client_cnpj, representative_id, internal_seller_id").eq("organization_id", orgId);
        if (args.nf_numero) salesQuery = salesQuery.ilike("nfe_number", `%${args.nf_numero}%`);
        if (args.cliente_nome) salesQuery = salesQuery.ilike("client_name", `%${args.cliente_nome}%`);
        const { data: sales, error } = await salesQuery.limit(10);
        if (error) return JSON.stringify({ error: error.message });
        if (!sales?.length) return JSON.stringify({ resultado: "Nenhuma venda encontrada para cruzamento." });

        const result = await Promise.all(sales.map(async (sale) => {
          let repInfo = null;
          let membrosVinculados: any[] = [];
          let vendedorInfo = null;

          if (sale.representative_id) {
            const { data: rep } = await db.from("representative_companies").select("*").eq("id", sale.representative_id).single();
            if (rep) {
              repInfo = { id: rep.id, nome: rep.name, cnpj: rep.cnpj, posicao: rep.position, tipo: rep.company_type, sede: rep.sede };
              const { data: members } = await db.from("company_members").select("name, email, phone, role").eq("company_id", rep.id);
              membrosVinculados = members || [];
            }
          }

          if (sale.internal_seller_id) {
            const { data: profile } = await db.from("profiles").select("full_name, email").eq("id", sale.internal_seller_id).single();
            vendedorInfo = profile ? { nome: profile.full_name, email: profile.email } : null;
          }

          return {
            nf: sale.nfe_number, cliente: sale.client_name, cnpj: sale.client_cnpj,
            representante: repInfo, membros_representante: membrosVinculados, vendedor_interno: vendedorInfo,
          };
        }));

        return JSON.stringify({ cruzamentos: result });
      }

      default:
        return JSON.stringify({ error: `Ferramenta desconhecida: ${name}` });
    }
  } catch (err) {
    console.error(`Tool ${name} error:`, err);
    return JSON.stringify({ error: `Erro ao executar ${name}: ${err instanceof Error ? err.message : "Erro desconhecido"}` });
  }
}

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é um **Analista de Dados Sênior** especializado em vendas de equipamentos industriais (empilhadeiras, transpaleteiras, stackers). Você tem acesso Read-Only completo ao banco de dados da organização do usuário através de ferramentas (tools).

## REGRA DE OURO — ISOLAMENTO MULTI-TENANT
- Toda consulta JÁ está filtrada por organization_id automaticamente.
- NUNCA mencione IDs internos (UUIDs) ao usuário, use nomes legíveis.
- NUNCA invente dados. Se a ferramenta retornar vazio, diga claramente.

## FERRAMENTAS DISPONÍVEIS (14 tools)

### Vendas e Comissões
- **buscar_venda**: Busca por NF, cliente, CNPJ ou status. Retorna dados completos com parcelas, vendedor e representante.
- **listar_comissoes**: Agrega comissões por período com totais, breakdown por status e detalhamento.
- **cruzar_cliente_representante**: Cruza sales → representative_companies → company_members para identificar o responsável comercial.

### Financeiro e Cobrança
- **verificar_financeiro**: Status completo de parcelas, boletos, entrada. Aplica Dedução Reversa: Entrada = Total_NF - Σ Boletos.
- **listar_parcelas**: Filtros avançados por status, período e cliente.

### Estoque e Máquinas
- **resumo_estoque**: Busca por modelo, marca ou tipo. Retorna specs completas e preços por faixa ICMS.

### Referência de Preço
- **consultar_fipe**: Consulta a tabela FIPE carregada para validar valores.

### Pessoas e Empresas
- **buscar_representantes**: Lista empresas representantes com membros/funcionários.
- **buscar_equipe**: Lista vendedores internos, gerentes e admins com perfis.

### Organização e Config
- **consultar_organizacao**: Dados cadastrais, parâmetros de comissão.
- **consultar_convites**: Convites de membros pendentes/aceitos.

### Documentos e Logs
- **consultar_documentos_venda**: XMLs, PDFs e boletos anexados às vendas.
- **consultar_log_emails**: Log de processamento automático de NF-e via IMAP.

### Simulação
- **calcular_comissao_simulada**: Simula comissão líquida com VP, cascata de impostos e comissão base.

## MOTOR FINANCEIRO — REGRAS OBRIGATÓRIAS

### Valor Presente (VP)
- Boleto: **2,2% a.m.**  |  Cartão: **3,5% a.m.**
- VP = Entrada + Σ(Parcela / (1 + taxa)^n)
- O "Valor Real" da venda é o VP, não o valor da NF.

### Margem Líquida (Over Price) — CASCATA
1. Over Price Bruto = VP - Valor de Tabela
2. ICMS (4%, 7% ou 12% conforme UF) sobre Over Bruto
3. PIS/COFINS: **9,25%** sobre (Over Bruto − ICMS)
4. IR/CSLL: **34%** sobre (Over Bruto − ICMS − PIS/COFINS)
5. Over Price Líquido = Over Bruto − ICMS − PIS/COFINS − IR/CSLL

### Comissão da Empresa
- Comissão Base = Valor de Tabela × % Comissão
- Comissão Total = Comissão Base + Over Price Líquido

### Dedução Reversa (Entrada)
- Entrada = Total_NF − Σ Boletos

## ESTRATÉGIA DE RESOLUÇÃO
1. **Perguntas sobre vendas/NF**: Use buscar_venda primeiro. Se o vendedor/representante estiver vazio, use cruzar_cliente_representante.
2. **Perguntas sobre "quem vendeu para X"**: Use cruzar_cliente_representante com o nome do cliente.
3. **Perguntas sobre parcelas/boletos**: Use listar_parcelas ou verificar_financeiro.
4. **Perguntas sobre equipe**: Use buscar_equipe.
5. **Perguntas sobre estoque/máquinas**: Use resumo_estoque.
6. **Simulações "e se"**: Use calcular_comissao_simulada.
7. **Cruzamentos complexos**: Combine múltiplas ferramentas sequencialmente.

## FORMATAÇÃO
- Valores monetários: **R$ X.XXX,XX** (formato brasileiro)
- Use **tabelas markdown** para comparar dados
- Datas: DD/MM/YYYY
- Seja conciso mas completo. Destaque insights relevantes.
- Quando listar muitos itens, agrupe e resuma com totais.`;

// ─── MAIN HANDLER ────────────────────────────────────────────────────
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

    // Validate JWT and get user
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user role and org
    const { data: roles, error: rolesError } = await serviceClient
      .from("user_roles").select("role, organization_id").eq("user_id", userId);
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

    // API key: org key → Lovable AI fallback
    const { data: org } = await serviceClient.from("organizations").select("ai_api_key").eq("id", orgId).single();
    const orgApiKey = org?.ai_api_key;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!orgApiKey && !lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "API_KEY_MISSING", message: "Por favor, configure sua chave de IA nas configurações do Gerente." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const useOrgKey = !!orgApiKey;
    const apiKey = orgApiKey || lovableApiKey!;
    const apiUrl = useOrgKey ? "https://api.openai.com/v1/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const model = useOrgKey ? "gpt-4o-mini" : "google/gemini-3-flash-preview";

    const { messages } = await req.json();
    const conversationMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    // Step 1: Non-streaming call with tools
    const initialResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: conversationMessages, tools, tool_choice: "auto" }),
    });

    if (!initialResponse.ok) {
      const errText = await initialResponse.text();
      console.error("AI API error:", initialResponse.status, errText);
      if (initialResponse.status === 401 || initialResponse.status === 403) {
        return new Response(JSON.stringify({ error: "API_KEY_INVALID", message: "A chave de IA configurada é inválida." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (initialResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (initialResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const initialResult = await initialResponse.json();
    let assistantMessage = initialResult.choices?.[0]?.message;
    if (!assistantMessage) {
      return new Response(JSON.stringify({ error: "Resposta vazia da IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 2: Execute tool calls (supports multiple rounds)
    let updatedMessages = [...conversationMessages, assistantMessage];
    let maxRounds = 5;
    let didToolCalls = false;

    while (assistantMessage.tool_calls?.length > 0 && maxRounds > 0) {
      maxRounds--;
      didToolCalls = true;
      console.log(`Executing ${assistantMessage.tool_calls.length} tool call(s), rounds left: ${maxRounds}`);

      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (tc: { id: string; function: { name: string; arguments: string } }) => {
          const args = JSON.parse(tc.function.arguments || "{}");
          console.log(`Tool: ${tc.function.name}`, JSON.stringify(args));
          const result = await executeTool(tc.function.name, args, serviceClient, orgId);
          return { role: "tool", tool_call_id: tc.id, content: result };
        })
      );
      updatedMessages.push(...toolResults);

      // Call AI again — it may want more tools or give final answer
      const nextResponse = await fetch(apiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: updatedMessages, tools, tool_choice: "auto" }),
      });

      if (!nextResponse.ok) {
        console.error("AI follow-up error:", nextResponse.status);
        break;
      }

      const nextResult = await nextResponse.json();
      assistantMessage = nextResult.choices?.[0]?.message;
      if (!assistantMessage) break;
      updatedMessages.push(assistantMessage);
    }

    // Step 3: If the last assistant message already has content (final answer from tool loop),
    // stream it directly instead of making another API call that loses tool context
    if (assistantMessage?.content && !assistantMessage.tool_calls?.length) {
      // Convert the existing text answer into an SSE stream
      const textContent = assistantMessage.content;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send as a single SSE chunk
          const chunk = JSON.stringify({
            choices: [{ delta: { content: textContent }, index: 0, finish_reason: "stop" }],
          });
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls and no content yet — stream from scratch
    const finalResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: updatedMessages, stream: true }),
    });

    if (!finalResponse.ok) {
      console.error("AI stream error:", finalResponse.status);
      return new Response(JSON.stringify({ error: "Erro no streaming da IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(finalResponse.body, {
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
