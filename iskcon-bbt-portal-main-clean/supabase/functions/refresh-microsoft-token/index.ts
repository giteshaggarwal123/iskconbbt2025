
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting store
const rateLimitStore = new Map<string, { count: number, resetTime: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const key = `refresh_${userId}`;
  const limit = rateLimitStore.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 5 * 60 * 1000 });
    return false;
  }
  
  if (limit.count >= 10) { // Max 10 refresh attempts per 5 minutes
    return true;
  }
  
  limit.count++;
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Microsoft token refresh request started`);

  try {
    const requestBody = await req.json().catch(() => ({}));
    const { user_id } = requestBody;

    if (!user_id || typeof user_id !== 'string') {
      console.error(`[${requestId}] Invalid or missing user_id`);
      return new Response(
        JSON.stringify({ error: 'Invalid or missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting check
    if (isRateLimited(user_id)) {
      console.error(`[${requestId}] Rate limit exceeded for user:`, user_id);
      return new Response(
        JSON.stringify({ error: 'Token refresh rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Refreshing Microsoft token for user:`, user_id);

    // Enhanced Supabase setup
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing Supabase configuration`);
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user profile with enhanced error handling
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('microsoft_refresh_token, token_expires_at, microsoft_access_token')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error(`[${requestId}] Profile fetch error:`, profileError);
      return new Response(
        JSON.stringify({ error: `Profile fetch failed: ${profileError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile?.microsoft_refresh_token) {
      console.error(`[${requestId}] No refresh token found for user`);
      return new Response(
        JSON.stringify({ error: 'No refresh token found. Please reconnect your Microsoft account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced configuration
    const tenantId = Deno.env.get('MICROSOFT_TENANT_ID') || 'b2333ef6-3378-4d02-b9b9-d8e66d9dfa3d';
    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID') || '44391516-babe-4072-8422-a4fc8a79fbde';
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
    
    if (!clientSecret) {
      console.error(`[${requestId}] Missing MICROSOFT_CLIENT_SECRET`);
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing client secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Configuration validated, attempting token refresh`);

    // Enhanced token refresh with retry logic
    let tokenData;
    let lastError;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[${requestId}] Token refresh attempt ${attempt}/3`);
        
        const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'ISKCON-Portal/1.0'
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: profile.microsoft_refresh_token,
            grant_type: 'refresh_token',
            scope: 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Files.ReadWrite.All https://graph.microsoft.com/Sites.ReadWrite.All https://graph.microsoft.com/OnlineMeetings.ReadWrite offline_access'
          })
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error(`[${requestId}] Token refresh HTTP error:`, {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            body: errorText
          });
          
          // Handle specific Microsoft errors
          if (tokenResponse.status === 400) {
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.error === 'invalid_grant') {
                throw new Error('Refresh token expired. Please reconnect your Microsoft account.');
              }
            } catch (parseError) {
              // Continue with generic error handling
            }
          }
          
          throw new Error(`Token refresh failed: ${tokenResponse.statusText}`);
        }

        tokenData = await tokenResponse.json();
        console.log(`[${requestId}] Token refresh successful on attempt ${attempt}`);
        break;
        
      } catch (error: any) {
        console.error(`[${requestId}] Token refresh attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!tokenData) {
      console.error(`[${requestId}] All token refresh attempts failed`);
      return new Response(
        JSON.stringify({ error: `Token refresh failed after 3 attempts: ${lastError?.message || 'Unknown error'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Updating profile with new tokens`);

    // Calculate expiration time with 10-minute buffer
    const expiresAt = new Date(Date.now() + (tokenData.expires_in - 600) * 1000).toISOString();
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        microsoft_access_token: tokenData.access_token,
        microsoft_refresh_token: tokenData.refresh_token || profile.microsoft_refresh_token,
        token_expires_at: expiresAt
      })
      .eq('id', user_id);

    if (updateError) {
      console.error(`[${requestId}] Supabase update error:`, updateError);
      return new Response(
        JSON.stringify({ error: `Failed to store refreshed tokens: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Microsoft tokens refreshed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        expires_at: expiresAt,
        access_token: tokenData.access_token,
        request_id: requestId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error(`[${requestId}] Microsoft token refresh error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        request_id: requestId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
