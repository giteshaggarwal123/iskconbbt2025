import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  File, 
  Users, 
  Settings, 
  Mail, 
  Clock,
  User,
  Check,
  LogOut,
  Home
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentModule: string;
  onModuleChange: (module: string) => void;
  avatarRefreshTrigger?: number;
  isCollapsed?: boolean;
}

const allMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, requiredPermission: 'canAccessDashboard' },
  { id: 'meetings', label: 'Meetings', icon: Calendar, requiredPermission: 'canAccessMeetings' },
  { id: 'documents', label: 'Documents', icon: File, requiredPermission: 'canAccessDocuments' },
  { id: 'voting', label: 'Voting', icon: Check, requiredPermission: 'canAccessVoting' },
  { id: 'attendance', label: 'Attendance', icon: Clock, requiredPermission: 'canAccessAttendance' },
  { id: 'email', label: 'Email', icon: Mail, requiredPermission: 'canAccessEmail' },
  { id: 'members', label: 'Members', icon: Users, requiredPermission: 'canAccessMembersModule' },
  { id: 'settings', label: 'Settings', icon: Settings, requiredPermission: 'canAccessSettings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  currentModule, 
  onModuleChange, 
  onClose,
  avatarRefreshTrigger = 0,
  isCollapsed = false
}: SidebarProps) => {
  const { user, signOut } = useAuth();
  const userRole = useUserRole();
  const { profile, refreshProfile } = useProfile();
  const isMobile = useIsMobile();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [profileRefreshTrigger, setProfileRefreshTrigger] = useState(0);

  // Enhanced profile update handling
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent<any>) => {
      console.log('Sidebar received profile update:', event.detail);
      if (event.detail.userId === user?.id) {
        setProfileRefreshTrigger((prev: number) => prev + 1);
        refreshProfile();
      }
    };

    const handleAvatarUpdate = (event: CustomEvent<any>) => {
      console.log('Sidebar received avatar update:', event.detail);
      if (event.detail.userId === user?.id) {
        setProfileRefreshTrigger((prev: number) => prev + 1);
        refreshProfile();
      }
    };

    const handleForceAvatarRefresh = (event: CustomEvent<any>) => {
      console.log('Sidebar received force avatar refresh:', event.detail);
      if (event.detail.userId === user?.id) {
        setProfileRefreshTrigger((prev: number) => prev + 1);
        refreshProfile();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    window.addEventListener('forceAvatarRefresh', handleForceAvatarRefresh as EventListener);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
      window.removeEventListener('forceAvatarRefresh', handleForceAvatarRefresh as EventListener);
    };
  }, [user?.id, refreshProfile]);

  // Re-fetch profile when user changes
  useEffect(() => {
    if (user?.id) {
      refreshProfile();
    }
  }, [user?.id, refreshProfile]);

  const menuItems = allMenuItems.filter(item => {
    if (!item.requiredPermission) return true;
    return userRole[item.requiredPermission as keyof typeof userRole];
  });

  // Enhanced user name extraction with better fallbacks
  const userName = React.useMemo<string>(() => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    if (profile?.email) {
      return profile.email.split('@')[0];
    }
    if (user?.user_metadata?.first_name || user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim();
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  }, [profile, user]);
  
  const userEmail = profile?.email || user?.email || 'user@iskcon.org';

  const handleItemClick = (itemId: string): void => {
    onModuleChange(itemId);
    if (isMobile) {
      onClose();
    }
  };

  const handleLogoutConfirm = async (): Promise<void> => {
    await signOut();
    setShowLogoutDialog(false);
    if (isMobile) {
      onClose();
    }
  };

  const handleProfileClick = (): void => {
    onModuleChange('settings');
    if (isMobile) {
      onClose();
    }
  };

  return (
    <div className={`fixed transform transition-all duration-300 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } ${isMobile ? 'w-64 top-12 bottom-0 z-50' : 'top-16 bottom-0 lg:translate-x-0 z-20'} ${
      !isMobile && isCollapsed ? 'w-20' : 'w-64'
    } left-0 bg-white shadow-xl`}>
      <div className="flex flex-col h-full">
        {/* Navigation - Starts directly with menu items */}
        <nav className="flex-1 px-4 pt-6 pb-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                currentModule === item.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:bg-secondary hover:text-gray-900'
              } ${!isMobile && isCollapsed ? 'justify-center px-2' : ''}`}
              title={!isMobile && isCollapsed ? item.label : undefined}
            >
              <item.icon className={`h-5 w-5 flex-shrink-0 ${(!isCollapsed || isMobile) ? 'mr-3' : ''}`} />
              {(!isCollapsed || isMobile) && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          ))}
          
          {/* Logout Button */}
          <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors mt-4 ${
                  !isMobile && isCollapsed ? 'justify-center px-2' : 'justify-start'
                }`}
                title={!isMobile && isCollapsed ? 'Logout' : undefined}
              >
                <LogOut className={`h-5 w-5 flex-shrink-0 ${(!isCollapsed || isMobile) ? 'mr-3' : ''}`} />
                {(!isCollapsed || isMobile) && 'Logout'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be signed out of your account and redirected to the login page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogoutConfirm}>
                  Yes, Log Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </nav>

        {/* User Profile Section - Enhanced */}
        {(!isCollapsed || isMobile) && (
          <div className="border-t border-gray-200 p-4">
            <button 
              onClick={handleProfileClick}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={userName} className="h-10 w-10 rounded-full object-cover" />
              ) : user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt={userName} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-500">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userEmail}
                </p>
              </div>
            </button>
          </div>
        )}
        
        {/* Collapsed user profile */}
        {!isMobile && isCollapsed && (
          <div className="border-t border-gray-200 p-4 flex justify-center">
            <button 
              onClick={handleProfileClick}
              className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
              title={userName}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={userName} className="h-10 w-10 rounded-full object-cover" />
              ) : user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt={userName} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-500">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
