import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductInfo {
  codigo: string | null;
  descricao: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  ncm: string | null;
  cfop: string | null;
  unidade: string | null;
  quantidade: number | null;
  valor_unitario: number | null;
  valor_total: number | null;
}

interface NfeInfo {
  chave: string | null;
  numero: string | null;
  serie: string | null;
  modelo: string | null;
  emissao: string | null;
}

interface EmitenteInfo {
  cnpj: string | null;
  nome: string | null;
  uf: string | null;
}

interface DestinatarioInfo {
  cnpj: string | null;
  nome: string | null;
  uf: string | null;
}

interface ValoresInfo {
  total_produtos: number | null;
  total_nf: number | null;
  ipi: number | null;
}

interface Duplicata {
  numero: string | null;
  vencimento: string | null;
  valor: number | null;
}

interface CobrancaInfo {
  duplicatas: Duplicata[];
  valorOriginal: number | null;
  valorLiquido: number | null;
}

interface PagamentoInfo {
  tipo: string | null;
  tipoDescricao: string | null;
  valor: number | null;
}

interface ParsedNfe {
  produto: ProductInfo;
  nfe: NfeInfo;
  emitente: EmitenteInfo;
  destinatario: DestinatarioInfo;
  valores: ValoresInfo;
  cobranca: CobrancaInfo;
  pagamento: PagamentoInfo;
}

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
  const result = {
    marca: null as string | null,
    modelo: null as string | null,
    numeroSerie: null as string | null,
  };

  if (!infAdProd) return result;

  const normalized = infAdProd.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ');

  const marcaPatterns = [
    /Marca:\s*([^,;\n\r]+)/i,
    /MARCA:\s*([^,;\n\r]+)/i,
  ];
  for (const pattern of marcaPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.marca = match[1].trim().replace(/\s*Modelo.*$/i, '').trim();
      break;
    }
  }

  const modeloPatterns = [
    /Modelo\s*(?:da\s*)?(?:M[áa]quina)?:\s*([^,;\n\r]+)/i,
    /MODELO:\s*([^,;\n\r]+)/i,
    /Modelo:\s*([^,;\n\r]+)/i,
  ];
  for (const pattern of modeloPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      result.modelo = match[1].trim().replace(/\s*N[úu]mero.*$/i, '').replace(/\s*S[ée]rie.*$/i, '').trim();
      break;
    }
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
    if (match) {
      result.numeroSerie = match[1].trim();
      break;
    }
  }

  return result;
}

// Mapeamento de tipos de pagamento NFe para nosso sistema
const TIPOS_PAGAMENTO: Record<string, string> = {
  '01': 'a_vista',           // Dinheiro
  '02': 'a_vista',           // Cheque
  '03': 'parcelado_cartao',  // Cartão de Crédito
  '04': 'a_vista',           // Cartão de Débito
  '05': 'a_vista',           // Crédito Loja
  '10': 'a_vista',           // Vale Alimentação
  '11': 'a_vista',           // Vale Refeição
  '12': 'a_vista',           // Vale Presente
  '13': 'a_vista',           // Vale Combustível
  '14': 'a_vista',           // Duplicata Mercantil
  '15': 'parcelado_boleto',  // Boleto Bancário
  '16': 'a_vista',           // Depósito Bancário
  '17': 'a_vista',           // PIX
  '18': 'a_vista',           // Transferência
  '19': 'a_vista',           // Fidelidade/Cashback
  '90': 'a_vista',           // Sem Pagamento
  '99': 'a_vista',           // Outros
};

const TIPOS_PAGAMENTO_DESC: Record<string, string> = {
  '01': 'Dinheiro',
  '02': 'Cheque',
  '03': 'Cartão de Crédito',
  '04': 'Cartão de Débito',
  '05': 'Crédito Loja',
  '15': 'Boleto Bancário',
  '16': 'Depósito Bancário',
  '17': 'PIX',
  '18': 'Transferência',
  '99': 'Outros',
};

