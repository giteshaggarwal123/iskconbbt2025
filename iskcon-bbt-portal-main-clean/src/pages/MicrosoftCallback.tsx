
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const MicrosoftCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  const [progress, setProgress] = useState('Initializing...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setProgress('Processing Microsoft callback...');
        
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('Microsoft callback received:', { 
          hasCode: !!code, 
          hasState: !!state, 
          error, 
          errorDescription,
          timestamp: new Date().toISOString()
        });

        // Handle OAuth errors from Microsoft
        if (error) {
          console.error('Microsoft OAuth error:', error, errorDescription);
          
          const errorMessages: Record<string, string> = {
            'access_denied': 'You cancelled the Microsoft authentication process.',
            'invalid_request': 'Invalid authentication request. Please try again.',
            'invalid_client': 'Microsoft application configuration error. Please contact support.',
            'invalid_grant': 'Authentication expired. Please try again.',
            'unauthorized_client': 'Application not authorized. Please contact support.',
            'server_error': 'Microsoft server error. Please try again later.',
            'temporarily_unavailable': 'Microsoft services temporarily unavailable. Please try again later.'
          };
          
          const friendlyMessage = errorMessages[error] || errorDescription || `Authentication failed: ${error}`;
          
          toast({
            title: "Microsoft Authentication Failed",
            description: friendlyMessage,
            variant: "destructive"
          });
          
          navigate('/', { replace: true });
          return;
        }

        // Validate required parameters
        if (!code) {
          console.error('Missing authorization code from Microsoft');
          toast({
            title: "Authentication Failed", 
            description: "No authorization code received from Microsoft. Please try connecting again.",
            variant: "destructive"
          });
          navigate('/', { replace: true });
          return;
        }

        if (!state) {
          console.error('Missing state parameter from Microsoft');
          toast({
            title: "Authentication Failed", 
            description: "Security validation failed. Please try connecting again.",
            variant: "destructive"
          });
          navigate('/', { replace: true });
          return;
        }

        setProgress('Validating session...');

        // Validate session data
        let storedUserId: string | null = null;
        let sessionTimestamp: string | null = null;
        
        try {
          storedUserId = sessionStorage.getItem('microsoft_auth_user_id');
          sessionTimestamp = sessionStorage.getItem('microsoft_auth_timestamp');
        } catch (e) {
          console.error('Session storage access error:', e);
        }
        
        if (!storedUserId || storedUserId !== state) {
          console.error('Session validation failed', { storedUserId, state });
          toast({
            title: "Session Error",
            description: "Authentication session is invalid. Please try connecting again.",
            variant: "destructive"
          });
          navigate('/', { replace: true });
          return;
        }

        // Check session age (30 minutes max)
        if (sessionTimestamp) {
          const sessionAge = Date.now() - parseInt(sessionTimestamp);
          const maxAge = 30 * 60 * 1000;
          
          if (sessionAge > maxAge) {
            console.error('Authentication session expired');
            toast({
              title: "Session Expired",
              description: "Authentication session has expired. Please try connecting again.",
              variant: "destructive"
            });
            navigate('/', { replace: true });
            return;
          }
        }

        setProgress('Exchanging code for tokens...');

        // Call Microsoft auth edge function with enhanced retry logic
        let authResult;
        let lastError;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`Microsoft auth attempt ${attempt}/3`);
            setProgress(`Authenticating with Microsoft (attempt ${attempt}/3)...`);
            
            const { data, error: authError } = await supabase.functions.invoke('microsoft-auth', {
              body: { code, user_id: state }
            });

            if (authError) {
              throw new Error(`Edge function error: ${authError.message}`);
            }

            if (data?.error) {
              throw new Error(data.error);
            }

            if (!data?.success) {
              throw new Error('Authentication failed - no success response');
            }

            authResult = data;
            console.log('Microsoft authentication successful');
            break;
            
          } catch (error: any) {
            console.error(`Microsoft auth attempt ${attempt} failed:`, error);
            lastError = error;
            
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }

        if (!authResult) {
          throw new Error(`Authentication failed after 3 attempts: ${lastError?.message || 'Unknown error'}`);
        }

        setProgress('Finalizing connection...');

        // Clean up session storage
        try {
          sessionStorage.removeItem('microsoft_auth_user_id');
          sessionStorage.removeItem('microsoft_auth_nonce');
          sessionStorage.removeItem('microsoft_auth_timestamp');
        } catch (e) {
          console.warn('Session cleanup warning:', e);
        }

        // Store success marker
        try {
          localStorage.setItem('microsoft_auth_success', 'true');
          localStorage.setItem('microsoft_auth_timestamp', Date.now().toString());
        } catch (e) {
          console.warn('Local storage warning:', e);
        }

        toast({
          title: "Microsoft Account Connected!",
          description: `Successfully connected to ${authResult.user?.displayName || authResult.user?.mail || 'Microsoft 365'}`,
        });

        // Navigate back with success state
        navigate('/?microsoft_connected=true', { replace: true });

      } catch (error: any) {
        console.error('Microsoft callback processing error:', error);
        
        setProgress('Error occurred...');
        
        // Clean up on error
        try {
          sessionStorage.removeItem('microsoft_auth_user_id');
          sessionStorage.removeItem('microsoft_auth_nonce');
          sessionStorage.removeItem('microsoft_auth_timestamp');
          localStorage.setItem('microsoft_auth_last_error', JSON.stringify({
            message: error.message,
            timestamp: new Date().toISOString()
          }));
        } catch (e) {
          console.warn('Error cleanup warning:', e);
        }
        
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to complete Microsoft authentication. Please try again.",
          variant: "destructive"
        });
        
        navigate('/', { replace: true });
      } finally {
        setProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  if (processing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Connecting Microsoft Account</h2>
          <p className="text-gray-600 mb-4">{progress}</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse transition-all duration-300" style={{ width: '70%' }}></div>
          </div>
          <p className="text-sm text-gray-500 mt-4">Please wait while we complete the connection...</p>
        </div>
      </div>
    );
  }

  return null;
};
