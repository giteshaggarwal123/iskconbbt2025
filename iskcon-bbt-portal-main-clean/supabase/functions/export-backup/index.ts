// @ts-expect-error Deno runtime import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Check for required env vars
  // @ts-expect-error Deno global
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-expect-error Deno global
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: 'Supabase environment variables not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // @ts-expect-error Deno dynamic import
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    )

    // Authenticate user (for now, allow any logged-in user)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Fetch all critical tables
    const tables = [
      'profiles',
      'meetings',
      'meeting_attendees',
      'documents',
      'folders',
      'polls',
      'poll_options',
      'poll_responses',
      'notifications',
      // Add more as needed
    ];
    const backup: Record<string, any> = {};
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        backup[table] = { error: error.message };
      } else {
        backup[table] = data;
      }
    }

    // Return as downloadable JSON
    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="iskcon-portal-backup.json"',
      },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 