function extractDuplicatas(xmlContent: string): CobrancaInfo {
  const result: CobrancaInfo = {
    duplicatas: [],
    valorOriginal: null,
    valorLiquido: null,
  };

  const cobrMatch = xmlContent.match(/<cobr>([\s\S]*?)<\/cobr>/i);
  if (!cobrMatch) return result;

  const cobrContent = cobrMatch[1];

  // Extract fatura info
  const fatMatch = cobrContent.match(/<fat>([\s\S]*?)<\/fat>/i);
  if (fatMatch) {
    result.valorOriginal = extractNumber(fatMatch[1], 'vOrig');
    result.valorLiquido = extractNumber(fatMatch[1], 'vLiq');
  }

  // Extract duplicatas
  const dupRegex = /<dup>([\s\S]*?)<\/dup>/gi;
  let dupMatch;
  while ((dupMatch = dupRegex.exec(cobrContent)) !== null) {
    const dupContent = dupMatch[1];
    result.duplicatas.push({
      numero: extractTag(dupContent, 'nDup'),
      vencimento: extractTag(dupContent, 'dVenc'),
      valor: extractNumber(dupContent, 'vDup'),
    });
  }

  return result;
}

function extractPagamento(xmlContent: string): PagamentoInfo {
  const result: PagamentoInfo = {
    tipo: null,
    tipoDescricao: null,
    valor: null,
  };

  const pagMatch = xmlContent.match(/<pag>([\s\S]*?)<\/pag>/i);
  if (!pagMatch) return result;

  const detPagMatch = pagMatch[1].match(/<detPag>([\s\S]*?)<\/detPag>/i);
  if (!detPagMatch) return result;

  const tPag = extractTag(detPagMatch[1], 'tPag');
  result.tipo = tPag;
  result.tipoDescricao = tPag ? (TIPOS_PAGAMENTO_DESC[tPag] || 'Outros') : null;
  result.valor = extractNumber(detPagMatch[1], 'vPag');

  return result;
}

