export async function sendOTP(email: string) {
  try {
    console.log('Sending OTP to:', email);
    
    const response = await fetch('https://daiimiznlkffbbadhodw.supabase.co/functions/v1/send-otp-fixed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

export async function verifyOTP(email: string, code: string) {
  const response = await fetch('https://daiimiznlkffbbadhodw.supabase.co/functions/v1/verify-otp-fixed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  });
  return await response.json();
}

export async function resetPassword(email: string, newPassword: string, otpCode: string) {
  const response = await fetch('https://daiimiznlkffbbadhodw.supabase.co/functions/v1/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, newPassword, otpCode })
  });
  return await response.json();
}

export async function getProfile(accessToken: string) {
  const response = await fetch('https://daiimiznlkffbbadhodw.supabase.co/functions/v1/get-profile-fixed', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return await response.json();
} 