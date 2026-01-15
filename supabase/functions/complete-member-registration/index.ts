import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegistrationRequest {
  email: string;
  password: string;
  fullName: string;
  invitation_id: string;
  code: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName, invitation_id, code } = await req.json() as RegistrationRequest;

    console.log('Starting member registration for:', email);

    // Validate required fields
    if (!email || !password || !fullName || !invitation_id || !code) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Todos os campos são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Step 1: Verify the OTP code
    console.log('Verifying OTP code...');
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('invitation_id', invitation_id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (codeError || !codeData) {
      console.error('Invalid or expired code:', codeError);
      return new Response(
        JSON.stringify({ error: 'Código inválido ou expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark code as used
    await supabaseAdmin
      .from('email_verification_codes')
      .update({ used: true })
      .eq('id', codeData.id);

    // Step 2: Get the invitation details
    console.log('Fetching invitation details...');
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('member_invitations')
      .select('*')
      .eq('id', invitation_id)
      .eq('status', 'pendente')
      .single();

    if (invitationError || !invitation) {
      console.error('Invitation not found or already used:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Convite não encontrado ou já utilizado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Create the user using Admin API
    console.log('Creating user account...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      }
    });

    if (authError || !authData.user) {
      console.error('Error creating user:', authError);
      
      // Check if user already exists
      if (authError?.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado. Faça login.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao criar conta: ' + (authError?.message || 'Erro desconhecido') }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log('User created with ID:', userId);

    // Step 4: Insert the user role
    console.log('Assigning role:', invitation.role);
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: invitation.role,
        organization_id: invitation.organization_id
      });

    if (roleError) {
      console.error('Error inserting role:', roleError);
      // Don't fail the registration, but log the error
    }

    // Step 5: Update invitation status
    console.log('Updating invitation status...');
    const { error: updateError } = await supabaseAdmin
      .from('member_invitations')
      .update({ status: 'aceito' })
      .eq('id', invitation_id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
    }

    // Step 6: Create/update profile
    console.log('Creating profile...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName,
        email: email
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    console.log('Registration completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cadastro realizado com sucesso',
        user_id: userId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
