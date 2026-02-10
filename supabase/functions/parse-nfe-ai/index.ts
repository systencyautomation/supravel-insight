import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ==================== CONSTANTS ====================
const PIS_COFINS_RATE = 0.0925;
const IR_CSLL_RATE = 0.34;
const TAXA_BOLETO = 0.022;

const ICMS_RATES: Record<string, number> = {
  AC:0.07,AL:0.07,AM:0.07,AP:0.07,BA:0.07,CE:0.07,DF:0.07,ES:0.07,
  GO:0.07,MA:0.07,MT:0.07,MS:0.07,PA:0.07,PB:0.07,PE:0.07,PI:0.07,
  RN:0.07,RO:0.07,RR:0.07,SE:0.07,TO:0.07,
  MG:0.12,PR:0.12,RJ:0.12,RS:0.12,SC:0.12,SP:0.12,
  IMPORTADO:0.04,
};

// ==================== INTERFACES ====================
interface ProductInfo {
  codigo: string | null;
  descricao: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
}

interface NfeInfo {
  chave: string | null;
  numero: string | null;
  serie: string | null;
  emissao: string | null;
}

interface EntityInfo {
  cnpj: string | null;
  nome: string | null;
  uf: string | null;
}

interface BoletoExtraido {
  valor: number;
  vencimento: string;
  numero?: string;
}

interface CalculadoraResult {
  valor_tabela: number;
  percentual_comissao: number;
  icms_tabela: number;
  icms_destino: number;
  valor_faturado: number;
  valor_entrada: number;
  qtd_parcelas: number;
  valor_parcela: number;
  valor_presente: number;
  over_price_bruto: number;
  deducao_icms: number;
  deducao_pis_cofins: number;
  deducao_ir_csll: number;
  over_price_liquido: number;
  comissao_pedido: number;
  comissao_total: number;
  percentual_final: number;
}

// ==================== XML PARSING (reused from parse-nfe-xml) ====================
function extractTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractNumber(xml: string, tagName: string): number | null {
  const value = extractTag(xml, tagName);
  if (!value) return null;
  const num = parseFloat(value.replace(',', '.'));
  return isNaN(num) ? null : num;
}

function extractInfAdProd(infAdProd: string): { marca: string | null; modelo: string | null; numeroSerie: string | null } {
  const result = { marca: null as string | null, modelo: null as string | null, numeroSerie: null as string | null };
  if (!infAdProd) return result;

  const normalized = infAdProd.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ');

  const marcaPatterns = [/Marca:\s*([^,;\n\r]+)/i, /MARCA:\s*([^,;\n\r]+)/i];
  for (const pattern of marcaPatterns) {
    const match = normalized.match(pattern);
    if (match) { result.marca = match[1].trim().replace(/\s*Modelo.*$/i, '').trim(); break; }
  }

  const modeloPatterns = [
    /Modelo\s*(?:da\s*)?(?:M[áa]quina)?:\s*([^,;\n\r]+)/i,
    /MODELO:\s*([^,;\n\r]+)/i,
    /Modelo:\s*([^,;\n\r]+)/i,
  ];
  for (const pattern of modeloPatterns) {
    const match = normalized.match(pattern);
    if (match) { result.modelo = match[1].trim().replace(/\s*N[úu]mero.*$/i, '').replace(/\s*S[ée]rie.*$/i, '').trim(); break; }
  }

  const seriePatterns = [
    /N[úu]mero\s*de\s*S[ée]rie:\s*([^,;\n\r]+)/i,
    /S[ée]rie:\s*([^,;\n\r]+)/i,
    /N[ºo°]\s*S[ée]rie:\s*([^,;\n\r]+)/i,
    /SN:\s*([^,;\n\r]+)/i,
    /S\/N:\s*([^,;\n\r]+)/i,
  ];
  for (const pattern of seriePatterns) {
    const match = normalized.match(pattern);
    if (match) { result.numeroSerie = match[1].trim(); break; }
  }

  return result;
}

