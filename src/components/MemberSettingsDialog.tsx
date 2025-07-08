import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Calendar, Shield } from 'lucide-react';
import { MemberActivityDialog } from './MemberActivityDialog';
import { useMembers } from '@/hooks/useMembers';

interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  roles: string[];
  is_suspended?: boolean;
}

interface MemberSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
}

export const MemberSettingsDialog: React.FC<MemberSettingsDialogProps> = ({
  open,
  onOpenChange,
  member
}) => {
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const { resetPassword, suspendMember, exportMembers } = useMembers();

  const joinDate = new Date(member.created_at).toLocaleDateString();
  const primaryRole = member.roles[0] || 'member';

  const handleResetPassword = async () => {
    await resetPassword(member.id);
  };

  const handleSuspendAccount = async () => {
    await suspendMember(member.id, !member.is_suspended);
  };

  const handleViewActivity = () => {
    setShowActivityDialog(true);
  };

  const handleExportData = () => {
    exportMembers();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Member Settings</DialogTitle>
            <DialogDescription>
              Manage settings and information for {member.first_name} {member.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Member Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">First Name</label>
                    <p className="text-gray-900">{member.first_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Name</label>
                    <p className="text-gray-900">{member.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900 flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>{member.email}</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900 flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>{member.phone || 'Not provided'}</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Join Date</label>
                    <p className="text-gray-900 flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{joinDate}</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="text-gray-900 flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <Badge variant={member.is_suspended ? "destructive" : "secondary"}>
                        {member.is_suspended ? 'Suspended' : 'Active'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Role</label>
                    <p className="text-gray-900 flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <Badge>{primaryRole}</Badge>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
                <CardDescription>
                  Manage account settings and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleResetPassword}
                >
                  Reset Password
                </Button> */}
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleSuspendAccount}
                >
                  {member.is_suspended ? 'Unsuspend Account' : 'Suspend Account'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleViewActivity}
                >
                  View Activity Log
                </Button>
                {/* <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleExportData}
                >
                  Export Data
                </Button> */}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <MemberActivityDialog
        open={showActivityDialog}
        onOpenChange={setShowActivityDialog}
        member={member}
      />
    </>
  );
};
