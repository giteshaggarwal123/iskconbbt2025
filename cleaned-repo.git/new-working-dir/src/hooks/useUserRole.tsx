import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'super_admin' | 'admin' | 'member';

interface UseUserRoleReturn {
  userRole: UserRole | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isMember: boolean;
  loading: boolean;
  canManageMembers: boolean;
  canManageMeetings: boolean;
  canManageDocuments: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canCreateContent: boolean;
  canDeleteContent: boolean;
  canEditContent: boolean;
  canEditAllUserInfo: boolean;
  canEditUserRoles: boolean;
  canDeleteUsers: boolean;
  canEditPhoneNumbers: boolean;
  canViewMemberSettings: boolean;
  canViewMembers: boolean;
  canScheduleMeetings: boolean;
  canDeleteMeetings: boolean;
  canEditVoting: boolean;
  canCreateVoting: boolean;
  canVoteOnly: boolean;
  canMarkAttendanceOnly: boolean;
  canAccessDashboard: boolean;
  canAccessMeetings: boolean;
  canAccessDocuments: boolean;
  canAccessVoting: boolean;
  canAccessAttendance: boolean;
  canAccessEmail: boolean;
  canAccessMembersModule: boolean;
  canAccessReports: boolean;
  canAccessSettings: boolean;
  user: any;
}

export const useUserRole = (): UseUserRoleReturn => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching role for user:', user.email);
        
        // Use the new database function to get current user role
        const { data, error } = await supabase.rpc('get_current_user_role');

        if (error) {
          console.error('Error fetching user role:', error);
          // Default to member if error occurs
          setUserRole('member');
        } else {
          console.log('User role from database function:', data);
          setUserRole(data as UserRole);
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setUserRole('member');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    // Set up real-time subscription for role changes
    const subscription = supabase
      .channel('user-role-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          console.log('User role changed, refetching...');
          fetchUserRole();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const isSuperAdmin = userRole === 'super_admin' && (user?.email === 'cs@iskconbureau.in' || user?.email === 'bgd@iskconbureau.in');
  const isAdmin = userRole === 'admin' || isSuperAdmin;
  const isMember = userRole === 'member' || isAdmin || isSuperAdmin;

  // Module access permissions
  const canAccessDashboard = true; // All users can access dashboard
  const canAccessMeetings = true; // All users can access meetings
  const canAccessDocuments = true; // All users can access documents
  const canAccessVoting = true; // All users can access voting
  const canAccessAttendance = true; // All users can access attendance
  const canAccessEmail = true; // All users can access email
  const canAccessMembersModule = isSuperAdmin || isAdmin; // Only admins can access members module
  const canAccessReports = isSuperAdmin || isAdmin; // Only admins can access reports
  const canAccessSettings = true; // All users can access settings

  // Enhanced permissions with proper role separation
  const canManageMembers = isSuperAdmin || isAdmin;
  const canManageMeetings = isSuperAdmin || isAdmin;
  const canManageDocuments = isSuperAdmin || isAdmin;
  const canViewReports = isSuperAdmin || isAdmin;
  const canManageSettings = true; // All members can access settings
  
  // Content permissions
  const canCreateContent = isSuperAdmin || isAdmin;
  const canDeleteContent = isSuperAdmin || isAdmin;
  const canEditContent = isSuperAdmin || isAdmin;

  // Enhanced user management permissions
  const canEditAllUserInfo = isSuperAdmin;
  const canEditUserRoles = isSuperAdmin || isAdmin;
  const canDeleteUsers = isSuperAdmin || isAdmin;
  const canEditPhoneNumbers = isSuperAdmin || isAdmin;
  const canViewMemberSettings = isSuperAdmin || isAdmin;

  // Specific permissions for members
  const canViewMembers = isSuperAdmin || isAdmin;
  const canScheduleMeetings = isSuperAdmin || isAdmin;
  const canDeleteMeetings = isSuperAdmin || isAdmin;
  const canEditVoting = isSuperAdmin || isAdmin;
  const canCreateVoting = isSuperAdmin || isAdmin;
  const canVoteOnly = userRole === 'member';
  const canMarkAttendanceOnly = userRole === 'member';

  return {
    userRole,
    isSuperAdmin,
    isAdmin,
    isMember,
    loading,
    canManageMembers,
    canManageMeetings,
    canManageDocuments,
    canViewReports,
    canManageSettings,
    canCreateContent,
    canDeleteContent,
    canEditContent,
    canEditAllUserInfo,
    canEditUserRoles,
    canDeleteUsers,
    canEditPhoneNumbers,
    canViewMemberSettings,
    canViewMembers,
    canScheduleMeetings,
    canDeleteMeetings,
    canEditVoting,
    canCreateVoting,
    canVoteOnly,
    canMarkAttendanceOnly,
    canAccessDashboard,
    canAccessMeetings,
    canAccessDocuments,
    canAccessVoting,
    canAccessAttendance,
    canAccessEmail,
    canAccessMembersModule,
    canAccessReports,
    canAccessSettings,
    user
  };
};