function parseNfeXml(xmlContent: string) {
  const cProd = extractTag(xmlContent, 'cProd');
  const xProd = extractTag(xmlContent, 'xProd');

  const infAdProdMatch = xmlContent.match(/<infAdProd>([\s\S]*?)<\/infAdProd>/i);
  const infAdProdContent = infAdProdMatch ? infAdProdMatch[1] : '';
  const { marca, modelo, numeroSerie } = extractInfAdProd(infAdProdContent);

  const chNFe = extractTag(xmlContent, 'chNFe');
  const nNF = extractTag(xmlContent, 'nNF');
  const serie = extractTag(xmlContent, 'serie');
  const dhEmi = extractTag(xmlContent, 'dhEmi');
  const emissaoDate = dhEmi ? dhEmi.split('T')[0] : null;

  const emitMatch = xmlContent.match(/<emit>([\s\S]*?)<\/emit>/i);
  const emitContent = emitMatch ? emitMatch[1] : '';
  const emitCnpj = extractTag(emitContent, 'CNPJ');
  const emitNome = extractTag(emitContent, 'xNome');
  const enderEmitMatch = emitContent.match(/<enderEmit>([\s\S]*?)<\/enderEmit>/i);
  const emitUf = enderEmitMatch ? extractTag(enderEmitMatch[1], 'UF') : null;

  const destMatch = xmlContent.match(/<dest>([\s\S]*?)<\/dest>/i);
  const destContent = destMatch ? destMatch[1] : '';
  const destCnpj = extractTag(destContent, 'CNPJ') || extractTag(destContent, 'CPF');
  const destNome = extractTag(destContent, 'xNome');
  const enderDestMatch = destContent.match(/<enderDest>([\s\S]*?)<\/enderDest>/i);
  const destUf = enderDestMatch ? extractTag(enderDestMatch[1], 'UF') : null;

  const totalMatch = xmlContent.match(/<total>([\s\S]*?)<\/total>/i);
  const totalContent = totalMatch ? totalMatch[1] : '';
  const icmsTotMatch = totalContent.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/i);
  const icmsTotContent = icmsTotMatch ? icmsTotMatch[1] : '';

  const vProdTotal = extractNumber(icmsTotContent, 'vProd');
  const vNF = extractNumber(icmsTotContent, 'vNF');
  const vIPI = extractNumber(icmsTotContent, 'vIPI');

  return {
    produto: { codigo: cProd, descricao: xProd, marca, modelo, numero_serie: numeroSerie } as ProductInfo,
    nfe: { chave: chNFe, numero: nNF, serie, emissao: emissaoDate } as NfeInfo,
    emitente: { cnpj: emitCnpj, nome: emitNome, uf: emitUf } as EntityInfo,
    destinatario: { cnpj: destCnpj, nome: destNome, uf: destUf } as EntityInfo,
    valores: { total_produtos: vProdTotal, total_nf: vNF, ipi: vIPI },
  };
}

// ==================== FIPE LOOKUP ====================
interface FipeMatch {
  valorTabela: number;
  icmsTabela: number;
  comissao: number;
}

