
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number, resetTime: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const key = `auth_${userId}`;
  const limit = rateLimitStore.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 5 * 60 * 1000 }); // 5 minutes
    return false;
  }
  
  if (limit.count >= 5) { // Max 5 attempts per 5 minutes
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
  console.log(`[${requestId}] Microsoft auth request started`);

  try {
    const requestBody = await req.json().catch(() => ({}));
    const { code, user_id } = requestBody;

    console.log(`[${requestId}] Request validation:`, {
      code: code ? 'present' : 'missing',
      user_id: user_id ? 'present' : 'missing',
      timestamp: new Date().toISOString()
    });

    // Enhanced input validation
    if (!code || typeof code !== 'string') {
      console.error(`[${requestId}] Invalid or missing authorization code`);
      return new Response(
        JSON.stringify({ error: 'Invalid or missing authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Processing Microsoft auth for user:`, user_id);

    // Enhanced configuration with fallbacks
    const tenantId = Deno.env.get('MICROSOFT_TENANT_ID') || 'b2333ef6-3378-4d02-b9b9-d8e66d9dfa3d';
    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID') || '44391516-babe-4072-8422-a4fc8a79fbde';
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
    
    if (!clientSecret) {
      console.error(`[${requestId}] Missing MICROSOFT_CLIENT_SECRET environment variable`);
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing client secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Determine redirect URI with multiple fallback strategies
    const requestOrigin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = req.headers.get('host');
    
    let siteUrl = Deno.env.get('SITE_URL');
    
    if (!siteUrl) {
      if (requestOrigin) {
        siteUrl = requestOrigin;
      } else if (referer) {
        const url = new URL(referer);
        siteUrl = `${url.protocol}//${url.host}`;
      } else if (forwardedHost) {
        siteUrl = `https://${forwardedHost}`;
      } else if (host) {
        siteUrl = `https://${host}`;
      } else {
        siteUrl = 'https://6a0fd4ef-a029-4c9d-95ed-74a4fa947c60.lovableproject.com';
      }
    }
    
    const redirectUri = `${siteUrl}/microsoft/callback`;
    
    console.log(`[${requestId}] Configuration:`, {
      tenantId,
      clientId,
      redirectUri,
      siteUrl,
      requestOrigin,
      hasClientSecret: !!clientSecret
    });

    // Enhanced token exchange with retry logic
    let tokenData;
    let lastError;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[${requestId}] Token exchange attempt ${attempt}/3`);
        
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
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            scope: 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Files.ReadWrite.All https://graph.microsoft.com/Sites.ReadWrite.All https://graph.microsoft.com/OnlineMeetings.ReadWrite offline_access'
          })
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error(`[${requestId}] Token exchange HTTP error:`, {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            body: errorText
          });
          
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error || tokenResponse.statusText}`);
          } catch {
            throw new Error(`Token exchange failed with status ${tokenResponse.status}: ${tokenResponse.statusText}`);
          }
        }

        tokenData = await tokenResponse.json();
        console.log(`[${requestId}] Token exchange successful on attempt ${attempt}`);
        break;
        
      } catch (error: any) {
        console.error(`[${requestId}] Token exchange attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!tokenData) {
      console.error(`[${requestId}] All token exchange attempts failed`);
      return new Response(
        JSON.stringify({ error: `Token exchange failed after 3 attempts: ${lastError?.message || 'Unknown error'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Getting user info from Microsoft Graph`);

    // Enhanced user info retrieval with retry logic
    let userData;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[${requestId}] User info attempt ${attempt}/3`);
        
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json',
            'User-Agent': 'ISKCON-Portal/1.0'
          }
        });

        if (!userResponse.ok) {
          const errorText = await userResponse.text();
          console.error(`[${requestId}] User info HTTP error:`, {
            status: userResponse.status,
            statusText: userResponse.statusText,
            body: errorText
          });
          throw new Error(`Failed to get user info: ${userResponse.statusText}`);
        }

        userData = await userResponse.json();
        console.log(`[${requestId}] User info retrieved:`, {
          displayName: userData.displayName,
          mail: userData.mail,
          id: userData.id
        });
        break;
        
      } catch (error: any) {
        console.error(`[${requestId}] User info attempt ${attempt} failed:`, error.message);
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          return new Response(
            JSON.stringify({ error: `Failed to get user info after 3 attempts: ${error.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    console.log(`[${requestId}] Storing tokens in Supabase`);

    // Enhanced Supabase integration
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing Supabase configuration`);
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate expiration time with 10-minute buffer for enhanced reliability
    const expiresAt = new Date(Date.now() + (tokenData.expires_in - 600) * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        microsoft_user_id: userData.id,
        microsoft_access_token: tokenData.access_token,
        microsoft_refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt
      })
      .eq('id', user_id);

    if (updateError) {
      console.error(`[${requestId}] Supabase update error:`, updateError);
      return new Response(
        JSON.stringify({ error: `Failed to store tokens: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${requestId}] Microsoft tokens stored successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData,
        expires_at: expiresAt,
        request_id: requestId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error(`[${requestId}] Microsoft auth error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        request_id: requestId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
