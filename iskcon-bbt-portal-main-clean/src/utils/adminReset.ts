
import { supabase } from '@/integrations/supabase/client';

export const resetUserPassword = async (email: string, newPassword: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: {
        email: email,
        type: 'admin_reset',
        newPassword: newPassword,
        adminReset: true
      }
    });

    if (error) {
      console.error('Password reset error:', error);
      throw error;
    }

    console.log('Password reset successful:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Password reset failed:', error);
    return { success: false, error: error.message };
  }
};

export const confirmUserEmail = async (email: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: {
        email: email,
        type: 'confirm_email'
      }
    });

    if (error) {
      console.error('Email confirmation error:', error);
      throw error;
    }

    console.log('Email confirmation successful:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Email confirmation failed:', error);
    return { success: false, error: error.message };
  }
};

export const forceUserEmailConfirmation = async (email: string) => {
  try {
    console.log('🔄 Starting forced email confirmation for:', email);
    
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: {
        email: email,
        type: 'force_confirm_email'
      }
    });

    if (error) {
      console.error('❌ Force email confirmation error:', error);
      throw error;
    }

    console.log('✅ Force email confirmation successful:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Force email confirmation failed:', error);
    return { success: false, error: error.message };
  }
};

// Force confirm email and reset password for anshkashyap23109@gmail.com
console.log('🚀 Starting admin operations for anshkashyap23109@gmail.com');

forceUserEmailConfirmation('anshkashyap23109@gmail.com').then(result => {
  if (result.success) {
    console.log('✅ Email force confirmed for anshkashyap23109@gmail.com');
    
    // Wait a moment then reset the password
    return new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
      setTimeout(() => {
        resetUserPassword('anshkashyap23109@gmail.com', '12345678').then(resolve);
      }, 1000);
    });
  } else {
    console.error('❌ Email force confirmation failed:', result.error);
    return Promise.reject(result.error);
  }
}).then(resetResult => {
  if (resetResult && resetResult.success) {
    console.log('✅ Password reset successful for anshkashyap23109@gmail.com');
    console.log('🎉 User should now be able to login with email: anshkashyap23109@gmail.com and password: 12345678');
  } else {
    console.error('❌ Password reset failed:', resetResult?.error);
  }
}).catch(error => {
  console.error('❌ Process failed:', error);
});
