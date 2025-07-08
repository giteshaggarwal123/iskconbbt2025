import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    setLoading(false);
    if (error) setError(error.message || 'Failed to send reset email');
    else setMessage('Password reset email sent! Please check your inbox.');
  };

  return (
    <div className="forgot-password-container">
      <h2>Reset Password</h2>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSendReset}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" />
        <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Email'}</button>
      </form>
    </div>
  );
} 