async function lookupFipe(supabase: any, organizationId: string, productCode: string | null): Promise<FipeMatch | null> {
  if (!productCode) return null;

  const { data: fipeDocs } = await supabase
    .from('fipe_documents')
    .select('rows, headers')
    .eq('organization_id', organizationId)
    .order('uploaded_at', { ascending: false })
    .limit(1);

  if (!fipeDocs || fipeDocs.length === 0) return null;

  const gridData = fipeDocs[0].rows as any[][];
  if (!gridData || gridData.length < 4) return null;

  // Find header row
  let headerRowIndex = -1;
  let codIndex = -1;
  for (let i = 0; i < Math.min(5, gridData.length); i++) {
    const row = gridData[i];
    if (!row) continue;
    const idx = row.findIndex((cell: any) => {
      const value = String(cell?.value || cell || '').toLowerCase();
      return value.includes('cód') && value.includes('interno');
    });
    if (idx >= 0) { headerRowIndex = i; codIndex = idx; break; }
  }

  if (headerRowIndex < 0 || codIndex < 0) return null;

  const headerRow = gridData[headerRowIndex];
  const findColIndex = (keywords: string[]) => headerRow?.findIndex((cell: any) => {
    const v = String(cell?.value || cell || '').toLowerCase();
    return keywords.every(k => v.includes(k));
  }) ?? -1;

  const valor12Index = findColIndex(['valor', '12%']);
  const valor7Index = findColIndex(['valor', '7%']);
  const valor4Index = findColIndex(['valor', '4%']);
  const comissaoIndex = headerRow?.findIndex((cell: any) => {
    const v = String(cell?.value || cell || '').toLowerCase();
    return v.includes('comiss');
  }) ?? -1;

  const code = String(productCode).trim();
  const prefixMatch = code.match(/^([A-Za-z0-9]+)/);
  const codePrefix = prefixMatch ? prefixMatch[1] : code;

  const parseValue = (row: any[], idx: number) => {
    if (idx < 0) return 0;
    return parseFloat(String(row[idx]?.value || row[idx] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
  };

  for (let i = headerRowIndex + 1; i < gridData.length; i++) {
    const row = gridData[i];
    if (!row) continue;
    const cellValue = String(row[codIndex]?.value || row[codIndex] || '').trim();
    if (!cellValue) continue;

    const isMatch = cellValue === code
      || cellValue === codePrefix
      || cellValue.toUpperCase().startsWith(codePrefix.toUpperCase())
      || code.toUpperCase().startsWith(cellValue.toUpperCase());

    if (isMatch) {
      const v4 = parseValue(row, valor4Index);
      const v7 = parseValue(row, valor7Index);
      const v12 = parseValue(row, valor12Index);
      const com = parseValue(row, comissaoIndex);

      let match: FipeMatch | null = null;
      if (v4 > 0) match = { valorTabela: v4, icmsTabela: 4, comissao: com };
      else if (v7 > 0) match = { valorTabela: v7, icmsTabela: 7, comissao: com };
      else if (v12 > 0) match = { valorTabela: v12, icmsTabela: 12, comissao: com };

      if (cellValue === code && match) return match; // exact
      if (match) return match;
    }
  }

  return null;
}

// ==================== AI PDF EXTRACTION ====================
async function extractBoletosFromPdfs(pdfs: string[], apiKey: string): Promise<BoletoExtraido[]> {
  const allBoletos: BoletoExtraido[] = [];

  for (const pdfBase64 of pdfs) {
    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "Você é um especialista em análise de documentos financeiros brasileiros. Extraia dados de boletos bancários de PDFs com precisão."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analise este PDF de boleto bancário. Extraia TODOS os boletos encontrados no documento. Para cada boleto, retorne: valor (numérico, em reais), data de vencimento (formato YYYY-MM-DD), e número do boleto se visível. Use a tool extract_boletos para retornar os dados estruturados."
                },
                {
                  type: "image_url",
                  image_url: { url: `data:application/pdf;base64,${pdfBase64}` }
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
        console.error(`AI Gateway error for PDF: ${aiResponse.status}`, errorText);
        if (aiResponse.status === 429 || aiResponse.status === 402) {
          throw new Error(`AI_ERROR_${aiResponse.status}`);
        }
        continue; // skip this PDF on other errors
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          if (args.boletos && Array.isArray(args.boletos)) {
            allBoletos.push(...args.boletos);
          }
        } catch (e) {
          console.error('Failed to parse AI tool call arguments:', e);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.startsWith('AI_ERROR_')) throw e; // propagate rate limit / payment errors
      console.error('Error processing PDF:', e);
    }
  }

  // Sort by due date
  allBoletos.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
  return allBoletos;
}

// ==================== COMMISSION CALCULATOR ====================
function calcularValorPresente(valorParcela: number, numParcelas: number, taxaMensal: number): number {
  if (numParcelas <= 0) return 0;
  if (taxaMensal <= 0) return valorParcela * numParcelas;
  const fatorVP = (1 - Math.pow(1 + taxaMensal, -numParcelas)) / taxaMensal;
  return valorParcela * fatorVP;
}

