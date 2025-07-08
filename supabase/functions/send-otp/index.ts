import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { phoneNumber, email, name, type = 'otp', userId, otp, newPassword, adminReset = false } = await req.json();

    // For password reset, use email field; for SMS OTP, use phoneNumber
    const targetIdentifier = email || phoneNumber;
    
    if (!targetIdentifier) {
      return new Response(
        JSON.stringify({ error: 'Phone number or email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle forced email confirmation (admin override)
    if (type === 'force_confirm_email') {
      try {
        console.log('🔄 Force confirming email for:', targetIdentifier);
        
        // Get user by email
        const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers();
        
        if (fetchError) {
          throw new Error('Failed to fetch user data');
        }

        const targetUser = users.find(u => u.email === targetIdentifier);
        if (!targetUser) {
          throw new Error('User not found');
        }

        console.log('👤 Found user:', targetUser.id, 'Current email_confirmed_at:', targetUser.email_confirmed_at);

        // Force confirm the user's email using admin API
        const { data: updateData, error: confirmError } = await supabase.auth.admin.updateUserById(
          targetUser.id,
          { 
            email_confirm: true,
            email_confirmed_at: new Date().toISOString()
          }
        );

        if (confirmError) {
          console.error('❌ Confirm error:', confirmError);
          throw confirmError;
        }

        console.log('✅ Email force confirmed successfully for user:', targetIdentifier);
        console.log('📧 Updated user data:', updateData);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email force confirmed successfully',
            user_id: targetUser.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        console.error('❌ Email force confirmation error:', error);
        return new Response(
          JSON.stringify({ 
            error: error.message || 'Failed to force confirm email'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle email confirmation for users
    if (type === 'confirm_email') {
      try {
        // Get user by email and confirm them
        const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers();
        
        if (fetchError) {
          throw new Error('Failed to fetch user data');
        }

        const targetUser = users.find(u => u.email === targetIdentifier);
        if (!targetUser) {
          throw new Error('User not found');
        }

        // Confirm the user's email using admin API
        const { error: confirmError } = await supabase.auth.admin.updateUserById(
          targetUser.id,
          { email_confirm: true }
        );

        if (confirmError) {
          throw confirmError;
        }

        console.log('Email confirmed successfully for user:', targetIdentifier);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email confirmed successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        console.error('Email confirmation error:', error);
        return new Response(
          JSON.stringify({ 
            error: error.message || 'Failed to confirm email'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle admin password reset (direct reset without OTP)
    if (type === 'admin_reset' || adminReset) {
      try {
        // Get user by email
        const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers();
        
        if (fetchError) {
          throw new Error('Failed to fetch user data');
        }

        const targetUser = users.find(u => u.email === targetIdentifier);
        if (!targetUser) {
          throw new Error('User not found');
        }

        // Update the user's password using admin API
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          targetUser.id,
          { password: newPassword }
        );

        if (updateError) {
          throw updateError;
        }

        console.log('Admin password reset successful for user:', targetIdentifier);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Password reset successful by admin'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        console.error('Admin password reset error:', error);
        return new Response(
          JSON.stringify({ 
            error: error.message || 'Failed to reset password'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle password reset using service role
    if (type === 'reset_password') {
      try {
        // Get user by email
        const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers();
        
        if (fetchError) {
          throw new Error('Failed to fetch user data');
        }

        const targetUser = users.find(u => u.email === targetIdentifier);
        if (!targetUser) {
          throw new Error('User not found');
        }

        // Update the user's password using admin API
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          targetUser.id,
          { password: newPassword }
        );

        if (updateError) {
          throw updateError;
        }

        console.log('Password reset successful for user:', targetIdentifier);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Password reset successful'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error: any) {
        console.error('Password reset error:', error);
        return new Response(
          JSON.stringify({ 
            error: error.message || 'Failed to reset password'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate 6-digit OTP or temporary password
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Handle password reset emails through Outlook
    if (type === 'password_reset' || (email && !phoneNumber)) {
      // Get the admin/sender's Microsoft token to send email
      let senderToken = null;
      
      // First try to get token from the user making the request (if userId provided)
      if (userId) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('microsoft_access_token, microsoft_refresh_token, token_expires_at')
          .eq('id', userId)
          .single();
        
        if (userProfile?.microsoft_access_token) {
          // Check if token is still valid
          const expiresAt = new Date(userProfile.token_expires_at);
          const now = new Date();
          
          if (expiresAt > now) {
            senderToken = userProfile.microsoft_access_token;
          }
        }
      }
      
      // If no valid token from user, try to get from any super admin
      if (!senderToken) {
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id, microsoft_access_token, token_expires_at')
          .not('microsoft_access_token', 'is', null);
        
        if (adminProfiles && adminProfiles.length > 0) {
          for (const profile of adminProfiles) {
            const expiresAt = new Date(profile.token_expires_at);
            const now = new Date();
            
            if (expiresAt > now) {
              senderToken = profile.microsoft_access_token;
              break;
            }
          }
        }
      }
      
      if (!senderToken) {
        return new Response(
          JSON.stringify({ 
            error: 'No Microsoft account connected for sending emails',
            suggestion: 'Please connect a Microsoft account in Settings to enable email sending'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create personalized greeting
      const greeting = name ? `Hi ${name}` : 'Hello';
      
      const emailSubject = type === 'password_reset' ? 'ISKCON Bureau - Password Reset' : 'ISKCON Bureau - Verification Code';
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">ISKCON Bureau - ${type === 'password_reset' ? 'Password Reset' : 'Verification Code'}</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; color: #333;">${greeting},</p>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              ${type === 'password_reset' 
                ? `A password reset has been requested for your ISKCON Bureau account (${targetIdentifier}).`
                : `A verification code has been requested for your ISKCON Bureau account (${targetIdentifier}).`
              }
            </p>
            <div style="background-color: #fff; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #333;">Your ${type === 'password_reset' ? 'temporary password' : 'verification code'}:</p>
              <p style="font-size: 24px; font-family: monospace; color: #007bff; margin: 10px 0; letter-spacing: 2px;">${otpCode}</p>
            </div>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              <strong>Important:</strong> This ${type === 'password_reset' ? 'temporary password is valid for 24 hours' : 'verification code is valid for 10 minutes'}. Please use it immediately.
            </p>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              If you didn't request this ${type === 'password_reset' ? 'password reset' : 'verification code'}, please contact the bureau administrators immediately.
            </p>
          </div>
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999;">
              This email was sent from ISKCON Bureau Management System
            </p>
          </div>
        </div>
      `;

      // Send email via Microsoft Graph
      const emailData = {
        message: {
          subject: emailSubject,
          body: {
            contentType: 'HTML',
            content: emailBody
          },
          toRecipients: [{
            emailAddress: {
              address: targetIdentifier // Use the target identifier (email)
            }
          }]
        }
      };

      const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${senderToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Microsoft Graph email error:', errorData);
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to send password reset email',
            details: errorData.error?.message || 'Unknown error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Email sent successfully via Outlook to:', targetIdentifier);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: type === 'password_reset' ? 'Password reset email sent successfully via Outlook' : 'Verification code sent successfully via email',
          otp: otpCode,
          email: targetIdentifier
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original SMS logic for OTP (phone login)
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create personalized greeting for SMS
    const greeting = name ? `Hi ${name}` : 'Hello';
    const smsBody = `${greeting}, your ISKCON Bureau login code is ${otpCode}. Valid for 10 minutes.`;

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioPhoneNumber,
        To: targetIdentifier,
        Body: smsBody
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twilio error response:', errorData);
      
      let userFriendlyMessage = 'Unable to send verification code. Please try again later.';
      
      if (errorData.includes('30485')) {
        userFriendlyMessage = 'SMS delivery temporarily blocked. Please try again in a few minutes or contact support.';
      } else if (errorData.includes('21211')) {
        userFriendlyMessage = 'Invalid phone number format. Please check and try again.';
      } else if (errorData.includes('21614')) {
        userFriendlyMessage = 'Phone number is not valid for SMS delivery.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: userFriendlyMessage,
          twilioError: errorData
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await response.json();
    console.log('Twilio response:', responseData);
    console.log('OTP sent successfully to:', targetIdentifier);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        otp: otpCode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-otp function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
