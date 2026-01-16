import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateMemberRequest {
  email: string;
  password: string;
  fullName: string;
  role: "manager" | "seller" | "representative";
  organizationId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify permissions
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user: authUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authUser) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: CreateMemberRequest = await req.json();
    const { email, password, fullName, role, organizationId } = body;

    // Validate required fields
    if (!email || !password || !fullName || !role || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Formato de email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["manager", "seller", "representative"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: "Cargo inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user has permission (admin or manager) in the organization
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("organization_id", organizationId);

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar permissões" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasPermission = userRoles?.some(
      (r) => r.role === "admin" || r.role === "manager" || r.role === "super_admin"
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para criar membros nesta organização" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating user: ${email} with role: ${role} for org: ${organizationId}`);

    // Step 1: Create the user in Supabase Auth
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName.trim(),
      },
    });

    if (createUserError) {
      console.error("Error creating user:", createUserError);
      
      if (createUserError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Este email já está cadastrado" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário: " + createUserError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;
    console.log(`User created with ID: ${newUserId}`);

    // Step 2: Insert user role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUserId,
        role: role,
        organization_id: organizationId,
      });

    if (roleError) {
      console.error("Error inserting role:", roleError);
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Erro ao atribuir cargo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Create or update profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUserId,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Non-fatal, profile might be created by trigger
    }

    console.log(`Member created successfully: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUserId,
        message: "Membro criado com sucesso",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