function calculateCommission(
  totalNf: number,
  valorEntrada: number,
  boletos: BoletoExtraido[],
  fipeMatch: FipeMatch | null,
  ufDestino: string | null,
): CalculadoraResult {
  const valorTabela = fipeMatch?.valorTabela ?? 0;
  const percentualComissao = fipeMatch?.comissao ?? 0;
  const icmsTabela = fipeMatch?.icmsTabela ?? 0;
  const icmsOrigem = icmsTabela / 100;
  const uf = ufDestino?.toUpperCase() || '';
  const icmsDestino = ICMS_RATES[uf] ?? 0.04;

  const qtdParcelas = boletos.length;
  const valorParcela = qtdParcelas > 0 ? boletos.reduce((s, b) => s + b.valor, 0) / qtdParcelas : 0;

  // Valor Presente
  let valorPresente: number;
  if (qtdParcelas > 0) {
    const vpParcelas = calcularValorPresente(valorParcela, qtdParcelas, TAXA_BOLETO);
    valorPresente = valorEntrada + vpParcelas;
  } else {
    valorPresente = totalNf; // à vista
  }

  // Valor Tabela Ajustado (ICMS normalization)
  let valorTabelaAjustado = valorTabela;
  if (Math.abs(icmsOrigem - icmsDestino) > 0.001 && icmsOrigem > 0) {
    valorTabelaAjustado = valorTabela / (1 - icmsOrigem) * (1 - icmsDestino);
  }

  // Over Price
  const overPriceBruto = valorPresente - valorTabelaAjustado;

  // Cascade deductions
  let deducaoIcms = 0, deducaoPisCofins = 0, deducaoIrCsll = 0, overPriceLiquido = 0;
  if (overPriceBruto > 0) {
    deducaoIcms = overPriceBruto * icmsDestino;
    const sub1 = overPriceBruto - deducaoIcms;
    deducaoPisCofins = sub1 * PIS_COFINS_RATE;
    const sub2 = sub1 - deducaoPisCofins;
    deducaoIrCsll = sub2 * IR_CSLL_RATE;
    overPriceLiquido = sub2 - deducaoIrCsll;
  } else {
    overPriceLiquido = overPriceBruto; // negative over penalizes commission
  }

  const comissaoPedido = (percentualComissao / 100) * valorTabela;
  const comissaoTotal = comissaoPedido + overPriceLiquido;
  const percentualFinal = totalNf > 0 ? (comissaoTotal / totalNf) * 100 : 0;

  return {
    valor_tabela: valorTabela,
    percentual_comissao: percentualComissao,
    icms_tabela: icmsTabela,
    icms_destino: icmsDestino * 100,
    valor_faturado: totalNf,
    valor_entrada: valorEntrada,
    qtd_parcelas: qtdParcelas,
    valor_parcela: Math.round(valorParcela * 100) / 100,
    valor_presente: Math.round(valorPresente * 100) / 100,
    over_price_bruto: Math.round(overPriceBruto * 100) / 100,
    deducao_icms: Math.round(deducaoIcms * 100) / 100,
    deducao_pis_cofins: Math.round(deducaoPisCofins * 100) / 100,
    deducao_ir_csll: Math.round(deducaoIrCsll * 100) / 100,
    over_price_liquido: Math.round(overPriceLiquido * 100) / 100,
    comissao_pedido: Math.round(comissaoPedido * 100) / 100,
    comissao_total: Math.round(comissaoTotal * 100) / 100,
    percentual_final: Math.round(percentualFinal * 100) / 100,
  };
}

// ==================== COMMENTARY BUILDER ====================
function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function buildCommentary(
  parsed: ReturnType<typeof parseNfeXml>,
  fipeMatch: FipeMatch | null,
  boletos: BoletoExtraido[],
  calc: CalculadoraResult,
  hasPdfs: boolean,
): string {
  const parts: string[] = [];

  // FIPE status
  if (fipeMatch) {
    parts.push(`Match FIPE encontrado: modelo ${parsed.produto.modelo}, tabela ${formatBRL(fipeMatch.valorTabela)} (ICMS ${fipeMatch.icmsTabela}%), comissão base ${fipeMatch.comissao}%.`);
  } else {
    parts.push(`Match FIPE NÃO encontrado para código "${parsed.produto.modelo || parsed.produto.codigo || 'N/A'}". Cálculo parcial sem valor tabela.`);
  }

  // Boletos status
  if (hasPdfs && boletos.length > 0) {
    const somaBoletos = boletos.reduce((s, b) => s + b.valor, 0);
    parts.push(`${boletos.length} boleto(s) extraído(s) dos PDFs, total ${formatBRL(somaBoletos)}.`);
    if (calc.valor_entrada > 0) {
      parts.push(`Entrada de ${formatBRL(calc.valor_entrada)} detectada via entrada reversa (NF ${formatBRL(calc.valor_faturado)} - Boletos ${formatBRL(somaBoletos)}).`);
    }
  } else if (hasPdfs) {
    parts.push('PDFs enviados mas nenhum boleto foi extraído.');
  } else {
    parts.push('Nenhum PDF de boleto enviado. Venda tratada como à vista.');
  }

  // Commission result
  if (fipeMatch) {
    parts.push(`Comissão calculada: ${formatBRL(calc.comissao_total)} (${calc.percentual_final.toFixed(2)}% sobre faturado).`);
    if (calc.over_price_bruto > 0) {
      parts.push(`Over Price bruto: ${formatBRL(calc.over_price_bruto)}, líquido após deduções: ${formatBRL(calc.over_price_liquido)}.`);
    } else if (calc.over_price_bruto < 0) {
      parts.push(`Over Price NEGATIVO: ${formatBRL(calc.over_price_bruto)} — venda abaixo da tabela.`);
    }
  }

  return parts.join(' ');
}

