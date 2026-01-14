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
  'email_verification_codes'
];

interface GatewayRequest {
  action: 'select' | 'insert' | 'update' | 'delete';
  table: string;
  data?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  select?: string;
  limit?: number;
  order?: { column: string; ascending?: boolean };
}

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
    const { action, table, data, filters, select = '*', limit, order } = body;

    console.log(`n8n-gateway: ${action} on ${table}`, { filters, dataKeys: data ? Object.keys(data) : null });

    // Validar tabela
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Table '${table}' is not allowed. Allowed tables: ${ALLOWED_TABLES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar action
    if (!['select', 'insert', 'update', 'delete'].includes(action)) {
      return new Response(
        JSON.stringify({ error: `Invalid action '${action}'. Allowed: select, insert, update, delete` }),
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
