
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Smartphone, Globe, AlertCircle, Monitor, Wifi, Loader, Settings } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Badge } from '@/components/ui/badge';

export const NotificationSettings: React.FC = () => {
  const { isSupported, permissionStatus, requestPermission, isNative, isLoading } = usePushNotifications();

  const getPermissionIcon = () => {
    if (isLoading) {
      return <Loader className="h-4 w-4 animate-spin text-gray-400" />;
    }
    
    switch (permissionStatus) {
      case 'granted':
        return <Bell className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'prompt-with-rationale':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPermissionBadge = () => {
    if (isLoading) {
      return <Badge variant="secondary">Checking...</Badge>;
    }
    
    switch (permissionStatus) {
      case 'granted':
        return <Badge className="bg-green-100 text-green-800">Enabled</Badge>;
      case 'denied':
        return <Badge variant="destructive">Disabled</Badge>;
      case 'prompt-with-rationale':
        return <Badge variant="secondary">Needs Permission</Badge>;
      default:
        return <Badge variant="secondary">Not Set</Badge>;
    }
  };

  const getPlatformIcon = () => {
    return isNative ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />;
  };

  const getPlatformBadge = () => {
    return (
      <Badge variant="outline" className="ml-2">
        {isNative ? 'Mobile App' : 'Web Browser'}
      </Badge>
    );
  };

  const isPermissionGranted = permissionStatus === 'granted';
  const canRequestPermission = permissionStatus !== 'granted' && isSupported && !isLoading;

  const getStatusMessage = () => {
    if (!isSupported) {
      return isNative 
        ? 'Push notifications are not available on this device. Please check your device settings.'
        : 'Your browser does not support web push notifications. Try using Chrome, Firefox, or Edge.';
    }
    
    if (permissionStatus === 'denied') {
      return isNative
        ? 'Notifications are blocked. Please enable them in your device Settings > Apps > ISKCON Management Portal > Notifications.'
        : 'Please enable notifications in your browser settings to receive important updates.';
    }
    
    if (permissionStatus === 'prompt-with-rationale') {
      return 'This app needs permission to send you important notifications about meetings, votes, and documents.';
    }
    
    return null;
  };

  const openDeviceSettings = () => {
    if (isNative) {
      // For mobile apps, we can't directly open settings but we can guide the user
      alert('Please go to your device Settings > Apps > ISKCON Management Portal > Notifications and enable them manually.');
    } else {
      // For web, we can provide guidance
      alert('Please click on the lock icon in your browser address bar and enable notifications.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Notification Settings</h3>
        <p className="text-sm text-gray-600">
          Configure how you want to receive notifications from the ISKCON Bureau Management Portal
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getPlatformIcon()}
            <span>Push Notifications</span>
            {getPermissionBadge()}
            {getPlatformBadge()}
          </CardTitle>
          <CardDescription>
            Receive instant notifications for meetings, voting, documents, and other important updates
            {!isSupported && (
              <span className="block mt-2 text-red-600 font-medium">
                Push notifications are not supported on this platform
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getPermissionIcon()}
              <Label>Push Notifications</Label>
              {isSupported && (
                <Badge variant="outline" className="text-xs">
                  {isNative ? 'Native' : 'Web Push'}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {canRequestPermission && (
                <Button 
                  onClick={requestPermission}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    'Enable Notifications'
                  )}
                </Button>
              )}
              {!isSupported && (
                <Badge variant="outline" className="text-red-600">
                  Not Supported
                </Badge>
              )}
            </div>
          </div>

          {!isSupported && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Wifi className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Platform Not Supported
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {getStatusMessage()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isPermissionGranted && (
            <div className="space-y-3 pl-6 border-l-2 border-green-200">
              <p className="text-sm text-green-600 font-medium">
                ✅ Notifications are enabled and working!
              </p>
              <div className="flex items-center justify-between">
                <Label htmlFor="meeting-notifications">Meeting Notifications</Label>
                <Switch id="meeting-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="voting-notifications">Voting & Poll Notifications</Label>
                <Switch id="voting-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="document-notifications">Document Notifications</Label>
                <Switch id="document-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <Switch id="email-notifications" defaultChecked />
              </div>
            </div>
          )}

          {(permissionStatus === 'denied' || permissionStatus === 'prompt-with-rationale') && isSupported && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {permissionStatus === 'denied' ? 'Notifications Blocked' : 'Permission Required'}
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    {getStatusMessage()}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      onClick={requestPermission}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Trying...
                        </>
                      ) : (
                        permissionStatus === 'denied' ? 'Try Again' : 'Grant Permission'
                      )}
                    </Button>
                    {permissionStatus === 'denied' && isNative && (
                      <Button 
                        onClick={openDeviceSettings}
                        size="sm"
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Device Settings
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>In-App Notifications</span>
            <Badge className="bg-blue-100 text-blue-800">Always On</Badge>
          </CardTitle>
          <CardDescription>
            Notifications that appear within the application interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Toast Notifications</Label>
            <Switch defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <Label>Notification Bell</Label>
            <Switch defaultChecked disabled />
          </div>
          <div className="flex items-center justify-between">
            <Label>Sound Alerts</Label>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
