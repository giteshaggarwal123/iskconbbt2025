
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to format phone number to international format
const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 91 (India country code), add +
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return '+' + cleaned;
  }
  
  // If it's a 10-digit Indian number, add +91
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    return '+91' + cleaned;
  }
  
  // If it already has + at the beginning, use as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: assume it's an Indian number and add +91
  return '+91' + cleaned;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Looking for user with email:', email);

    // Get user's phone number and name from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone, first_name, last_name')
      .eq('email', email)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ 
          error: 'User not found in the system.',
          details: 'This email address is not registered as a bureau member. Please contact the administrator to get added to the system.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      console.error('No profile found for email:', email);
      return new Response(
        JSON.stringify({ 
          error: 'User profile not found.',
          details: 'Please contact the administrator to set up your profile.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.phone) {
      console.error('No phone number for user:', email);
      return new Response(
        JSON.stringify({ 
          error: 'Phone number not registered.',
          details: 'Your account does not have a registered phone number. Please contact the administrator to add your phone number to your profile before using OTP login.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format the phone number properly
    const formattedPhone = formatPhoneNumber(profile.phone);
    console.log('Original phone:', profile.phone, 'Formatted phone:', formattedPhone);

    // Create personalized greeting
    const firstName = profile.first_name || '';
    const greeting = firstName ? `Hi ${firstName}` : 'Hello';

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ error: 'SMS service not configured. Please contact the administrator.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS via Twilio with personalized message
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    // Personalized message format
    const smsBody = `${greeting}, your ISKCON Bureau login code is ${otp}. Valid for 5 minutes.`;

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioPhoneNumber,
        To: formattedPhone,
        Body: smsBody
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twilio error response:', errorData);
      
      // Parse Twilio error for better user feedback
      let userFriendlyMessage = 'Unable to send verification code. Please try again later.';
      
      if (errorData.includes('30485')) {
        userFriendlyMessage = 'SMS delivery temporarily blocked. Please try again in a few minutes or contact support.';
      } else if (errorData.includes('21211')) {
        userFriendlyMessage = 'Invalid phone number format. Please contact administrator to update your phone number.';
      } else if (errorData.includes('21614')) {
        userFriendlyMessage = 'Phone number is not valid for SMS delivery.';
      }
      
      return new Response(
        JSON.stringify({ 
          error: userFriendlyMessage,
          details: 'SMS service temporarily unavailable. Please try again later or contact the administrator.',
          twilioError: errorData
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await response.json();
    console.log('Twilio response:', responseData);
    console.log('Login OTP sent successfully to:', formattedPhone, 'for email:', email);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Verification code sent to ${formattedPhone.replace(/(\+91)(\d{5})(\d{5})/, '$1*****$3')}`,
        otp: otp // In production, store this securely instead of returning it
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-login-otp function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error.',
        details: 'An unexpected error occurred while processing your request. Please try again later.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
