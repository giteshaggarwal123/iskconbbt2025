import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Settings, MessageCircle, Trash2, Lock, UserX, RotateCcw, Activity, Edit3, Crown, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MemberSettingsDialog } from './MemberSettingsDialog';
import { MemberActivityDialog } from './MemberActivityDialog';
import { MemberEditDialog } from './MemberEditDialog';
import { OwnershipTransferDialog } from './OwnershipTransferDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  roles: string[];
  is_suspended?: boolean;
  isPending?: boolean;
  avatar_url?: string;
  displayName?: string;
  canLogin?: boolean; // Added canLogin to the interface
}

interface MemberCardProps {
  member: Member;
  onRoleChange: (memberId: string, newRole: string) => void;
  onDeleteMember: (memberId: string) => void;
  onSuspendMember?: (memberId: string, suspend: boolean) => void;
  onResetPassword?: (memberId: string) => void;
  onMemberUpdated?: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ 
  member, 
  onRoleChange, 
  onDeleteMember, 
  onSuspendMember,
  onResetPassword,
  onMemberUpdated 
}) => {
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showOwnershipTransferDialog, setShowOwnershipTransferDialog] = useState(false);
  const [avatarRefreshTrigger, setAvatarRefreshTrigger] = useState(0);
  const userRole = useUserRole();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Listen for avatar updates to refresh member avatars
  React.useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      console.log('MemberCard received avatar update:', event.detail);
      if (event.detail.userId === member.id) {
        setAvatarRefreshTrigger(prev => prev + 1);
      }
    };

    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('MemberCard received profile update:', event.detail);
      if (event.detail.userId === member.id) {
        setAvatarRefreshTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, [member.id]);

  const getRoleBadge = (role: string) => {
    const roleColors: { [key: string]: string } = {
      'super_admin': 'bg-red-500 text-white',
      'admin': 'bg-blue-500 text-white',
      'member': 'bg-gray-500 text-white'
    };
    return <Badge className={roleColors[role] || 'bg-gray-500 text-white'}>
      {role === 'super_admin' ? 'Super Admin' : role.replace('_', ' ')}
    </Badge>;
  };

  // Fixed role detection logic - atd@iskconbureau.in and bgd@iskconbureau.in can be super admin
  const getActualRole = (memberEmail: string, memberRoles: string[]): string => {
    if (memberEmail === 'atd@iskconbureau.in' || memberEmail === 'bgd@iskconbureau.in') {
      return 'super_admin';
    }
    const rawRole = memberRoles[0] || 'member';
    // Only convert legacy roles, do NOT override super_admin
    if (rawRole === 'secretary' || rawRole === 'treasurer') {
      return 'member';
    }
    return rawRole;
  };

  const actualRole = getActualRole(member.email, member.roles);
  const joinDate = new Date(member.created_at).toLocaleDateString();
  const userName = `${member.first_name} ${member.last_name}`.trim() || member.email;

  // Add login capability indicator
  const loginIndicator = member.canLogin ? (
    <Badge className="bg-green-500 text-white flex items-center gap-1" title="Can log in">
      <CheckCircle className="h-4 w-4 mr-1" /> Can Log In
    </Badge>
  ) : (
    <Badge className="bg-red-500 text-white flex items-center gap-1" title="No login account">
      <XCircle className="h-4 w-4 mr-1" /> No Login
    </Badge>
  );

  // Get current user profile for ownership transfer
  const getCurrentUserProfile = (): Member => {
    return {
      id: user?.id || '',
      email: user?.email || '',
      first_name: user?.user_metadata?.first_name || '',
      last_name: user?.user_metadata?.last_name || '',
      created_at: new Date().toISOString(),
      roles: ['super_admin']
    };
  };

  const handleDeleteMember = async () => {
    setDeleteError(null);
    try {
      await onDeleteMember(member.id);
      setDeleteDialogOpen(false);
    } catch (error: any) {
      setDeleteError(error?.message || 'Failed to delete member.');
    }
  };

  const handleSuspendMember = () => {
    if (onSuspendMember) {
      onSuspendMember(member.id, !member.is_suspended);
    }
  };

  const handleResetPassword = () => {
    if (onResetPassword) {
      onResetPassword(member.id);
    }
  };

  const handleMemberUpdated = () => {
    if (onMemberUpdated) {
      onMemberUpdated();
    }
  };

  const handleRoleChange = async (newRole: string) => {
    console.log('Role change requested:', { memberId: member.id, newRole, currentRole: actualRole });
    
    // Handle super admin transfer
    if (newRole === 'super_admin' && actualRole !== 'super_admin') {
      setShowOwnershipTransferDialog(true);
      return;
    }
    
    // Regular role change
    await onRoleChange(member.id, newRole);
  };

  const handleOwnershipTransferComplete = () => {
    handleMemberUpdated();
  };

  // Enhanced permission logic with proper super admin protection
  const canChangeRole = userRole.isSuperAdmin && member.email !== 'atd@iskconbureau.in';
  const canDeleteMember = userRole.isSuperAdmin && member.email !== 'atd@iskconbureau.in';
  const canViewSettings = true;
  const canSendMessage = true;
  const canSuspendMember = false;
  const canResetPassword = userRole.isSuperAdmin && member.email !== 'atd@iskconbureau.in';
  const canViewActivity = true;
  const canEditMember = userRole.isSuperAdmin;
  const canTransferOwnership = userRole.isSuperAdmin && actualRole !== 'super_admin' && member.email !== 'atd@iskconbureau.in';
  
  // Super admin protection
  const isSuperAdminMember = member.email === 'atd@iskconbureau.in';
  const isProtectedMember = isSuperAdminMember;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`${isMobile ? 'flex flex-col space-y-4' : 'flex items-center justify-between'}`}>
            <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center space-x-4'}`}>
              <div className={`${isMobile ? 'flex items-center space-x-3' : 'flex items-center space-x-4'}`}>
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.displayName || member.first_name || member.email || 'User'} className="h-10 w-10 rounded-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-500">
                    {(member.displayName || member.first_name || member.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 truncate`}>
                    {member.first_name} {member.last_name}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{userName}</span>
                    {loginIndicator}
                  </div>
                  <div className={`${isMobile ? 'flex flex-col space-y-1' : 'flex items-center space-x-4'} ${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 mt-1`}>
                    <span className="flex items-center space-x-1 min-w-0">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </span>
                    {member.phone && (
                      <span className="flex items-center space-x-1">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{member.phone}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {getRoleBadge(actualRole)}
                <Badge variant="outline" className={`${isMobile ? 'text-xs' : 'text-xs'}`}>
                  Joined {joinDate}
                </Badge>
                {isSuperAdminMember && (
                  <Badge className="bg-gold-500 text-white text-xs">System Admin</Badge>
                )}
                {member.is_suspended && (
                  <Badge className="bg-red-100 text-red-800 text-xs">
                    <UserX className="h-3 w-3 mr-1" />
                    Suspended
                  </Badge>
                )}
                {isProtectedMember && (
                  <Badge className="bg-amber-100 text-amber-800 text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Protected
                  </Badge>
                )}
              </div>
            </div>
            
            <div className={`${isMobile ? 'flex flex-col space-y-3 w-full' : 'text-right space-y-3'}`}>
              <div className={`${isMobile ? 'w-full' : ''}`}>
                <label className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 block mb-1`}>Role</label>
                <Select 
                  value={actualRole} 
                  onValueChange={handleRoleChange}
                  disabled={!canChangeRole || isProtectedMember}
                >
                  <SelectTrigger className={`${isMobile ? 'w-full h-8' : 'w-32'}`} aria-label="Change Role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {userRole.isSuperAdmin && (
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    )}
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                {!canChangeRole && (
                  <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 mt-1`}>
                    {isProtectedMember ? 'Protected role' : 'No permission'}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size={isMobile ? "sm" : "sm"} className={`${isMobile ? 'h-8 w-8 p-0' : ''}`} aria-label="Member Actions">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <>
                    {canTransferOwnership && (
                      <DropdownMenuItem onClick={() => setShowOwnershipTransferDialog(true)}>
                        <Crown className="h-4 w-4 mr-2" /> Transfer Ownership
                      </DropdownMenuItem>
                    )}
                    {canEditMember && (
                      <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Edit3 className="h-4 w-4 mr-2" /> Edit Member
                      </DropdownMenuItem>
                    )}
                    {canViewSettings && (
                      <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                        <Settings className="h-4 w-4 mr-2" /> Member Settings
                      </DropdownMenuItem>
                    )}
                    {canViewActivity && (
                      <DropdownMenuItem onClick={() => setShowActivityDialog(true)}>
                        <Activity className="h-4 w-4 mr-2" /> View Activity
                      </DropdownMenuItem>
                    )}
                    {canResetPassword && (
                      <DropdownMenuItem onClick={handleResetPassword}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Reset Password
                      </DropdownMenuItem>
                    )}
                    {canSuspendMember && !isProtectedMember && (
                      <DropdownMenuItem onClick={handleSuspendMember}>
                        <UserX className="h-4 w-4 mr-2" /> {member.is_suspended ? 'Unsuspend' : 'Suspend'} Account
                      </DropdownMenuItem>
                    )}
                    {canDeleteMember && !isProtectedMember && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" aria-label="Delete Member" onClick={() => setDeleteDialogOpen(true)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Member
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Robust Delete Button outside dropdown */}
              {canDeleteMember && !isProtectedMember && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size={isMobile ? 'sm' : 'icon'}
                        className="text-red-600 hover:bg-red-100 ml-2"
                        aria-label="Delete Member"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete Member</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog (always available, not tied to dropdown) */}
      {canDeleteMember && !isProtectedMember && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {member.first_name} {member.last_name}? This action cannot be undone and will permanently remove their account and all associated data.
              </AlertDialogDescription>
              {deleteError && (
                <div className="text-red-600 text-sm mt-2" role="alert">{deleteError}</div>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMember} className="bg-red-600 hover:bg-red-700">Delete Member</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {canTransferOwnership && (
        <OwnershipTransferDialog 
          open={showOwnershipTransferDialog}
          onOpenChange={setShowOwnershipTransferDialog}
          targetMember={member}
          currentSuperAdmin={getCurrentUserProfile()}
          onTransferComplete={handleOwnershipTransferComplete}
        />
      )}

      {canEditMember && (
        <MemberEditDialog 
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          member={member}
          onMemberUpdated={handleMemberUpdated}
        />
      )}

      {canViewSettings && (
        <MemberSettingsDialog 
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          member={member}
        />
      )}

      {canViewActivity && (
        <MemberActivityDialog 
          open={showActivityDialog}
          onOpenChange={setShowActivityDialog}
          member={member}
        />
      )}
    </>
  );
};
