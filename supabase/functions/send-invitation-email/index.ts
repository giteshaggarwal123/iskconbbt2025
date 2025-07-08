
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  userId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, firstName, lastName, role, userId }: InvitationRequest = await req.json();

    console.log('Processing invitation for:', email);

    // Check if the current user has Microsoft integration
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('microsoft_access_token, microsoft_refresh_token, token_expires_at, first_name, last_name')
      .eq('id', user.id)
      .single()

    const subject = `Invitation to Join ISKCON Bureau Management System`;
    const loginUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/auth/v1', '')}/auth/v1/verify?type=signup&redirect_to=${encodeURIComponent('https://iskconbbtportal.lovable.app/auth')}`;
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B4513; margin-bottom: 10px;">ISKCON Bureau Management System</h1>
          <p style="color: #666; font-size: 16px;">Bureau Member Invitation</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${firstName} ${lastName},</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            You have been invited to join the ISKCON Bureau Management System as a <strong>${role.replace('_', ' ').toUpperCase()}</strong>.
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            The ISKCON Bureau Management System provides access to:
          </p>
          
          <ul style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            <li>Bureau meetings and agendas</li>
            <li>Document management and sharing</li>
            <li>Voting and decision-making tools</li>
            <li>Member communication</li>
            <li>Attendance tracking</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background: #8B4513; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Access Bureau Portal
            </a>
          </div>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 15px;">
            <strong>Next Steps:</strong>
          </p>
          <ol style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            <li>Click the "Access Bureau Portal" button above</li>
            <li>Use your email address (${email}) to sign in</li>
            <li>Complete your profile setup</li>
            <li>Start participating in bureau activities</li>
          </ol>
        </div>
        
        <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center;">
          <p style="color: #888; font-size: 14px; margin-bottom: 5px;">
            This invitation was sent by ${senderProfile?.first_name || ''} ${senderProfile?.last_name || ''} (${user.email})
          </p>
          <p style="color: #888; font-size: 12px;">
            If you have any questions, please contact your bureau administrator.
          </p>
        </div>
      </div>
    `;

    // Try to send via Outlook if available, otherwise log the invitation
    if (senderProfile?.microsoft_access_token) {
      console.log('Sending invitation via Outlook...');
      
      // Use the existing send-outlook-email function
      const outlookResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-outlook-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          body: emailBody,
          recipients: [email]
        })
      });

      if (outlookResponse.ok) {
        console.log('Invitation sent successfully via Outlook');
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Invitation sent successfully via Outlook',
            method: 'outlook'
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      } else {
        console.log('Outlook sending failed, falling back to logging');
      }
    }

    // Fallback: Log the invitation details
    console.log(`
      ========================================
      BUREAU MEMBER INVITATION
      ========================================
      
      TO: ${email}
      NAME: ${firstName} ${lastName}
      ROLE: ${role.replace('_', ' ').toUpperCase()}
      INVITED BY: ${user.email}
      
      SUBJECT: ${subject}
      
      LOGIN URL: ${loginUrl}
      
      MESSAGE:
      Dear ${firstName} ${lastName},
      
      You have been invited to join the ISKCON Bureau Management System as a ${role.replace('_', ' ').toUpperCase()}.
      
      Please use the following URL to access the portal:
      ${loginUrl}
      
      Use your email address (${email}) to sign in and complete your profile setup.
      
      Best regards,
      ISKCON Bureau Management Team
      
      ========================================
    `);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Member invitation processed successfully. Please manually send the login details to the member.',
        method: 'logged',
        loginUrl,
        instructions: `Please manually share these login details with ${firstName} ${lastName} at ${email}:`
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
