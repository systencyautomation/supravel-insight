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

// Interface para boletos enviados pelo n8n
interface BoletoInfo {
  valor: number;
  vencimento: string;  // formato: YYYY-MM-DD
  numero?: string;     // número do boleto (opcional)
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
    const { xml_content, organization_id, email_from, email_subject, filename, boletos, danfe_base64, boleto_base64 } = body;

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

    // Validar e processar boletos se enviados
    const boletosArray: BoletoInfo[] = Array.isArray(boletos) ? boletos : [];
    const usarBoletos = boletosArray.length > 0;
    
    let paymentMethod: string;
    let valorEntrada = 0;
    let somaBoletos = 0;
    let parcelasParaSalvar: BoletoInfo[] = [];
    let entradaCalculada: { 
      total_nf: number; 
      soma_boletos: number; 
      entrada: number;
      primeiro_boleto_e_entrada?: boolean;
      parcelas_count?: number;
    } | null = null;

    if (usarBoletos) {
      // === USAR BOLETOS COMO FONTE DE VERDADE ===
      console.log(`Processando ${boletosArray.length} boletos do e-mail`);
      
      const emissionDate = parsedData.nfe.emissao; // YYYY-MM-DD
      const primeiroBoleto = boletosArray[0];
      
      // Verificar se o primeiro boleto é a entrada
      // Critério: vencimento = data de emissão OU diferença <= 3 dias
      let primeiroBoletoeEntrada = false;
      
      if (primeiroBoleto && primeiroBoleto.vencimento && emissionDate) {
        const diffDias = Math.abs(
          (new Date(primeiroBoleto.vencimento).getTime() - new Date(emissionDate).getTime()) 
          / (1000 * 60 * 60 * 24)
        );
        primeiroBoletoeEntrada = diffDias <= 3; // Até 3 dias de diferença = é entrada
        
        console.log(`Primeiro boleto: venc=${primeiroBoleto.vencimento}, emissao=${emissionDate}, diff=${diffDias} dias, eEntrada=${primeiroBoletoeEntrada}`);
      }
      
      if (primeiroBoletoeEntrada) {
        // CENÁRIO 1: Primeiro boleto é a entrada
        valorEntrada = primeiroBoleto.valor || 0;
        parcelasParaSalvar = boletosArray.slice(1); // Remove primeiro (entrada)
        
        console.log(`Entrada identificada no boleto[0]: R$ ${valorEntrada}`);
        console.log(`Parcelas restantes: ${parcelasParaSalvar.length}`);
      } else {
        // CENÁRIO 2: Todos os boletos são parcelas
        const totalNf = parsedData.valores.total_nf || 0;
        somaBoletos = boletosArray.reduce((sum, b) => sum + (b.valor || 0), 0);
        valorEntrada = totalNf - somaBoletos;
        parcelasParaSalvar = boletosArray;
        
        if (valorEntrada < 0) valorEntrada = 0;
        
        console.log(`Entrada calculada: ${totalNf} - ${somaBoletos} = ${valorEntrada}`);
      }
      
      // Payment method baseado nas parcelas (sem a entrada)
      paymentMethod = parcelasParaSalvar.length > 1 ? 'parcelado_boleto' : 'a_vista';
      
      entradaCalculada = {
        total_nf: parsedData.valores.total_nf || 0,
        soma_boletos: boletosArray.reduce((sum, b) => sum + (b.valor || 0), 0),
        entrada: valorEntrada,
        primeiro_boleto_e_entrada: primeiroBoletoeEntrada,
        parcelas_count: parcelasParaSalvar.length
      };
      
      console.log('Entrada calculada:', entradaCalculada);
    } else {
      // === FALLBACK: USAR DADOS DO XML ===
      console.log('Nenhum boleto enviado, usando duplicatas do XML');
      
      paymentMethod = parsedData.pagamento.tipo 
        ? TIPOS_PAGAMENTO[parsedData.pagamento.tipo] || 'a_vista'
        : (parsedData.cobranca.duplicatas.length > 1 ? 'parcelado_boleto' : 'a_vista');

      // Valor entrada baseado na primeira duplicata do XML
      if (parsedData.cobranca.duplicatas.length > 0 && paymentMethod !== 'a_vista') {
        valorEntrada = parsedData.cobranca.duplicatas[0]?.valor || 0;
      }
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

    // === SAVE DOCUMENTS TO STORAGE ===
    const saveDocument = async (content: string, docType: 'xml' | 'danfe' | 'boleto', docFilename: string, isBase64: boolean) => {
      try {
        const storagePath = `${organization_id}/${sale.id}/${docFilename}`;
        const fileData = isBase64 ? Uint8Array.from(atob(content), c => c.charCodeAt(0)) : new TextEncoder().encode(content);
        const contentType = docType === 'xml' ? 'application/xml' : 'application/pdf';
        
        const { error: uploadError } = await supabase.storage
          .from('sale-documents')
          .upload(storagePath, fileData, { contentType, upsert: true });

        if (uploadError) {
          console.error(`Error uploading ${docType}:`, uploadError);
          return;
        }

        await supabase.from('sale_documents').insert({
          organization_id,
          sale_id: sale.id,
          document_type: docType,
          filename: docFilename,
          storage_path: storagePath,
          file_size: fileData.length,
        });

        console.log(`Saved ${docType} document: ${storagePath}`);
      } catch (e) {
        console.error(`Error saving ${docType} document:`, e);
      }
    };

    // Save XML
    if (xml_content) {
      const xmlFilename = filename || `nfe_${parsedData.nfe.numero || 'unknown'}.xml`;
      await saveDocument(xml_content, 'xml', xmlFilename, false);
    }

    // Save DANFE PDF
    if (danfe_base64) {
      await saveDocument(danfe_base64, 'danfe', `danfe_${parsedData.nfe.numero || 'unknown'}.pdf`, true);
    }

    // Save Boleto PDF
    if (boleto_base64) {
      await saveDocument(boleto_base64, 'boleto', `boleto_${parsedData.nfe.numero || 'unknown'}.pdf`, true);
    }

    // Insert installments - usar boletos ou duplicatas do XML
    let installmentsInserted = 0;
    
    if (usarBoletos) {
      // === USAR parcelasParaSalvar (SEM A ENTRADA) ===
      const installmentsToInsert = parcelasParaSalvar.map((boleto, index) => ({
        organization_id,
        sale_id: sale.id,
        installment_number: index + 1,  // Começa em 1
        value: boleto.valor || 0,
        due_date: boleto.vencimento || null,
        status: 'pendente'
      }));

      const { error: installmentsError } = await supabase
        .from('installments')
        .insert(installmentsToInsert);

      if (installmentsError) {
        console.error('Error inserting installments from boletos:', installmentsError);
      } else {
        installmentsInserted = installmentsToInsert.length;
        console.log(`Inserted ${installmentsInserted} installments (sem entrada) for sale ${sale.id}`);
      }
    } else if (parsedData.cobranca.duplicatas.length > 0) {
      // === FALLBACK: USAR DUPLICATAS DO XML ===
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
        console.error('Error inserting installments from XML:', installmentsError);
      } else {
        installmentsInserted = installmentsToInsert.length;
        console.log(`Inserted ${installmentsInserted} installments from XML for sale ${sale.id}`);
      }
    }

