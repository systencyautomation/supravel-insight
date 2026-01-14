import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IMAPTestRequest {
  host: string;
  port: number;
  user: string;
  password: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { host, port, user, password }: IMAPTestRequest = await req.json();

    console.log(`Testing IMAP connection to ${host}:${port} for user ${user}`);

    // Validate required fields
    if (!host || !port || !user || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Todos os campos são obrigatórios' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate port number
    if (port < 1 || port > 65535) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Porta inválida' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Try to establish a TLS connection to the IMAP server
    // This tests network connectivity and basic TLS handshake
    try {
      const conn = await Deno.connectTls({
        hostname: host,
        port: port,
      });

      // Read initial server greeting
      const buffer = new Uint8Array(1024);
      const bytesRead = await conn.read(buffer);
      
      if (bytesRead && bytesRead > 0) {
        const greeting = new TextDecoder().decode(buffer.subarray(0, bytesRead));
        console.log(`Server greeting: ${greeting.substring(0, 100)}`);
        
        // Check if it's a valid IMAP greeting
        if (greeting.includes('OK') || greeting.includes('IMAP')) {
          // Send LOGIN command
          const loginCommand = `A001 LOGIN "${user}" "${password}"\r\n`;
          await conn.write(new TextEncoder().encode(loginCommand));
          
          // Read login response
          const loginBuffer = new Uint8Array(1024);
          const loginBytesRead = await conn.read(loginBuffer);
          
          if (loginBytesRead && loginBytesRead > 0) {
            const loginResponse = new TextDecoder().decode(loginBuffer.subarray(0, loginBytesRead));
            console.log(`Login response: ${loginResponse.substring(0, 100)}`);
            
            // Send LOGOUT command
            await conn.write(new TextEncoder().encode("A002 LOGOUT\r\n"));
            
            // Close connection
            conn.close();
            
            if (loginResponse.includes('OK')) {
              console.log('IMAP authentication successful');
              return new Response(
                JSON.stringify({ 
                  success: true, 
                  message: 'Conexão e autenticação bem-sucedidas' 
                }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              );
            } else if (loginResponse.includes('NO') || loginResponse.includes('BAD')) {
              console.log('IMAP authentication failed');
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  error: 'Falha na autenticação. Verifique usuário e senha.' 
                }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              );
            }
          }
        }
      }
      
      conn.close();
      
      // If we got here, connection worked but response was unexpected
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Conexão estabelecida (resposta não verificada)' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
      
    } catch (connError) {
      console.error('Connection error:', connError);
      
      const errorMessage = connError instanceof Error ? connError.message : 'Erro desconhecido';
      
      if (errorMessage.includes('dns') || errorMessage.includes('resolve')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Host não encontrado. Verifique o endereço do servidor.' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (errorMessage.includes('connection refused')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Conexão recusada. Verifique host e porta.' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (errorMessage.includes('tls') || errorMessage.includes('ssl') || errorMessage.includes('certificate')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro de certificado SSL/TLS. O servidor pode não suportar conexão segura nesta porta.' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro de conexão: ${errorMessage}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in test-imap-connection:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
