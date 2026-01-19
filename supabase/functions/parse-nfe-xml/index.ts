import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductInfo {
  codigo: string | null;
  descricao: string | null;
  marca: string | null;
  modelo: string | null; // Código FIPE
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

interface ParsedNfe {
  produto: ProductInfo;
  nfe: NfeInfo;
  emitente: EmitenteInfo;
  destinatario: DestinatarioInfo;
  valores: ValoresInfo;
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

  // Normalizar quebras de linha e espaços extras
  const normalized = infAdProd.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ');

  // Extrair Marca (vários formatos)
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

  // Extrair Modelo (este é o código FIPE!)
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

  // Extrair Número de Série (vários formatos)
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

function parseNfeXml(xmlContent: string): ParsedNfe {
  // Extract product info
  const cProd = extractTag(xmlContent, 'cProd');
  const xProd = extractTag(xmlContent, 'xProd');
  const ncm = extractTag(xmlContent, 'NCM');
  const cfop = extractTag(xmlContent, 'CFOP');
  const uCom = extractTag(xmlContent, 'uCom');
  const qCom = extractNumber(xmlContent, 'qCom');
  const vUnCom = extractNumber(xmlContent, 'vUnCom');
  const vProd = extractNumber(xmlContent, 'vProd');

  // Extract infAdProd (additional product info)
  const infAdProdMatch = xmlContent.match(/<infAdProd>([\s\S]*?)<\/infAdProd>/i);
  const infAdProdContent = infAdProdMatch ? infAdProdMatch[1] : '';
  const { marca, modelo, numeroSerie } = extractInfAdProd(infAdProdContent);

  // Extract NFe info
  const chNFe = extractTag(xmlContent, 'chNFe');
  const nNF = extractTag(xmlContent, 'nNF');
  const serie = extractTag(xmlContent, 'serie');
  const mod = extractTag(xmlContent, 'mod');
  const dhEmi = extractTag(xmlContent, 'dhEmi');
  const emissaoDate = dhEmi ? dhEmi.split('T')[0] : null;

  // Extract emitente info
  const emitMatch = xmlContent.match(/<emit>([\s\S]*?)<\/emit>/i);
  const emitContent = emitMatch ? emitMatch[1] : '';
  const emitCnpj = extractTag(emitContent, 'CNPJ');
  const emitNome = extractTag(emitContent, 'xNome');
  
  // UF do emitente (dentro de enderEmit)
  const enderEmitMatch = emitContent.match(/<enderEmit>([\s\S]*?)<\/enderEmit>/i);
  const enderEmitContent = enderEmitMatch ? enderEmitMatch[1] : '';
  const emitUf = extractTag(enderEmitContent, 'UF');

  // Extract destinatario info
  const destMatch = xmlContent.match(/<dest>([\s\S]*?)<\/dest>/i);
  const destContent = destMatch ? destMatch[1] : '';
  const destCnpj = extractTag(destContent, 'CNPJ') || extractTag(destContent, 'CPF');
  const destNome = extractTag(destContent, 'xNome');
  
  // UF do destinatário (dentro de enderDest)
  const enderDestMatch = destContent.match(/<enderDest>([\s\S]*?)<\/enderDest>/i);
  const enderDestContent = enderDestMatch ? enderDestMatch[1] : '';
  const destUf = extractTag(enderDestContent, 'UF');

  // Extract valores
  const totalMatch = xmlContent.match(/<total>([\s\S]*?)<\/total>/i);
  const totalContent = totalMatch ? totalMatch[1] : '';
  const icmsTotMatch = totalContent.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/i);
  const icmsTotContent = icmsTotMatch ? icmsTotMatch[1] : '';
  
  const vProdTotal = extractNumber(icmsTotContent, 'vProd');
  const vNF = extractNumber(icmsTotContent, 'vNF');
  const vIPI = extractNumber(icmsTotContent, 'vIPI');

  return {
    produto: {
      codigo: cProd,
      descricao: xProd,
      marca,
      modelo, // Código FIPE
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
  };
}

serve(async (req) => {
  // Handle CORS preflight
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
    const { xml_content } = body;

    if (!xml_content || typeof xml_content !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'xml_content is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedData = parseNfeXml(xml_content);

    console.log('Parsed NFe data:', JSON.stringify(parsedData, null, 2));

    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
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
