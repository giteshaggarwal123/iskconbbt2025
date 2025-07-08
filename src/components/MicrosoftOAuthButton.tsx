
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMicrosoftAuth } from '@/hooks/useMicrosoftAuth';
import { MicrosoftConnectionStatus } from './MicrosoftConnectionStatus';

interface MicrosoftOAuthButtonProps {
  onSuccess?: () => void;
}

export const MicrosoftOAuthButton: React.FC<MicrosoftOAuthButtonProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isConnected, disconnectMicrosoft, canAttemptConnection } = useMicrosoftAuth();

  // Check network connectivity
  const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
      const response = await fetch(window.location.origin + '/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const handleMicrosoftLogin = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in first before connecting your Microsoft account.",
        variant: "destructive"
      });
      return;
    }

    if (!canAttemptConnection) {
      toast({
        title: "Rate Limited",
        description: "Too many connection attempts. Please wait before trying again.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Check network connectivity first
      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        toast({
          title: "Network Connection Error",
          description: "Unable to connect to the internet. Please check your network connection and try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Clear any existing errors and session data first
      try {
        localStorage.removeItem('microsoft_auth_error');
        localStorage.removeItem('microsoft_auth_last_error');
        sessionStorage.removeItem('microsoft_auth_user_id');
        sessionStorage.removeItem('microsoft_auth_nonce');
        sessionStorage.removeItem('microsoft_auth_timestamp');
      } catch (e) {
        console.warn('Storage cleanup warning:', e);
      }

      // Enhanced configuration with tenant-specific endpoint
      const clientId = '44391516-babe-4072-8422-a4fc8a79fbde';
      const tenantId = 'b2333ef6-3378-4d02-b9b9-d8e66d9dfa3d';
      const baseUrl = window.location.origin;
      const redirectUri = `${baseUrl}/microsoft/callback`;
      const state = user.id;
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      console.log('Microsoft OAuth Configuration:', {
        clientId,
        tenantId,
        baseUrl,
        redirectUri,
        userId: state,
        timestamp: new Date().toISOString()
      });

      // Validate redirect URI accessibility
      try {
        const redirectTest = await fetch(redirectUri, { method: 'HEAD', cache: 'no-cache' });
        if (!redirectTest.ok && redirectTest.status !== 404) {
          toast({
            title: "Configuration Error",
            description: "The redirect URL is not accessible. This may be a temporary network issue.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      } catch (redirectError) {
        toast({
          title: "Network Error",
          description: "Unable to verify redirect URL. Please check your internet connection.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Store session data with error handling
      try {
        sessionStorage.setItem('microsoft_auth_user_id', state);
        sessionStorage.setItem('microsoft_auth_nonce', nonce);
        sessionStorage.setItem('microsoft_auth_timestamp', Date.now().toString());
      } catch (storageError) {
        console.error('Session storage error:', storageError);
        toast({
          title: "Storage Error",
          description: "Unable to store session data. Please enable cookies and try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Enhanced scope with proper permissions
      const scope = [
        'openid',
        'profile',
        'email',
        'offline_access',
        'https://graph.microsoft.com/User.Read',
        'https://graph.microsoft.com/Mail.ReadWrite',
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/Files.ReadWrite.All'
      ].join(' ');

      // Construct OAuth URL with tenant-specific endpoint
      const authParams = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: scope,
        response_mode: 'query',
        state: state,
        nonce: nonce,
        prompt: 'consent',
        access_type: 'offline'
      });

      // Use tenant-specific endpoint instead of common endpoint
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${authParams.toString()}`;
      
      console.log('Opening Microsoft OAuth in new window with tenant-specific endpoint...');
      
      // Open in a new window instead of redirecting current window
      const popup = window.open(
        authUrl,
        'microsoft-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site and try again. You may need to disable ad blockers.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Enhanced popup monitoring with network error detection
      let popupCheckInterval: NodeJS.Timeout;
      let networkCheckInterval: NodeJS.Timeout;
      
      const cleanupIntervals = () => {
        if (popupCheckInterval) clearInterval(popupCheckInterval);
        if (networkCheckInterval) clearInterval(networkCheckInterval);
      };

      // Monitor popup for completion
      popupCheckInterval = setInterval(() => {
        try {
          if (popup.closed) {
            cleanupIntervals();
            setLoading(false);
            // Check if authentication was successful by checking for tokens
            setTimeout(() => {
              window.location.reload(); // Refresh to check auth state
            }, 1000);
          }
        } catch (error) {
          console.warn('Popup monitoring error:', error);
        }
      }, 1000);

      // Monitor network connectivity during authentication
      networkCheckInterval = setInterval(async () => {
        const isStillOnline = await checkNetworkConnectivity();
        if (!isStillOnline) {
          if (!popup.closed) {
            popup.close();
          }
          cleanupIntervals();
          setLoading(false);
          toast({
            title: "Network Connection Lost",
            description: "Network connection was lost during authentication. Please check your connection and try again.",
            variant: "destructive"
          });
        }
      }, 5000);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
          cleanupIntervals();
          setLoading(false);
          toast({
            title: "Authentication Timeout",
            description: "Microsoft authentication took too long. This may be due to network issues. Please try again.",
            variant: "destructive"
          });
        }
      }, 5 * 60 * 1000);
      
    } catch (error: any) {
      console.error('Microsoft OAuth initialization error:', error);
      setLoading(false);
      
      // Provide specific error messages based on error type
      let errorMessage = `Failed to initialize Microsoft connection: ${error.message}`;
      
      if (error.message.includes('NetworkError') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
        errorMessage = "Network connection error. Please check your internet connection and try again.";
      } else if (error.message.includes('popup')) {
        errorMessage = "Popup was blocked. Please allow popups for this site and try again.";
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [user, toast, canAttemptConnection]);

  // Auto-trigger onSuccess when connection is established
  useEffect(() => {
    if (isConnected && onSuccess) {
      console.log('Microsoft connected, calling onSuccess');
      onSuccess();
    }
  }, [isConnected, onSuccess]);

  // Reset loading state when connection is established or fails
  useEffect(() => {
    if (isConnected || !canAttemptConnection) {
      setLoading(false);
    }
  }, [isConnected, canAttemptConnection]);

  if (isConnected) {
    return (
      <div className="space-y-4">
        <MicrosoftConnectionStatus />
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-800 mb-2">Microsoft 365 Connected</h4>
          <p className="text-sm text-green-700 mb-3">
            Your Microsoft account is connected. You can now access Outlook, Teams, and SharePoint features.
          </p>
          <Button 
            onClick={disconnectMicrosoft}
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Disconnect Microsoft Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MicrosoftConnectionStatus />
      
      {!canAttemptConnection && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            Connection rate limited. Please wait before trying again.
          </p>
        </div>
      )}

      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">Connection Tips:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Ensure you have a stable internet connection</li>
          <li>• Make sure popups are allowed for this site</li>
          <li>• Use admin@iskconbureau.in when prompted</li>
          <li>• Try disabling ad blockers if issues persist</li>
          <li>• Clear browser cache if connection fails</li>
        </ul>
      </div>
      
      <Button 
        onClick={handleMicrosoftLogin}
        disabled={loading || !canAttemptConnection}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span>Connecting to Microsoft...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
            </svg>
            <span>Connect Microsoft 365</span>
          </div>
        )}
      </Button>
    </div>
  );
};
