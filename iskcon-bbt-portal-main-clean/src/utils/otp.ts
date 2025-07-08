export async function sendOTP(email: string, supabaseAccessToken: string) {
  try {
    console.log('Sending OTP to:', email);
    
    const response = await fetch('https://daiimiznlkffbbadhodw.supabase.co/functions/v1/send-otp-fixed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAccessToken}`
      },
      body: JSON.stringify({ email })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send verification code');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
}

export async function verifyOTP(email: string, code: string, supabaseAccessToken: string) {
  try {
    const response = await fetch('https://daiimiznlkffbbadhodw.supabase.co/functions/v1/verify-otp-fixed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAccessToken}`
      },
      body: JSON.stringify({ email, code })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify code');
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
} 