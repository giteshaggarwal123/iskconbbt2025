
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Unlink, ExternalLink } from 'lucide-react';
import { useMicrosoftAuth } from '@/hooks/useMicrosoftAuth';
import { useToast } from '@/hooks/use-toast';

export const MicrosoftConnectionStatus: React.FC = () => {
  const { isConnected, isExpired, loading, disconnectMicrosoft, forceRefresh, lastError } = useMicrosoftAuth();
  const { toast } = useToast();

  const getStatusConfig = () => {
    if (loading) {
      return {
        icon: RefreshCw,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        text: 'Checking...',
        description: 'Verifying Microsoft 365 connection'
      };
    }

    if (isConnected && !isExpired) {
      return {
        icon: CheckCircle,
        color: 'bg-green-100 text-green-800 border-green-200',
        text: 'Microsoft 365 Connected',
        description: 'Microsoft 365 services are available and tokens are automatically refreshed'
      };
    }

    if (isExpired || (lastError && (lastError.includes('invalid_grant') || lastError.includes('AADSTS50173') || lastError.includes('expired')))) {
      return {
        icon: AlertCircle,
        color: 'bg-red-100 text-red-800 border-red-200',
        text: 'Authentication Expired',
        description: 'Microsoft account authentication has expired. This usually happens after a password change, security policy update, or when tokens are revoked. Please disconnect and reconnect your account.'
      };
    }

    if (lastError) {
      return {
        icon: XCircle,
        color: 'bg-red-100 text-red-800 border-red-200',
        text: 'Connection Error',
        description: lastError
      };
    }

    return {
      icon: XCircle,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      text: 'Not Connected',
      description: 'Connect your Microsoft account in Settings to access Outlook, Teams, and SharePoint'
    };
  };

  const handleRefresh = () => {
    forceRefresh();
    toast({
      title: "Refreshing Connection",
      description: "Checking and refreshing Microsoft 365 connection..."
    });
  };

  const handleDisconnect = async () => {
    await disconnectMicrosoft();
    toast({
      title: "Microsoft Account Disconnected",
      description: "You can now reconnect with fresh authentication credentials.",
      variant: "default"
    });
  };

  const handleReconnect = () => {
    // Navigate to settings
    const event = new CustomEvent('navigate-to-module', {
      detail: { module: 'settings' }
    });
    window.dispatchEvent(event);
    
    toast({
      title: "Go to Settings",
      description: "Navigate to Settings → Integrations to reconnect your Microsoft account.",
    });
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;
  const needsReconnection = isExpired || (lastError && (lastError.includes('invalid_grant') || lastError.includes('AADSTS50173') || lastError.includes('expired')));

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`${config.color} border flex items-center space-x-1 px-2 py-1`}
            >
              <IconComponent 
                className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} 
              />
              <span className="text-xs font-medium">{config.text}</span>
            </Badge>
            {!loading && (
              <div className="flex items-center space-x-1">
                {needsReconnection ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDisconnect}
                      className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Unlink className="h-3 w-3 mr-1" />
                      <span className="text-xs">Disconnect</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReconnect}
                      className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      <span className="text-xs">Reconnect</span>
                    </Button>
                  </>
                ) : (
                  <>
                    {!needsReconnection && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        className="h-6 w-6 p-0"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                    {(isConnected || lastError) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDisconnect}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <Unlink className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="text-sm mb-2">{config.description}</p>
            {!isConnected && !needsReconnection && (
              <p className="text-xs text-muted-foreground">
                Go to Settings → Integrations to connect
              </p>
            )}
            {needsReconnection && (
              <div className="space-y-2">
                <div className="p-2 bg-red-50 rounded border border-red-200">
                  <p className="text-xs text-red-800 font-medium mb-1">
                    🚨 Action Required: Reconnect Microsoft Account
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs text-red-700">
                      <strong>Quick Fix:</strong>
                    </p>
                    <p className="text-xs text-red-600">
                      1. Click "Disconnect" button above<br/>
                      2. Click "Reconnect" to go to Settings<br/>
                      3. Click "Connect Microsoft 365" again<br/>
                      4. Sign in with admin@iskconbureau.in
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This happens when passwords change or tokens are revoked by Microsoft security policies.
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
