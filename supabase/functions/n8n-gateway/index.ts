import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Tabelas permitidas para acesso
const ALLOWED_TABLES = [
  'organizations',
  'profiles',
  'user_roles',
  'invitations',
  'member_invitations',
  'sales',
  'installments',
  'inventory',
  'email_verification_codes',
  'email_processing_log'
];

interface GatewayRequest {
  action: 'select' | 'insert' | 'update' | 'delete' | 'fetch_emails';
  table?: string;
  data?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  select?: string;
  limit?: number;
  order?: { column: string; ascending?: boolean };
  // Para fetch_emails
  organization_id?: string;
  options?: FetchEmailsOptions;
}

interface FetchEmailsOptions {
  folder?: string;
  search?: string;
  limit?: number;
  mark_as_read?: boolean;
  allowed_domains?: string[];
  save_log?: boolean;
}

interface EmailResult {
  uid: string;
  from: string;
  subject: string;
  date: string;
  status: 'processed' | 'skipped' | 'error';
  reason?: string;
  has_xml: boolean;
  xmls: XmlAttachment[];
}

interface XmlAttachment {
  filename: string;
  content: string;
  nfe_key: string | null;
  size_bytes: number;
}

// ============================================
// IMAP Helper Functions
// ============================================

function extractEmailDomain(email: string): string {
  const match = email.match(/<([^>]+)>/) || [null, email];
  const addr = match[1] || email;
  const domain = addr.split('@')[1]?.toLowerCase().trim();
  return domain || '';
}

function isDomainAllowed(email: string, allowedDomains: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0) return true;
  
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  
  return allowedDomains.some(d => {
    const allowed = d.toLowerCase().trim();
    return domain === allowed || domain.endsWith('.' + allowed);
  });
}

function decodeBase64(encoded: string): string {
  try {
    const cleaned = encoded.replace(/\r?\n/g, '');
    const binary = atob(cleaned);
    return binary;
  } catch {
    return '';
  }
}

function decodeQuotedPrintable(encoded: string): string {
  try {
    return encoded
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => 
        String.fromCharCode(parseInt(hex, 16))
      );
  } catch {
    return encoded;
  }
}

function parseHeaders(headerBlock: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = headerBlock.split(/\r?\n/);
  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    if (line.match(/^\s+/) && currentKey) {
      currentValue += ' ' + line.trim();
    } else {
      if (currentKey) {
        headers[currentKey.toLowerCase()] = currentValue;
      }
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        currentKey = line.substring(0, colonIndex).trim();
        currentValue = line.substring(colonIndex + 1).trim();
      }
    }
  }
  if (currentKey) {
    headers[currentKey.toLowerCase()] = currentValue;
  }
  return headers;
}

