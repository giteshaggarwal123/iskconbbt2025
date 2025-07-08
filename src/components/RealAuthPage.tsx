import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Shield, Lock, Phone, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useNavigate } from 'react-router-dom';

export const RealAuthPage: React.FC = () => {
  const { signIn, sendOTP, resetPasswordWithOTP, loading, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'login' | 'forgot-otp' | 'forgot-newPassword'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
    phoneNumber: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [forgotPassword, setForgotPassword] = useState(false);
  const [storedOTP, setStoredOTP] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'sms' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Add redirect logic when user is authenticated
  useEffect(() => {
    if (user) {
      console.log('User authenticated, redirecting to dashboard...');
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPassword) {
      // Store the email for password reset and send OTP directly
      setResetEmail(formData.email);
      const { error, otp } = await sendOTP(formData.email);
      if (!error && otp) {
        setStoredOTP(otp);
        setStep('forgot-otp');
      }
    } else {
      // Direct login without OTP verification
      const result = await signIn(formData.email, formData.password, formData.rememberMe);
      // Don't manually navigate - let the useEffect handle it when user state updates
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const isEmail = identifier.includes('@');
      const { error, otp } = await sendOTP(identifier);
      if (error) throw error;
      setVerificationMethod(isEmail ? 'email' : 'sms');
      setStoredOTP(otp || '');
      setStep('forgot-otp');
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyForgotOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp === storedOTP) {
      setStep('forgot-newPassword');
    } else {
      alert('Invalid OTP. Please try again.');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    // Use the new resetPasswordWithOTP method
    const { error } = await resetPasswordWithOTP(resetEmail, formData.otp, formData.newPassword);
    if (!error) {
      setStep('login');
      setForgotPassword(false);
      setFormData(prev => ({ 
        ...prev, 
        password: '', 
        newPassword: '', 
        confirmPassword: '', 
        otp: '', 
        phoneNumber: '' 
      }));
      setResetEmail('');
    }
  };

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetToLogin = () => {
    setStep('login');
    setForgotPassword(false);
    setFormData(prev => ({ 
      ...prev, 
      otp: '', 
      phoneNumber: '', 
      newPassword: '', 
      confirmPassword: '' 
    }));
    setResetEmail('');
  };

  const handleResendOTP = async () => {
    if (step === 'forgot-otp') {
      const { error, otp } = await sendOTP(resetEmail);
      if (!error && otp) {
        setStoredOTP(otp);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-white to-secondary/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <img 
              src="/icons/icon-512.png" 
              alt="ISKCON Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ISKCON BUREAU</h1>
          <p className="text-gray-600">Management Portal</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>
                {step.startsWith('forgot-') ? 'Reset Password' : 'Secure Login'}
              </span>
            </CardTitle>
            <CardDescription>
              {step === 'login' && !forgotPassword && 'Enter your credentials to sign in'}
              {step === 'login' && forgotPassword && 'Enter your email to reset password'}
              {step === 'forgot-otp' && 'Enter the OTP sent to your email'}
              {step === 'forgot-newPassword' && 'Set your new password'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {step === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@iskconbureau.in"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                {!forgotPassword && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={(e) => updateFormData('password', e.target.value)}
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={formData.rememberMe}
                        onCheckedChange={(checked) => updateFormData('rememberMe', checked as boolean)}
                      />
                      <Label htmlFor="remember" className="text-sm">Remember me</Label>
                    </div>
                  </>
                )}
                
                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {loading ? 'Processing...' : forgotPassword ? 'Continue' : 'Sign In'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setForgotPassword(!forgotPassword)}
                    className="text-sm text-primary hover:underline"
                  >
                    {forgotPassword ? 'Back to Login' : 'Forgot Password?'}
                  </button>
                </div>
              </form>

            ) : forgotPassword && step === 'login' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or Phone</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="your.email@iskconbureau.in or +1234567890"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                {error && <div className="text-red-600 text-sm text-center">{error}</div>}
                <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90">
                  {isLoading ? 'Processing...' : 'Continue'}
                </Button>
                <div className="text-center">
                  <button type="button" onClick={resetToLogin} className="text-sm text-gray-600 hover:text-primary">
                    Back to Login
                  </button>
                </div>
              </form>
            ) : step === 'forgot-otp' ? (
              <form onSubmit={handleVerifyForgotOTP} className="space-y-6">
                <div className="space-y-4">
                  <div className="text-center">
                    {verificationMethod === 'email' ? <Mail className="h-8 w-8 text-primary mx-auto mb-2" /> : <Phone className="h-8 w-8 text-primary mx-auto mb-2" />}
                    <p className="text-sm text-gray-600">
                      Enter the 6-digit code sent to {identifier}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-center block">Verification Code</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={formData.otp}
                        onChange={(value) => updateFormData('otp', value)}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                </div>
                {error && <div className="text-red-600 text-sm text-center">{error}</div>}
                <Button type="submit" disabled={loading || formData.otp.length !== 6} className="w-full bg-primary hover:bg-primary/90">
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={resetToLogin} className="flex items-center text-gray-600 hover:text-primary">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </button>
                  <button type="button" onClick={handleResendOTP} className="text-primary hover:underline">
                    Resend OTP
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={formData.newPassword}
                      onChange={(e) => updateFormData('newPassword', e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        
        <div className="text-center mt-6 text-xs text-gray-500">
          <p>© 2025 ISKCON BUREAU Management Portal</p>
          <p>Secure • Reliable • Confidential</p>
        </div>
      </div>
    </div>
  );
};
