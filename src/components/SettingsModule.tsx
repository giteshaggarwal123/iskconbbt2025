import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { User, Settings, Bell, Shield, Plug, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { NotificationSettings } from './NotificationSettings';
import { ProfileImageUpload } from './ProfileImageUpload';
import { MicrosoftOAuthButton } from './MicrosoftOAuthButton';
import { useToast } from '@/hooks/use-toast';
import './SettingsModule.css';
import { useUserRole } from '@/hooks/useUserRole';

const tabOptions = [
  { value: 'profile', label: 'Profile' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'auto-refresh', label: 'Auto-Refresh' },
  { value: 'backup', label: 'Backup & Restore' },
];

export const SettingsModule: React.FC = () => {
  const { user, session } = useAuth();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [autoRefreshSettings, setAutoRefreshSettings] = useState({
    pollsEnabled: true,
    pollsInterval: 5, // minutes
    outlookSyncEnabled: true,
    outlookSyncInterval: 10, // minutes
    transcriptEnabled: true,
    transcriptInterval: 15, // minutes
  });
  const [selectedTab, setSelectedTab] = useState('profile');
  const { userRole, isAdmin, isSuperAdmin } = useUserRole();

  // Filter tab options based on role and disable backup for all
  const filteredTabOptions = tabOptions.filter(opt => {
    if (opt.value === 'auto-refresh') {
      return isAdmin || isSuperAdmin;
    }
    if (opt.value === 'backup') {
      return false; // Hide backup for all
    }
    return true;
  });

  // Update form data when profile changes - use useCallback to prevent excessive updates
  const updateFormData = useCallback(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
      });
      setCurrentAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    updateFormData();
  }, [updateFormData]);

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleCancel = () => {
    updateFormData(); // Reset to current profile data
    setIsEditing(false);
  };

  const handleImageUpdate = useCallback((imageUrl: string) => {
    console.log('Image updated in settings:', imageUrl);
    setCurrentAvatarUrl(imageUrl);
    
    // Debounce the refresh to prevent excessive calls
    const timeoutId = setTimeout(() => {
      refreshProfile();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [refreshProfile]);

  const handleDownloadBackup = async () => {
    if (!user || !session) {
      toast({ title: 'Error', description: 'You must be logged in to download a backup.', variant: 'destructive' });
      console.error('No user or session:', { user, session });
      return;
    }
    try {
      const accessToken = session.access_token;
      console.log('Session:', session);
      console.log('Access Token:', accessToken);
      if (!accessToken) {
        toast({ title: 'Error', description: 'No access token found.', variant: 'destructive' });
        console.error('No access token in session:', session);
        return;
      }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-backup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        toast({ title: 'Error', description: 'Failed to download backup.', variant: 'destructive' });
        console.error('Backup fetch failed:', response.status, await response.text());
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'iskcon-portal-backup.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Backup Downloaded', description: 'Backup file has been downloaded.', variant: 'default' });
    } catch (error) {
      toast({ title: 'Error', description: 'An error occurred while downloading backup.', variant: 'destructive' });
      console.error('Backup error:', error);
    }
  };

  return (
    <>
      {/* Mobile Dropdown */}
      <div className="settings-mobile-dropdown">
        <select
          value={selectedTab}
          onChange={e => setSelectedTab(e.target.value)}
          className="w-full p-2 rounded border mb-4"
        >
          {filteredTabOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {/* Desktop Tabs */}
      <Tabs defaultValue={selectedTab} value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="settings-tabs-list">
          {filteredTabOptions.map(opt => (
            <TabsTrigger key={opt.value} value={opt.value} className="flex items-center space-x-2">
              {opt.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Image Upload Section */}
              <ProfileImageUpload 
                currentImageUrl={currentAvatarUrl}
                onImageUpdate={handleImageUpdate}
              />

              {/* User Info Display */}
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {profile?.first_name} {profile?.last_name}
                  </h3>
                  <p className="text-gray-600">
                    {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Member'}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Member'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Email cannot be changed from this interface
                </p>
              </div>

              <div className="flex space-x-2">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleSave}>Save Changes</Button>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plug className="h-5 w-5" />
                <span>Microsoft 365 Integration</span>
              </CardTitle>
              <CardDescription>
                Connect your Microsoft 365 account to access Outlook, Teams, and SharePoint features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MicrosoftOAuthButton />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="auto-refresh">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5" />
                <span>Auto-Refresh Settings</span>
              </CardTitle>
              <CardDescription>
                Control how often the portal automatically refreshes data. Reducing frequency can improve performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Polls Auto-Refresh */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Polls Refresh</h4>
                    <p className="text-sm text-gray-500">Check for expired polls and updates</p>
                  </div>
                  <Switch
                    checked={autoRefreshSettings.pollsEnabled}
                    onCheckedChange={(checked) => setAutoRefreshSettings(prev => ({ ...prev, pollsEnabled: checked }))}
                  />
                </div>
                {autoRefreshSettings.pollsEnabled && (
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="polls-interval">Interval (minutes):</Label>
                    <Input
                      id="polls-interval"
                      type="number"
                      min="1"
                      max="60"
                      value={autoRefreshSettings.pollsInterval}
                      onChange={(e) => setAutoRefreshSettings(prev => ({ ...prev, pollsInterval: parseInt(e.target.value) || 5 }))}
                      className="w-20"
                    />
                  </div>
                )}
              </div>

              {/* Outlook Sync Auto-Refresh */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Outlook Sync</h4>
                    <p className="text-sm text-gray-500">Sync meetings from Microsoft Outlook</p>
                  </div>
                  <Switch
                    checked={autoRefreshSettings.outlookSyncEnabled}
                    onCheckedChange={(checked) => setAutoRefreshSettings(prev => ({ ...prev, outlookSyncEnabled: checked }))}
                  />
                </div>
                {autoRefreshSettings.outlookSyncEnabled && (
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="outlook-interval">Interval (minutes):</Label>
                    <Input
                      id="outlook-interval"
                      type="number"
                      min="5"
                      max="60"
                      value={autoRefreshSettings.outlookSyncInterval}
                      onChange={(e) => setAutoRefreshSettings(prev => ({ ...prev, outlookSyncInterval: parseInt(e.target.value) || 10 }))}
                      className="w-20"
                    />
                  </div>
                )}
              </div>

              {/* Transcript Processing Auto-Refresh */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Transcript Processing</h4>
                    <p className="text-sm text-gray-500">Process meeting transcripts automatically</p>
                  </div>
                  <Switch
                    checked={autoRefreshSettings.transcriptEnabled}
                    onCheckedChange={(checked) => setAutoRefreshSettings(prev => ({ ...prev, transcriptEnabled: checked }))}
                  />
                </div>
                {autoRefreshSettings.transcriptEnabled && (
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="transcript-interval">Interval (minutes):</Label>
                    <Input
                      id="transcript-interval"
                      type="number"
                      min="5"
                      max="60"
                      value={autoRefreshSettings.transcriptInterval}
                      onChange={(e) => setAutoRefreshSettings(prev => ({ ...prev, transcriptInterval: parseInt(e.target.value) || 15 }))}
                      className="w-20"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">
                  <strong>Note:</strong> These settings will take effect after you refresh the page. 
                  Reducing refresh frequency can improve performance but may result in slightly delayed data updates.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Backup & Restore</span>
              </CardTitle>
              <CardDescription>
                Download a backup of all critical portal data. Use this to safeguard against data loss.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                variant="default"
                onClick={handleDownloadBackup}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Download Backup
              </Button>
              <p className="text-sm text-gray-500">This will export all users, meetings, documents, folders, and other essential data as a backup file.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};