function extractNfeKey(xmlContent: string): string | null {
  // Buscar chave de acesso em diferentes formatos
  const patterns = [
    /<chNFe>(\d{44})<\/chNFe>/,
    /<infNFe[^>]*Id="NFe(\d{44})"/,
    /Id="NFe(\d{44})"/
  ];
  
  for (const pattern of patterns) {
    const match = xmlContent.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function isNfeXml(content: string): boolean {
  const nfePatterns = [
    /<nfeProc/i,
    /<NFe/i,
    /<infNFe/i,
    /<procNFe/i
  ];
  return nfePatterns.some(p => p.test(content));
}

function parseMimeParts(body: string, boundary: string): XmlAttachment[] {
  const xmls: XmlAttachment[] = [];
  const parts = body.split('--' + boundary);

  for (const part of parts) {
    if (part.trim() === '' || part.trim() === '--') continue;

    const [headerSection, ...bodyParts] = part.split(/\r?\n\r?\n/);
    const headers = parseHeaders(headerSection);
    const partBody = bodyParts.join('\n\n');

    const contentType = headers['content-type'] || '';
    const contentDisposition = headers['content-disposition'] || '';
    const encoding = headers['content-transfer-encoding'] || '';

    // Verificar se é XML
    const isXml = contentType.includes('xml') || 
                  contentDisposition.includes('.xml') ||
                  contentType.includes('application/octet-stream');

    if (!isXml && !contentDisposition.includes('.xml')) continue;

    // Extrair nome do arquivo
    let filename = 'attachment.xml';
    const filenameMatch = contentDisposition.match(/filename[*]?=["']?([^"';\r\n]+)/i);
    if (filenameMatch) {
      filename = filenameMatch[1].replace(/["']/g, '');
    }

    // Decodificar conteúdo
    let content = partBody.trim();
    if (encoding.toLowerCase().includes('base64')) {
      content = decodeBase64(content);
    } else if (encoding.toLowerCase().includes('quoted-printable')) {
      content = decodeQuotedPrintable(content);
    }

    // Verificar se é XML de NF-e
    if (content && isNfeXml(content)) {
      xmls.push({
        filename,
        content,
        nfe_key: extractNfeKey(content),
        size_bytes: content.length
      });
    }
  }

  return xmls;
}

function parseEmailForXmls(rawEmail: string): XmlAttachment[] {
  const xmls: XmlAttachment[] = [];

  // Separar headers do body
  const headerBodySplit = rawEmail.split(/\r?\n\r?\n/);
  const headerBlock = headerBodySplit[0];
  const body = headerBodySplit.slice(1).join('\n\n');

  const headers = parseHeaders(headerBlock);
  const contentType = headers['content-type'] || '';

  // Verificar se é multipart
  const boundaryMatch = contentType.match(/boundary=["']?([^"';\s]+)/i);
  
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    return parseMimeParts(body, boundary);
  }

  // Email simples (não multipart) - verificar se o corpo é XML
  if (contentType.includes('xml') && isNfeXml(body)) {
    xmls.push({
      filename: 'email_body.xml',
      content: body,
      nfe_key: extractNfeKey(body),
      size_bytes: body.length
    });
  }

  return xmls;
}

async function readImapResponse(reader: ReadableStreamDefaultReader<Uint8Array>, timeout = 30000): Promise<string> {
  const decoder = new TextDecoder();
  let response = '';
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const { value, done } = await reader.read();
    if (done) break;
    
    response += decoder.decode(value, { stream: true });
    
    // Verificar se temos uma resposta completa
    if (response.includes('\r\n') && 
        (response.includes('OK') || response.includes('NO') || response.includes('BAD'))) {
      break;
    }
  }

  return response;
}

async function sendImapCommand(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  tag: string,
  command: string
): Promise<string> {
  const encoder = new TextEncoder();
  const fullCommand = `${tag} ${command}\r\n`;
  await writer.write(encoder.encode(fullCommand));
  
  let response = '';
  const timeout = 30000;
  const startTime = Date.now();
  const decoder = new TextDecoder();

  while (Date.now() - startTime < timeout) {
    const { value, done } = await reader.read();
    if (done) break;
    
    response += decoder.decode(value, { stream: true });
    
    // Verificar se temos resposta completa do tag
    if (response.includes(`${tag} OK`) || 
        response.includes(`${tag} NO`) || 
        response.includes(`${tag} BAD`)) {
      break;
    }
  }

  return response;
}

// ============================================
// Fetch Emails Action
// ============================================

interface OrganizationImap {
  id: string;
  name: string;
  imap_host: string | null;
  imap_port: number | null;
  imap_user: string | null;
  imap_password: string | null;
  imap_allowed_domains: string[] | null;
}

// deno-lint-ignore no-explicit-any
async function handleFetchEmails(
  supabase: any,
  organizationId: string,
  options: FetchEmailsOptions
): Promise<{
  success: boolean;
  organization_id: string;
  summary: { total_emails: number; processed: number; skipped: number; xmls_extracted: number };
  emails: EmailResult[];
  error?: string;
}> {
  const {
    folder = 'INBOX',
    search = 'UNSEEN',
    limit = 50,
    mark_as_read = true,
    allowed_domains,
    save_log = true
  } = options;

  const emails: EmailResult[] = [];
  const summary = { total_emails: 0, processed: 0, skipped: 0, xmls_extracted: 0 };

  // 1. Buscar credenciais da organização
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, imap_host, imap_port, imap_user, imap_password, imap_allowed_domains')
    .eq('id', organizationId)
    .single();

  const org = orgData as OrganizationImap | null;

  if (orgError || !org) {
    return {
      success: false,
      organization_id: organizationId,
      summary,
      emails,
      error: `Organization not found: ${orgError?.message || 'Unknown error'}`
    };
  }

  if (!org.imap_host || !org.imap_user || !org.imap_password) {
    return {
      success: false,
      organization_id: organizationId,
      summary,
      emails,
      error: 'IMAP credentials not configured for this organization'
    };
  }

  // Usar domínios permitidos do request ou do banco
  const effectiveAllowedDomains = allowed_domains || org.imap_allowed_domains || [];

  console.log(`fetch_emails: Connecting to ${org.imap_host}:${org.imap_port} for org ${org.name}`);

  let conn: Deno.TlsConn | null = null;

  try {
    // 2. Conectar ao servidor IMAP
    conn = await Deno.connectTls({
      hostname: org.imap_host,
      port: org.imap_port || 993,
    });

    const reader = conn.readable.getReader();
    const writer = conn.writable.getWriter();

    // Ler greeting
    await readImapResponse(reader, 5000);

    // 3. Login
    let tagNum = 1;
    const loginResp = await sendImapCommand(writer, reader, `A${tagNum++}`, 
      `LOGIN "${org.imap_user}" "${org.imap_password}"`);
    
    if (!loginResp.includes('OK')) {
      throw new Error('IMAP authentication failed');
    }

    // 4. Selecionar pasta
    const selectResp = await sendImapCommand(writer, reader, `A${tagNum++}`, `SELECT ${folder}`);
    if (!selectResp.includes('OK')) {
      throw new Error(`Failed to select folder: ${folder}`);
    }

    // 5. Buscar emails
    const searchResp = await sendImapCommand(writer, reader, `A${tagNum++}`, `SEARCH ${search}`);
    
    // Extrair UIDs da resposta
    const searchMatch = searchResp.match(/\* SEARCH([\d\s]*)/);
    const uids = searchMatch && searchMatch[1] 
      ? searchMatch[1].trim().split(/\s+/).filter(u => u).slice(0, limit)
      : [];

    summary.total_emails = uids.length;
    console.log(`fetch_emails: Found ${uids.length} emails matching "${search}"`);

    // 6. Processar cada email
    for (const uid of uids) {
      const emailResult: EmailResult = {
        uid,
        from: '',
        subject: '',
        date: '',
        status: 'processed',
        has_xml: false,
        xmls: []
      };

      try {
        // Verificar se já foi processado
        if (save_log) {
          const { data: existingLog } = await supabase
            .from('email_processing_log')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('email_uid', uid)
            .maybeSingle();

          if (existingLog) {
            emailResult.status = 'skipped';
            emailResult.reason = 'already_processed';
            emails.push(emailResult);
            summary.skipped++;
            continue;
          }
        }

        // Buscar headers primeiro para validar domínio
        const headerResp = await sendImapCommand(writer, reader, `A${tagNum++}`, 
          `FETCH ${uid} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])`);

        // Extrair headers
        const fromMatch = headerResp.match(/From:\s*([^\r\n]+)/i);
        const subjectMatch = headerResp.match(/Subject:\s*([^\r\n]+)/i);
        const dateMatch = headerResp.match(/Date:\s*([^\r\n]+)/i);

        emailResult.from = fromMatch ? fromMatch[1].trim() : '';
        emailResult.subject = subjectMatch ? subjectMatch[1].trim() : '';
        emailResult.date = dateMatch ? dateMatch[1].trim() : '';

        // Verificar domínio
        if (!isDomainAllowed(emailResult.from, effectiveAllowedDomains)) {
          emailResult.status = 'skipped';
          emailResult.reason = 'domain_not_allowed';
          emails.push(emailResult);
          summary.skipped++;

          if (save_log) {
            await supabase.from('email_processing_log').insert({
              organization_id: organizationId,
              email_uid: uid,
              email_from: emailResult.from,
              email_subject: emailResult.subject,
              status: 'skipped',
              reason: 'domain_not_allowed'
            });
          }
          continue;
        }

        // Buscar email completo
        const fetchResp = await sendImapCommand(writer, reader, `A${tagNum++}`, 
          `FETCH ${uid} BODY[]`);

        // Parsear email e extrair XMLs
        const xmls = parseEmailForXmls(fetchResp);
        emailResult.xmls = xmls;
        emailResult.has_xml = xmls.length > 0;

        if (xmls.length === 0) {
          emailResult.status = 'skipped';
          emailResult.reason = 'no_xml_found';
          summary.skipped++;
        } else {
          emailResult.status = 'processed';
          summary.processed++;
          summary.xmls_extracted += xmls.length;

          // Marcar como lido se configurado
          if (mark_as_read) {
            await sendImapCommand(writer, reader, `A${tagNum++}`, 
              `STORE ${uid} +FLAGS (\\Seen)`);
          }
        }

        // Salvar log
        if (save_log) {
          await supabase.from('email_processing_log').insert({
            organization_id: organizationId,
            email_uid: uid,
            email_from: emailResult.from,
            email_subject: emailResult.subject,
            status: emailResult.status,
            reason: emailResult.reason,
            nfe_keys: xmls.map(x => x.nfe_key).filter(Boolean),
            xmls_count: xmls.length
          });
        }

        emails.push(emailResult);

      } catch (emailError) {
        console.error(`fetch_emails: Error processing email ${uid}:`, emailError);
        emailResult.status = 'error';
        emailResult.reason = emailError instanceof Error ? emailError.message : 'Unknown error';
        emails.push(emailResult);
        summary.skipped++;

        if (save_log) {
          await supabase.from('email_processing_log').insert({
            organization_id: organizationId,
            email_uid: uid,
            email_from: emailResult.from,
            email_subject: emailResult.subject,
            status: 'error',
            reason: emailResult.reason
          });
        }
      }
    }

    // 7. Logout
    await sendImapCommand(writer, reader, `A${tagNum++}`, 'LOGOUT');

    console.log(`fetch_emails: Completed - processed ${summary.processed}, skipped ${summary.skipped}, extracted ${summary.xmls_extracted} XMLs`);

    return {
      success: true,
      organization_id: organizationId,
      summary,
      emails
    };

  } catch (error) {
    console.error('fetch_emails error:', error);
    return {
      success: false,
      organization_id: organizationId,
      summary,
      emails,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    if (conn) {
      try {
        conn.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar API Key
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('N8N_API_KEY');

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase com Service Role Key (acesso total)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parsear body
    const body: GatewayRequest = await req.json();
    const { action, table, data, filters, select = '*', limit, order, organization_id, options } = body;

    console.log(`n8n-gateway: ${action} on ${table || organization_id}`, { 
      filters, 
      dataKeys: data ? Object.keys(data) : null,
      options: options ? Object.keys(options) : null
    });

    // ============================================
    // Handle fetch_emails action
    // ============================================
    if (action === 'fetch_emails') {
      if (!organization_id) {
        return new Response(
          JSON.stringify({ error: 'organization_id is required for fetch_emails action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await handleFetchEmails(supabase, organization_id, options || {});
      
      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // ============================================
    // Handle CRUD actions
    // ============================================
    
    // Validar tabela
    if (!table || !ALLOWED_TABLES.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Table '${table}' is not allowed. Allowed tables: ${ALLOWED_TABLES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar action
    if (!['select', 'insert', 'update', 'delete'].includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action '${action}'. Allowed: select, insert, update, delete, fetch_emails` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'select': {
        let query = supabase.from(table).select(select);
        
        // Aplicar filtros
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (value === null) {
              query = query.is(key, null);
            } else if (typeof value === 'object' && value !== null) {
              // Suporte a operadores especiais
              const filterObj = value as Record<string, unknown>;
              if ('gt' in filterObj) query = query.gt(key, filterObj.gt);
              if ('gte' in filterObj) query = query.gte(key, filterObj.gte);
              if ('lt' in filterObj) query = query.lt(key, filterObj.lt);
              if ('lte' in filterObj) query = query.lte(key, filterObj.lte);
              if ('neq' in filterObj) query = query.neq(key, filterObj.neq);
              if ('like' in filterObj) query = query.like(key, filterObj.like as string);
              if ('ilike' in filterObj) query = query.ilike(key, filterObj.ilike as string);
              if ('in' in filterObj) query = query.in(key, filterObj.in as unknown[]);
            } else {
              query = query.eq(key, value);
            }
          }
        }

        // Aplicar ordenação
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        }

        // Aplicar limite
        if (limit) {
          query = query.limit(limit);
        }

        result = await query;
        break;
      }

      case 'insert': {
        if (!data) {
          return new Response(
            JSON.stringify({ error: 'Data is required for insert action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await supabase.from(table).insert(data).select();
        break;
      }

      case 'update': {
        if (!data) {
          return new Response(
            JSON.stringify({ error: 'Data is required for update action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!filters || Object.keys(filters).length === 0) {
          return new Response(
            JSON.stringify({ error: 'Filters are required for update action to prevent accidental mass updates' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        let query = supabase.from(table).update(data);
        for (const [key, value] of Object.entries(filters)) {
          if (value === null) {
            query = query.is(key, null);
          } else {
            query = query.eq(key, value);
          }
        }
        result = await query.select();
        break;
      }

      case 'delete': {
        if (!filters || Object.keys(filters).length === 0) {
          return new Response(
            JSON.stringify({ error: 'Filters are required for delete action to prevent accidental mass deletion' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        let query = supabase.from(table).delete();
        for (const [key, value] of Object.entries(filters)) {
          if (value === null) {
            query = query.is(key, null);
          } else {
            query = query.eq(key, value);
          }
        }
        result = await query.select();
        break;
      }
    }

    if (result.error) {
      console.error('Supabase error:', result.error);
      return new Response(
        JSON.stringify({ error: result.error.message, details: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`n8n-gateway: Success - ${result.data?.length ?? 0} records`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result.data,
        count: result.data?.length ?? 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('n8n-gateway error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