    // === IF BOLETO PDF WAS SENT AND NO BOLETOS ARRAY, USE AI EXTRACTION ===
    if (boleto_base64 && !usarBoletos) {
      console.log('Boleto PDF received without boletos array, calling extract-boleto-pdf...');
      try {
        const extractResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/extract-boleto-pdf`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              boleto_base64,
              organization_id,
              sale_id: sale.id,
              emission_date: parsedData.nfe.emissao,
            }),
          }
        );

        const extractResult = await extractResponse.json();
        console.log('Boleto extraction result:', JSON.stringify(extractResult, null, 2));
        
        if (extractResult.success && extractResult.installments_inserted > 0) {
          installmentsInserted = extractResult.installments_inserted;
          valorEntrada = extractResult.valor_entrada || valorEntrada;
        }
      } catch (extractError) {
        console.error('Error calling extract-boleto-pdf:', extractError);
      }
    }

    // === PRE-CALCULATION: FIPE MATCH + COMMISSION CALCULATION ===
    let aiPreCalculated = false;
    try {
      console.log('Starting pre-calculation for sale', sale.id);

      // 1. Fetch FIPE documents for the organization
      const { data: fipeDocs } = await supabase
        .from('fipe_documents')
        .select('rows, headers')
        .eq('organization_id', organization_id)
        .order('uploaded_at', { ascending: false })
        .limit(1);

      if (fipeDocs && fipeDocs.length > 0) {
        const fipeDoc = fipeDocs[0];
        const gridData = fipeDoc.rows as any[][];

        const codigoParaBusca = parsedData.produto.modelo || parsedData.produto.codigo;
        console.log('FIPE lookup code:', codigoParaBusca);

        if (codigoParaBusca && gridData && gridData.length >= 4) {
          // Find header row with "Cod. Interno"
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

          if (headerRowIndex >= 0 && codIndex >= 0) {
            const headerRow = gridData[headerRowIndex];

            // Find column indices
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

            // Extract prefix for flexible matching
            const productCode = String(codigoParaBusca).trim();
            const prefixMatch = productCode.match(/^([A-Za-z0-9]+)/);
            const codePrefix = prefixMatch ? prefixMatch[1] : productCode;

            const parseValue = (row: any[], idx: number) => {
              if (idx < 0) return 0;
              return parseFloat(String(row[idx]?.value || row[idx] || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
            };

            // Search for matching product
            let matchData: { valorTabela: number; icmsTabela: number; comissao: number } | null = null;

            for (let i = headerRowIndex + 1; i < gridData.length; i++) {
              const row = gridData[i];
              if (!row) continue;
              const cellValue = String(row[codIndex]?.value || row[codIndex] || '').trim();
              if (!cellValue) continue;

              const isMatch = cellValue === productCode
                || cellValue === codePrefix
                || cellValue.toUpperCase().startsWith(codePrefix.toUpperCase())
                || productCode.toUpperCase().startsWith(cellValue.toUpperCase());

              if (isMatch) {
                const v4 = parseValue(row, valor4Index);
                const v7 = parseValue(row, valor7Index);
                const v12 = parseValue(row, valor12Index);
                const com = parseValue(row, comissaoIndex);

                if (v4 > 0) matchData = { valorTabela: v4, icmsTabela: 4, comissao: com };
                else if (v7 > 0) matchData = { valorTabela: v7, icmsTabela: 7, comissao: com };
                else if (v12 > 0) matchData = { valorTabela: v12, icmsTabela: 12, comissao: com };

                if (cellValue === productCode) break; // exact match, stop
                if (matchData) break;
              }
            }

            if (matchData && matchData.valorTabela > 0) {
              console.log('FIPE match found:', matchData);

              // 2. Calculate ICMS rates
              const ICMS_RATES: Record<string, number> = {
                AC:0.07,AL:0.07,AM:0.07,AP:0.07,BA:0.07,CE:0.07,DF:0.07,ES:0.07,
                GO:0.07,MA:0.07,MT:0.07,MS:0.07,PA:0.07,PB:0.07,PE:0.07,PI:0.07,
                RN:0.07,RO:0.07,RR:0.07,SE:0.07,TO:0.07,
                MG:0.12,PR:0.12,RJ:0.12,RS:0.12,SC:0.12,SP:0.12,
                IMPORTADO:0.04,
              };
              const ufDest = parsedData.destinatario.uf?.toUpperCase() || '';
              const icmsDestino = ICMS_RATES[ufDest] ?? 0.04;
              const icmsOrigem = matchData.icmsTabela / 100;

              // 3. Calculate Valor Real (VP) from installments
              const TAXA_BOLETO = 0.022;
              const totalNf = parsedData.valores.total_nf || 0;
              let calculatedValorReal = totalNf;

              // Get installments that were just inserted
              const { data: savedInstallments } = await supabase
                .from('installments')
                .select('value, installment_number')
                .eq('sale_id', sale.id)
                .order('installment_number', { ascending: true });

              if (savedInstallments && savedInstallments.length > 0 && paymentMethod !== 'a_vista') {
                const vpParcela = savedInstallments[0]?.value || 0;
                const nParcelas = savedInstallments.length;
                if (nParcelas > 0 && TAXA_BOLETO > 0) {
                  const fatorVP = (1 - Math.pow(1 + TAXA_BOLETO, -nParcelas)) / TAXA_BOLETO;
                  calculatedValorReal = valorEntrada + (vpParcela * fatorVP);
                }
              }

              // 4. Calculate commission (cascade deductions)
              let valorTabelaAjustado = matchData.valorTabela;
              if (Math.abs(icmsOrigem - icmsDestino) > 0.001 && icmsOrigem > 0) {
                valorTabelaAjustado = matchData.valorTabela / (1 - icmsOrigem) * (1 - icmsDestino);
              }

              const overPrice = calculatedValorReal - valorTabelaAjustado;
              let deducaoIcms = 0, deducaoPisCofins = 0, deducaoIrCsll = 0, overLiquido = 0;

              if (overPrice > 0) {
                deducaoIcms = overPrice * icmsDestino;
                const sub1 = overPrice - deducaoIcms;
                deducaoPisCofins = sub1 * 0.0925;
                const sub2 = sub1 - deducaoPisCofins;
                deducaoIrCsll = sub2 * 0.34;
                overLiquido = sub2 - deducaoIrCsll;
              } else {
                overLiquido = overPrice;
              }

              const comissaoPedido = (matchData.comissao / 100) * matchData.valorTabela;
              const comissaoTotal = comissaoPedido + overLiquido;
              const percentualFinal = totalNf > 0 ? (comissaoTotal / totalNf) * 100 : 0;

              console.log('Pre-calc result:', { overPrice, overLiquido, comissaoTotal, percentualFinal });

              // 5. Update sale with pre-calculated values
              const { error: updateError } = await supabase
                .from('sales')
                .update({
                  table_value: matchData.valorTabela,
                  percentual_comissao: matchData.comissao,
                  icms_tabela: matchData.icmsTabela,
                  percentual_icms: icmsDestino * 100,
                  over_price: overPrice,
                  over_price_liquido: overLiquido,
                  icms: deducaoIcms,
                  pis_cofins: deducaoPisCofins,
                  ir_csll: deducaoIrCsll,
                  commission_calculated: comissaoTotal,
                  ai_pre_calculated: true,
                })
                .eq('id', sale.id);

              if (updateError) {
                console.error('Error updating sale with pre-calc:', updateError);
              } else {
                aiPreCalculated = true;
                console.log('Sale pre-calculated successfully');
              }
            } else {
              console.log('No FIPE match found for code:', codigoParaBusca);
            }
          } else {
            console.log('FIPE header row not found');
          }
        } else {
          console.log('No product code available for FIPE lookup');
        }
      } else {
        console.log('No FIPE document found for organization');
      }
    } catch (preCalcError) {
      console.error('Pre-calculation error (non-fatal):', preCalcError);
    }

    // Resposta com informações sobre a fonte dos dados
    const response: Record<string, unknown> = { 
      success: true, 
      sale,
      parsed: parsedData,
      inserted: true,
      installments_count: installmentsInserted,
      boletos_source: usarBoletos,
      ai_pre_calculated: aiPreCalculated,
    };

    // Adicionar detalhes do cálculo se boletos foram usados
    if (entradaCalculada) {
      response.entrada_calculada = entradaCalculada;
    }

    return new Response(
      JSON.stringify(response),
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