function parseNfeXml(xmlContent: string): ParsedNfe {
  const cProd = extractTag(xmlContent, 'cProd');
  const xProd = extractTag(xmlContent, 'xProd');
  const ncm = extractTag(xmlContent, 'NCM');
  const cfop = extractTag(xmlContent, 'CFOP');
  const uCom = extractTag(xmlContent, 'uCom');
  const qCom = extractNumber(xmlContent, 'qCom');
  const vUnCom = extractNumber(xmlContent, 'vUnCom');
  const vProd = extractNumber(xmlContent, 'vProd');

  const infAdProdMatch = xmlContent.match(/<infAdProd>([\s\S]*?)<\/infAdProd>/i);
  const infAdProdContent = infAdProdMatch ? infAdProdMatch[1] : '';
  const { marca, modelo, numeroSerie } = extractInfAdProd(infAdProdContent);

  const chNFe = extractTag(xmlContent, 'chNFe');
  const nNF = extractTag(xmlContent, 'nNF');
  const serie = extractTag(xmlContent, 'serie');
  const mod = extractTag(xmlContent, 'mod');
  const dhEmi = extractTag(xmlContent, 'dhEmi');
  const emissaoDate = dhEmi ? dhEmi.split('T')[0] : null;

  const emitMatch = xmlContent.match(/<emit>([\s\S]*?)<\/emit>/i);
  const emitContent = emitMatch ? emitMatch[1] : '';
  const emitCnpj = extractTag(emitContent, 'CNPJ');
  const emitNome = extractTag(emitContent, 'xNome');
  
  const enderEmitMatch = emitContent.match(/<enderEmit>([\s\S]*?)<\/enderEmit>/i);
  const enderEmitContent = enderEmitMatch ? enderEmitMatch[1] : '';
  const emitUf = extractTag(enderEmitContent, 'UF');

  const destMatch = xmlContent.match(/<dest>([\s\S]*?)<\/dest>/i);
  const destContent = destMatch ? destMatch[1] : '';
  const destCnpj = extractTag(destContent, 'CNPJ') || extractTag(destContent, 'CPF');
  const destNome = extractTag(destContent, 'xNome');
  
  const enderDestMatch = destContent.match(/<enderDest>([\s\S]*?)<\/enderDest>/i);
  const enderDestContent = enderDestMatch ? enderDestMatch[1] : '';
  const destUf = extractTag(enderDestContent, 'UF');

  const totalMatch = xmlContent.match(/<total>([\s\S]*?)<\/total>/i);
  const totalContent = totalMatch ? totalMatch[1] : '';
  const icmsTotMatch = totalContent.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/i);
  const icmsTotContent = icmsTotMatch ? icmsTotMatch[1] : '';
  
  const vProdTotal = extractNumber(icmsTotContent, 'vProd');
  const vNF = extractNumber(icmsTotContent, 'vNF');
  const vIPI = extractNumber(icmsTotContent, 'vIPI');

  // Extract cobrança e pagamento
  const cobranca = extractDuplicatas(xmlContent);
  const pagamento = extractPagamento(xmlContent);

  return {
    produto: {
      codigo: cProd,
      descricao: xProd,
      marca,
      modelo,
      numero_serie: numeroSerie,
      ncm,
      cfop,
      unidade: uCom,
      quantidade: qCom,
      valor_unitario: vUnCom,
      valor_total: vProd,
    },
    nfe: {
      chave: chNFe,
      numero: nNF,
      serie,
      modelo: mod,
      emissao: emissaoDate,
    },
    emitente: {
      cnpj: emitCnpj,
      nome: emitNome,
      uf: emitUf,
    },
    destinatario: {
      cnpj: destCnpj,
      nome: destNome,
      uf: destUf,
    },
    valores: {
      total_produtos: vProdTotal,
      total_nf: vNF,
      ipi: vIPI,
    },
    cobranca,
    pagamento,
  };
}

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
    const { xml_content, organization_id, email_from, email_subject, filename } = body;

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

    const parsedData = parseNfeXml(xml_content);
    console.log('Parsed NFe data:', JSON.stringify(parsedData, null, 2));

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check for duplicate NFe
    if (parsedData.nfe.chave) {
      const { data: existing } = await supabase
        .from('sales')
        .select('id')
        .eq('nfe_key', parsedData.nfe.chave)
        .eq('organization_id', organization_id)
        .maybeSingle();

      if (existing) {
        console.log(`NFe ${parsedData.nfe.chave} already exists, skipping insert`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'NFe já existe no sistema',
            duplicate: true,
            existing_id: existing.id,
            parsed: parsedData 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Determine payment method from XML
    const paymentMethod = parsedData.pagamento.tipo 
      ? TIPOS_PAGAMENTO[parsedData.pagamento.tipo] || 'a_vista'
      : (parsedData.cobranca.duplicatas.length > 1 ? 'parcelado_boleto' : 'a_vista');

    // Calculate valor_entrada (first installment if parcelado)
    let valorEntrada = 0;
    if (parsedData.cobranca.duplicatas.length > 0 && paymentMethod !== 'a_vista') {
      valorEntrada = parsedData.cobranca.duplicatas[0]?.valor || 0;
    }

    // Insert into sales table
    const { data: sale, error: insertError } = await supabase
      .from('sales')
      .insert({
        organization_id,
        nfe_key: parsedData.nfe.chave,
        nfe_number: parsedData.nfe.numero,
        nfe_series: parsedData.nfe.serie,
        nfe_model: parsedData.nfe.modelo,
        emission_date: parsedData.nfe.emissao,
        produto_codigo: parsedData.produto.codigo,
        produto_descricao: parsedData.produto.descricao,
        produto_marca: parsedData.produto.marca,
        produto_modelo: parsedData.produto.modelo,
        produto_numero_serie: parsedData.produto.numero_serie,
        emitente_cnpj: parsedData.emitente.cnpj,
        emitente_nome: parsedData.emitente.nome,
        emitente_uf: parsedData.emitente.uf,
        client_cnpj: parsedData.destinatario.cnpj,
        client_name: parsedData.destinatario.nome,
        uf_destiny: parsedData.destinatario.uf,
        total_produtos: parsedData.valores.total_produtos,
        total_ipi: parsedData.valores.ipi,
        total_value: parsedData.valores.total_nf,
        nfe_email_from: email_from || null,
        nfe_filename: filename || null,
        payment_method: paymentMethod,
        valor_entrada: valorEntrada,
        status: 'pendente',
        nfe_processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting sale:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to insert sale: ${insertError.message}`,
          parsed: parsedData 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sale inserted successfully:', sale.id);

    // Insert installments if there are duplicatas
    let installmentsInserted = 0;
    if (parsedData.cobranca.duplicatas.length > 0) {
      const installmentsToInsert = parsedData.cobranca.duplicatas.map((dup, index) => ({
        organization_id,
        sale_id: sale.id,
        installment_number: index + 1,
        value: dup.valor || 0,
        due_date: dup.vencimento || null,
        status: 'pendente'
      }));

      const { error: installmentsError } = await supabase
        .from('installments')
        .insert(installmentsToInsert);

      if (installmentsError) {
        console.error('Error inserting installments:', installmentsError);
        // Don't fail the whole request, just log the error
      } else {
        installmentsInserted = installmentsToInsert.length;
        console.log(`Inserted ${installmentsInserted} installments for sale ${sale.id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sale,
        parsed: parsedData,
        inserted: true,
        installments_count: installmentsInserted
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error parsing NFe XML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
