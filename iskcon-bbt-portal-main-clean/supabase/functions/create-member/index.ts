import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Require Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authorized: Missing Authorization header.' }), { status: 401, headers: corsHeaders });
    }
    const jwt = authHeader.replace('Bearer ', '');

    // 2. Get user from JWT
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Not authorized: Invalid or expired token.' }), { status: 401, headers: corsHeaders });
    }
    const userId = userData.user.id;

    // 3. Check user role in user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    if (roleError || !roleData || !['admin', 'super_admin'].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Not authorized: Only admins can add members.' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { email, firstName, lastName, phone, role, password } = body;

    // Defensive checks for required fields
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!firstName || typeof firstName !== 'string') {
      return new Response(JSON.stringify({ error: 'First name is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!lastName || typeof lastName !== 'string') {
      return new Response(JSON.stringify({ error: 'Last name is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password is required and must be at least 6 characters.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Defensive: Check if user already exists in Auth
    const { data: existingUser, error: existingUserError } = await supabase.auth.admin.listUsers({ email });
    if (existingUserError) {
      console.error('Error checking existing user:', existingUserError);
      return new Response(JSON.stringify({ error: 'Failed to check for existing user.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (existingUser && existingUser.users && existingUser.users.length > 0) {
      return new Response(JSON.stringify({ error: 'A user with this email already exists in Auth.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Defensive: Check if profile already exists
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('id, email')
      .or(`email.eq.${email}`)
      .limit(1)
      .single();
    if (existingProfile) {
      return new Response(JSON.stringify({ error: 'A profile with this email already exists.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log all data being inserted
    console.log('Creating user with:', { email, firstName, lastName, phone, role });

    // 1. Create user in Supabase Auth
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // auto-confirm for admin-created users
    });
    if (userError || !newUser?.user?.id) {
      console.error('User creation failed:', userError);
      return new Response(JSON.stringify({ error: 'User creation failed', details: userError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = newUser.user.id;

    // 2. Insert into profiles
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
    });
    if (profileError) {
      console.error('Profile creation failed:', profileError);
      // Rollback: delete Auth user
      await supabase.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: 'Profile creation failed', details: profileError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Insert user role
    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: userId,
      role,
    });
    if (roleError) {
      console.error('Role creation failed:', roleError);
      // Rollback: delete profile and Auth user
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: 'Role creation failed', details: roleError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Confirm user if not already confirmed (should be auto-confirmed)
    // (Supabase admin.createUser with email_confirm: true should auto-confirm)

    // 5. Success
    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: err?.message || err }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 