// ==================== MAIN HANDLER ====================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { xml_content, pdfs, organization_id } = body;

    // Validate input
    if (!xml_content || typeof xml_content !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'xml_content is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfArray: string[] = Array.isArray(pdfs) ? pdfs : [];
    const hasPdfs = pdfArray.length > 0;

    console.log(`[parse-nfe-ai] Processing: xml=yes, pdfs=${pdfArray.length}, org=${organization_id}`);

    // Step 1: Parse XML deterministically
    const parsed = parseNfeXml(xml_content);
    console.log('[parse-nfe-ai] Parsed NFe:', JSON.stringify(parsed.nfe));
    console.log('[parse-nfe-ai] Product:', JSON.stringify(parsed.produto));

    // Step 2: Initialize Supabase and lookup FIPE
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const codigoParaBusca = parsed.produto.modelo || parsed.produto.codigo;
    const fipeMatch = await lookupFipe(supabase, organization_id, codigoParaBusca);
    console.log('[parse-nfe-ai] FIPE match:', fipeMatch ? JSON.stringify(fipeMatch) : 'none');

    // Step 3: Extract boletos from PDFs via AI (if provided)
    let boletos: BoletoExtraido[] = [];
    let aiExtractionError: string | null = null;

    if (hasPdfs) {
      // Get org's AI API key
      const { data: org } = await supabase
        .from('organizations')
        .select('ai_api_key')
        .eq('id', organization_id)
        .single();

      const apiKey = org?.ai_api_key || Deno.env.get('LOVABLE_API_KEY');

      if (apiKey) {
        try {
          boletos = await extractBoletosFromPdfs(pdfArray, apiKey);
          console.log(`[parse-nfe-ai] Extracted ${boletos.length} boletos from ${pdfArray.length} PDFs`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unknown AI error';
          console.error('[parse-nfe-ai] AI extraction error:', msg);
          aiExtractionError = msg;

          if (msg === 'AI_ERROR_429') {
            return new Response(
              JSON.stringify({ success: false, error: 'Rate limit exceeded. Try again later.', code: 'RATE_LIMITED' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (msg === 'AI_ERROR_402') {
            return new Response(
              JSON.stringify({ success: false, error: 'AI credits exhausted. Add funds to continue.', code: 'PAYMENT_REQUIRED' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } else {
        aiExtractionError = 'No AI API key configured and no LOVABLE_API_KEY available';
        console.warn('[parse-nfe-ai]', aiExtractionError);
      }
    }

    // Step 4: Conciliation — Entrada Reversa
    const totalNf = parsed.valores.total_nf || 0;
    let valorEntrada = 0;
    let parcelasParaCalculo = boletos;

    if (boletos.length > 0) {
      // Check if first boleto is down payment (vencimento <= 3 days from emission)
      const emissionDate = parsed.nfe.emissao;
      if (emissionDate && boletos[0]?.vencimento) {
        const diffDias = Math.abs(
          (new Date(boletos[0].vencimento).getTime() - new Date(emissionDate).getTime())
          / (1000 * 60 * 60 * 24)
        );
        if (diffDias <= 3) {
          valorEntrada = boletos[0].valor || 0;
          parcelasParaCalculo = boletos.slice(1);
          console.log(`[parse-nfe-ai] First boleto is down payment: ${valorEntrada}`);
        } else {
          const somaBoletos = boletos.reduce((s, b) => s + b.valor, 0);
          valorEntrada = Math.max(0, totalNf - somaBoletos);
          console.log(`[parse-nfe-ai] Reverse entry: ${totalNf} - ${somaBoletos} = ${valorEntrada}`);
        }
      } else {
        const somaBoletos = boletos.reduce((s, b) => s + b.valor, 0);
        valorEntrada = Math.max(0, totalNf - somaBoletos);
      }
    }

    // Step 5: Calculate all commission fields
    const calculadora = calculateCommission(totalNf, valorEntrada, parcelasParaCalculo, fipeMatch, parsed.destinatario.uf);
    console.log('[parse-nfe-ai] Calculator result:', JSON.stringify(calculadora));

    // Step 6: Build IA commentary
    const iaCommentary = buildCommentary(parsed, fipeMatch, boletos, calculadora, hasPdfs);

    // Determine status
    const analiseStatus = (fipeMatch && (!hasPdfs || boletos.length > 0)) ? 'concluido' : 'falha';

    const result = {
      success: true,
      ia_commentary: iaCommentary,
      nfe: parsed.nfe,
      produto: parsed.produto,
      emitente: parsed.emitente,
      destinatario: parsed.destinatario,
      total_nf: totalNf,
      boletos,
      calculadora,
      analise_ia_status: analiseStatus,
      fipe_match: !!fipeMatch,
      ...(aiExtractionError ? { ai_extraction_error: aiExtractionError } : {}),
    };

    console.log(`[parse-nfe-ai] Done. Status: ${analiseStatus}, FIPE: ${!!fipeMatch}, Boletos: ${boletos.length}`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[parse-nfe-ai] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
