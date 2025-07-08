import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MicrosoftOAuthButton } from './MicrosoftOAuthButton';
import { useMicrosoftAuth } from '@/hooks/useMicrosoftAuth';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface MicrosoftAuthPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
}

export const MicrosoftAuthPrompt: React.FC<MicrosoftAuthPromptProps> = ({ 
  isOpen, 
  onClose, 
  onSkip 
}) => {
  const { isConnected, isExpired, loading, lastError } = useMicrosoftAuth();
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Close dialog immediately when Microsoft account gets connected
  useEffect(() => {
    if (isConnected && !loading && !isExpired) {
      console.log('Microsoft connected successfully, closing prompt');
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }
      setIsConnecting(false);
      onClose();
    }
  }, [isConnected, loading, isExpired, onClose, connectionTimeout]);

  // Handle connection timeout
  useEffect(() => {
    if (isConnecting) {
      const timeout = setTimeout(() => {
        console.log('Connection timed out, resetting state');
        setIsConnecting(false);
        // Clear any lingering session data
        try {
          sessionStorage.removeItem('microsoft_auth_user_id');
          sessionStorage.removeItem('microsoft_auth_nonce');
          sessionStorage.removeItem('microsoft_auth_timestamp');
        } catch (e) {
          console.warn('Session cleanup warning:', e);
        }
      }, 30000); // 30 second timeout
      
      setConnectionTimeout(timeout);
      
      return () => {
        clearTimeout(timeout);
        setConnectionTimeout(null);
      };
    }
  }, [isConnecting]);

  // Don't show the dialog if user is not authenticated
  if (!user) {
    return null;
  }

  // Don't show the dialog if Microsoft is already connected and working
  if (isConnected && !isExpired) {
    return null;
  }

  const handleConnect = () => {
    setIsConnecting(true);
    // Clear any previous connection state
    try {
      sessionStorage.removeItem('microsoft_auth_user_id');
      sessionStorage.removeItem('microsoft_auth_nonce');
      sessionStorage.removeItem('microsoft_auth_timestamp');
      localStorage.removeItem('microsoft_auth_error');
    } catch (e) {
      console.warn('Storage cleanup warning:', e);
    }
  };

  const handleSkip = () => {
    console.log('User skipped Microsoft connection');
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }
    setIsConnecting(false);
    onSkip();
  };

  const handleClose = () => {
    console.log('User closed Microsoft prompt');
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }
    setIsConnecting(false);
    onClose();
  };

  const handleRetry = () => {
    setIsConnecting(false);
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }
    // Reset connection state
    setTimeout(() => {
      handleConnect();
    }, 500);
  };

  const needsReconnection = isExpired || (lastError && (lastError.includes('invalid_grant') || lastError.includes('AADSTS50173') || lastError.includes('expired')));

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            {isConnecting ? (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : needsReconnection ? (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                </svg>
              </div>
            )}
          </div>
          <DialogTitle className="text-center">
            {isConnecting ? 'Connecting...' : needsReconnection ? 'Reconnect Microsoft 365' : 'Connect Microsoft 365'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isConnecting ? (
              <div className="space-y-2">
                <p className="text-blue-600 font-medium">
                  Please wait while we connect to Microsoft 365...
                </p>
                <p className="text-sm text-gray-600">
                  This may take a few moments. You'll be redirected to Microsoft's login page.
                </p>
              </div>
            ) : needsReconnection ? (
              <div className="space-y-2">
                <p className="text-red-600 font-medium">
                  Your Microsoft authentication has expired and needs to be reconnected.
                </p>
                <p className="text-sm text-gray-600">
                  This typically happens after password changes or security policy updates.
                </p>
              </div>
            ) : (
              'To get the full experience of ISKCON Bureau Portal, connect your Microsoft 365 account. This will enable:'
            )}
          </DialogDescription>
        </DialogHeader>

        {isConnecting ? (
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <h4 className="font-medium text-blue-800">Connecting to Microsoft 365</h4>
                  <p className="text-sm text-blue-700">
                    If you're not redirected automatically, the connection may have failed.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handleRetry}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : needsReconnection ? (
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-800 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Authentication Issue Detected
              </h4>
              <div className="space-y-2 text-sm text-red-700">
                <p><strong>Problem:</strong> Microsoft tokens have expired or been revoked</p>
                <p><strong>Cause:</strong> Password change, security policy, or token revocation</p>
                <p><strong>Solution:</strong> Disconnect and reconnect with fresh credentials</p>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Steps to Reconnect:</h4>
              <div className="space-y-1 text-sm text-blue-700">
                <p>1. Use your current Microsoft credentials</p>
                <p>2. Ensure admin@iskconbureau.in has proper permissions</p>
                <p>3. Complete the full OAuth flow again</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">Access your Outlook emails</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-800">Create Teams meetings</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-purple-800">Sync SharePoint documents</span>
            </div>
          </div>
        )}

        {!isConnecting && (
          <div className="space-y-3">
            <Button 
              onClick={handleConnect}
              disabled={loading}
              className={`w-full ${needsReconnection ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            >
              <div className="flex items-center space-x-2">
                {needsReconnection ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                  </svg>
                )}
                <span>{needsReconnection ? 'Reconnect Microsoft 365' : 'Connect Microsoft 365'}</span>
              </div>
            </Button>
            
            {!needsReconnection && (
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleSkip}
                  className="flex-1"
                  disabled={loading}
                >
                  Skip for now
                </Button>
              </div>
            )}
          </div>
        )}
        
        <p className="text-xs text-gray-500 text-center mt-4">
          {needsReconnection ? 
            'Use the same Microsoft account (admin@iskconbureau.in) with current credentials' :
            'You can connect your Microsoft account later in Settings'
          }
        </p>
      </DialogContent>
    </Dialog>
  );
};
