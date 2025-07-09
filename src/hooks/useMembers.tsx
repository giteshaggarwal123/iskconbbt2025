import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useMemberCreation } from './useMemberCreation';

interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  last_sign_in_at?: string;
  roles: string[];
  is_suspended?: boolean;
  isPending?: boolean;
  displayName: string;
  avatar_url: string;
  canLogin: boolean;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  timestamp: string;
  user_name: string;
}

export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { createMember, isCreating } = useMemberCreation();
  const [authUsers, setAuthUsers] = useState<string[]>([]); // store Auth emails

  // Fetch Auth users
  const fetchAuthUsers = useCallback(async () => {
    try {
      // Only fetch if admin
      if (!user) return;
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) {
        console.error('Error fetching Auth users:', error);
        return;
      }
      setAuthUsers(data.users.map((u: any) => u.email));
    } catch (err) {
      console.error('Error fetching Auth users:', err);
    }
  }, [user]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all profiles (registered members)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Profiles fetch error:', profilesError);
        toast({ title: "Error", description: "Failed to load members", variant: "destructive" });
        setMembers([]);
        return;
      }

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rolesError) {
        console.error('Roles fetch error:', rolesError);
        toast({ title: "Warning", description: "Some member roles could not be loaded.", variant: "default" });
      }

      // Fetch all pending invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from('member_invitations')
        .select('*')
        .order('created_at', { ascending: false });
      if (invitationsError) {
        console.error('Invitations fetch error:', invitationsError);
        toast({ title: "Warning", description: "Some member invitations could not be loaded.", variant: "default" });
      }

      // Fetch Auth users for login capability
      await fetchAuthUsers();

      // Combine registered members
      const membersData: Member[] = profiles?.map(profile => {
        let memberRoles = userRoles?.filter(role => role.user_id === profile.id) || [];
        if (profile.email === 'atd@iskconbureau.in' || profile.email === 'bgd@iskconbureau.in') {
          const hasSuperAdminRole = memberRoles.some(role => role.role === 'super_admin');
          if (!hasSuperAdminRole) {
            memberRoles = [{ user_id: profile.id, role: 'super_admin' }, ...memberRoles];
          }
        }
        if (profile.email === 'admin@iskconbureau.in') {
          const hasAdminRole = memberRoles.some(role => role.role === 'admin');
          if (!hasAdminRole) {
            memberRoles = [{ user_id: profile.id, role: 'admin' }, ...memberRoles];
          }
        }
        // Add canLogin property
        const canLogin = authUsers.includes(profile.email);
        return {
          id: profile.id,
          email: profile.email || '',
          first_name: profile.first_name?.trim() || '',
          last_name: profile.last_name?.trim() || '',
          phone: profile.phone || '',
          created_at: profile.created_at || '',
          last_sign_in_at: undefined,
          roles: memberRoles.map(role => role.role),
          is_suspended: profile.is_suspended || false,
          isPending: false,
          avatar_url: profile.avatar_url || '',
          displayName: (profile.first_name?.trim() || profile.last_name?.trim()) ? `${profile.first_name?.trim() || ''} ${profile.last_name?.trim() || ''}`.trim() : (profile.email || profile.id),
          canLogin,
        };
      }) || [];

      // Add pending invitations that are not already registered
      const registeredEmails = new Set(membersData.map(m => m.email));
      const pendingInvites: Member[] = (invitations || [])
        .filter(invite => !registeredEmails.has(invite.email))
        .map(invite => ({
          id: `invite-${invite.id}`,
          email: invite.email,
          first_name: invite.first_name || '',
          last_name: invite.last_name || '',
          phone: invite.phone || '',
          created_at: invite.created_at || '',
          last_sign_in_at: undefined,
          roles: [invite.role],
          is_suspended: false,
          isPending: true,
          avatar_url: '',
          displayName: (invite.first_name?.trim() || invite.last_name?.trim()) ? `${invite.first_name?.trim() || ''} ${invite.last_name?.trim() || ''}`.trim() : (invite.email || invite.id),
          canLogin: false, // Pending invites cannot login
        }));

      // Merge and sort by created_at descending
      const mergedMembers = [...membersData, ...pendingInvites].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMembers(mergedMembers);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchAuthUsers]);

  // Enhanced real-time subscriptions
  useEffect(() => {
    let profilesSubscription: any;
    let rolesSubscription: any;

    const setupSubscriptions = async () => {
      if (!user) return;

      console.log('Setting up real-time subscriptions...');

      // Initial fetch
      await fetchMembers();

      // Subscribe to profiles changes
      profilesSubscription = supabase
        .channel('profiles-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles'
          },
          async (payload) => {
            console.log('Profiles real-time change detected:', payload);
            // Refresh data immediately
            await fetchMembers();
          }
        )
        .subscribe((status) => {
          console.log('Profiles subscription status:', status);
        });

      // Subscribe to user roles changes
      rolesSubscription = supabase
        .channel('user-roles-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_roles'
          },
          async (payload) => {
            console.log('User roles real-time change detected:', payload);
            // Refresh data immediately
            await fetchMembers();
          }
        )
        .subscribe((status) => {
          console.log('User roles subscription status:', status);
        });
    };

    setupSubscriptions();

    return () => {
      if (profilesSubscription) {
        console.log('Cleaning up profiles subscription');
        supabase.removeChannel(profilesSubscription);
      }
      if (rolesSubscription) {
        console.log('Cleaning up roles subscription');
        supabase.removeChannel(rolesSubscription);
      }
    };
  }, [user, fetchMembers]);

  // Optimistic update for immediate UI feedback
  const updateMemberOptimistically = useCallback((memberId: string, updates: Partial<Member>) => {
    console.log('Optimistic update for member:', memberId, updates);
    setMembers(prevMembers => 
      prevMembers.map(member => 
        member.id === memberId 
          ? { ...member, ...updates }
          : member
      )
    );
  }, []);

  const addMember = async (memberData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: string;
    password: string;
    notes?: string;
  }) => {
    const result = await createMember(memberData);
    
    if (result) {
      await logActivity('Added new member', `Added ${memberData.firstName} ${memberData.lastName} as ${memberData.role.replace('_', ' ')}`);
      
      // Force immediate refresh
      await fetchMembers();
    }
    
    return result;
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      // Check if this is trying to modify super admin
      const member = members.find(m => m.id === memberId);
      if (member?.email === 'atd@iskconbureau.in' && newRole !== 'super_admin') {
        toast({
          title: "Access Denied",
          description: "Cannot change the role of the system super admin",
          variant: "destructive"
        });
        return;
      }

      console.log('Updating member role:', { memberId, newRole });

      // Optimistic update with proper role change
      updateMemberOptimistically(memberId, { roles: [newRole] });

      // Start a transaction-like operation
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', memberId);

      if (deleteError) {
        console.error('Error deleting existing roles:', deleteError);
        // Revert optimistic update
        await fetchMembers();
        throw deleteError;
      }

      // Add new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: memberId,
          role: newRole as any
        });

      if (insertError) {
        console.error('Error adding new role:', insertError);
        // Revert optimistic update
        await fetchMembers();
        throw insertError;
      }

      await logActivity('Updated member role', `Changed role to ${newRole.replace('_', ' ')}`);

      toast({
        title: "Role Updated Successfully",
        description: `Member role has been changed to ${newRole.replace('_', ' ')}`,
      });

      // Force refresh to ensure consistency after a delay
      setTimeout(async () => {
        await fetchMembers();
      }, 1000);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Role Update Failed",
        description: error.message || "Failed to update member role",
        variant: "destructive"
      });
    }
  };

  const deleteMember = async (memberId: string) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) {
        toast({
          title: 'Delete Failed',
          description: 'Member not found',
          variant: 'destructive',
        });
        return;
      }
      if (member.isPending) {
        // Delete pending invitation
        const inviteId = memberId.replace('invite-', '');
        const { error: inviteError } = await supabase.from('member_invitations').delete().eq('id', inviteId);
        if (inviteError) {
          toast({
            title: 'Delete Failed',
            description: inviteError.message,
            variant: 'destructive',
          });
          return;
        }
        toast({
          title: 'Invitation Deleted',
          description: 'Pending invitation has been removed.',
        });
        await fetchMembers();
        return;
      }
      // Check if this is trying to delete super admin
      if (member.email === 'atd@iskconbureau.in') {
        toast({
          title: "Access Denied",
          description: "Cannot delete the system super admin",
          variant: "destructive"
        });
        return;
      }
      // Delete user roles first
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', memberId);
      if (rolesError) {
        console.error('Error deleting user roles:', rolesError);
        // Continue anyway, profile deletion is more important
      }
      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', memberId);
      if (profileError) {
        console.error('Error deleting profile:', profileError);
        throw profileError;
      }
      await logActivity('Deleted member', `Removed member from bureau`);
      toast({
        title: "Member Deleted",
        description: "Member has been removed successfully"
      });
      // Force immediate refresh
      await fetchMembers();
    } catch (error: any) {
      console.error('Error deleting member:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete member",
        variant: "destructive"
      });
    }
  };

  const suspendMember = async (memberId: string, suspend: boolean) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (member?.email === 'atd@iskconbureau.in') {
        toast({
          title: "Access Denied",
          description: "Cannot suspend the system super admin",
          variant: "destructive"
        });
        return;
      }

      console.log('Suspending member:', { memberId, suspend });

      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: suspend })
        .eq('id', memberId);

      if (error) throw error;

      await logActivity(suspend ? 'Suspended member' : 'Unsuspended member', 
        `Account ${suspend ? 'suspended' : 'reactivated'}`);

      toast({
        title: suspend ? "Member Suspended" : "Member Unsuspended",
        description: `Account has been ${suspend ? 'suspended' : 'reactivated'} successfully`
      });

      // Force immediate refresh
      await fetchMembers();
    } catch (error: any) {
      console.error('Error suspending member:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update member status",
        variant: "destructive"
      });
    }
  };

  const resetPassword = async (memberId: string) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) {
        toast({
          title: "Error",
          description: "Member not found",
          variant: "destructive"
        });
        return;
      }

      console.log('Sending password reset email via Outlook for member:', memberId);

      // Send password reset email using the existing send-otp edge function with Outlook integration
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          phoneNumber: member.email, // Using email for password reset
          name: `${member.first_name} ${member.last_name}`,
          type: 'password_reset',
          userId: user?.id // Pass current user ID to get their Microsoft token
        }
      });

      if (error) {
        console.error('Error sending password reset email:', error);
        
        // Provide specific error message if Microsoft account not connected
        if (error.message?.includes('Microsoft account')) {
          toast({
            title: "Microsoft Account Required",
            description: "Please connect your Microsoft account in Settings to send password reset emails via Outlook.",
            variant: "destructive"
          });
          return;
        }
        
        throw error;
      }

      console.log('Password reset email sent successfully via Outlook:', data);

      await logActivity('Reset password', `Password reset email sent via Outlook to ${member.first_name} ${member.last_name}`);

      toast({
        title: "Password Reset Email Sent via Outlook",
        description: `A password reset email has been sent to ${member.email} through your connected Outlook account. The temporary password is valid for 24 hours.`
      });
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      toast({
        title: "Reset Failed", 
        description: error.message || "Failed to send password reset email via Outlook",
        variant: "destructive"
      });
    }
  };

  const exportMembers = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Role', 'Join Date'],
      ...members.map(member => [
        `${member.first_name} ${member.last_name}`,
        member.email,
        member.phone || '',
        member.roles[0] || 'member',
        new Date(member.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members-export.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Members list has been exported successfully"
    });
  };

  const logActivity = async (action: string, details?: string) => {
    if (!user) return;

    try {
      console.log('Activity logged:', {
        user_id: user.id,
        action,
        details,
        timestamp: new Date().toISOString()
      });

      const newLog = {
        id: Date.now().toString(),
        user_id: user.id,
        action,
        timestamp: new Date().toISOString(),
        user_name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email || 'Unknown User'
      };

      setActivityLogs(prev => [newLog, ...prev].slice(0, 10));
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const searchMembers = (searchTerm: string) => {
    const sortAlpha = (a: Member, b: Member) => {
      const nameA = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    };
    if (!searchTerm.trim()) return [...members].sort(sortAlpha);
    const term = searchTerm.toLowerCase();
    return members
      .filter(member =>
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.roles.some(role => role.toLowerCase().includes(term)) ||
        (member.phone && member.phone.includes(searchTerm))
      )
      .sort(sortAlpha);
  };

  // Admin password reset for a member
  const resetMemberPassword = async (memberId: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.admin.updateUser(memberId, { password: newPassword });
      if (error) {
        toast({
          title: 'Password Reset Failed',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }
      toast({
        title: 'Password Reset',
        description: 'Password updated successfully.',
        variant: 'default',
      });
      return true;
    } catch (err: any) {
      toast({
        title: 'Password Reset Failed',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    members,
    activityLogs,
    loading: loading || isCreating,
    addMember,
    updateMemberRole,
    deleteMember,
    suspendMember,
    resetPassword,
    exportMembers,
    fetchMembers,
    forceRefresh: fetchMembers,
    logActivity,
    searchMembers,
    updateMemberOptimistically,
    resetMemberPassword,
  };
};
