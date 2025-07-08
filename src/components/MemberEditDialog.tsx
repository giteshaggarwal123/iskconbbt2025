import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Phone, Save, X, Shield } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  roles: string[];
}

interface MemberEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  onMemberUpdated: () => void;
  onSetPassword?: (id: string, password: string) => Promise<void>;
}

export const MemberEditDialog: React.FC<MemberEditDialogProps> = ({
  open,
  onOpenChange,
  member,
  onMemberUpdated,
  onSetPassword
}) => {
  const [firstName, setFirstName] = useState(member.first_name);
  const [lastName, setLastName] = useState(member.last_name);
  const [email, setEmail] = useState(member.email);
  const [phone, setPhone] = useState(member.phone || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const userRole = useUserRole();
  const [formData, setFormData] = useState({
    firstName: member.first_name || '',
    lastName: member.last_name || '',
    email: member.email || '',
    phone: member.phone || '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Reset form when member changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setFirstName(member.first_name);
      setLastName(member.last_name);
      setEmail(member.email);
      setPhone(member.phone || '');
    }
  }, [member, open]);

  // Check if current user can edit this member
  const canEditMember = userRole.isSuperAdmin || 
    (userRole.isAdmin && member.email !== 'atd@iskconbureau.in') ||
    member.id === userRole.user?.id;

  // Check if user can edit specific fields
  const canEditEmail = userRole.isSuperAdmin || member.id === userRole.user?.id;
  const canEditPhone = userRole.isSuperAdmin || userRole.isAdmin || member.id === userRole.user?.id;
  const canEditName = userRole.isSuperAdmin || userRole.isAdmin || member.id === userRole.user?.id;

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({
        title: "Validation Error",
        description: "First name, last name, and email are required",
        variant: "destructive"
      });
      return;
    }

    if (!canEditMember) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit this member",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Updating member profile:', {
        id: member.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        canEditEmail,
        canEditPhone,
        canEditName
      });

      // Prepare update data based on permissions
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Only include fields that the user has permission to edit
      if (canEditName) {
        updateData.first_name = firstName.trim();
        updateData.last_name = lastName.trim();
      }

      if (canEditEmail && email !== member.email) {
        updateData.email = email.trim();
      }

      if (canEditPhone) {
        updateData.phone = phone.trim() || null;
      }

      console.log('Update data being sent:', updateData);

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', member.id);

      if (error) {
        console.error('Error updating member:', error);
        
        // Handle specific RLS policy errors
        if (error.message.includes('row-level security')) {
          toast({
            title: "Permission Denied",
            description: "You don't have sufficient permissions to make this update",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      console.log('Member profile updated successfully');

      toast({
        title: "Success!",
        description: `${firstName} ${lastName}'s information has been updated`,
        variant: "default"
      });

      // Close dialog and trigger refresh
      onOpenChange(false);
      
      // Wait a moment then trigger the callback to ensure UI updates
      setTimeout(() => {
        onMemberUpdated();
      }, 500);

      if (formData.password && (userRole.isAdmin || userRole.isSuperAdmin) && onSetPassword) {
        await onSetPassword(member.id, formData.password);
      }

    } catch (error: any) {
      console.error('Error updating member:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update member information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setFirstName(member.first_name);
    setLastName(member.last_name);
    setEmail(member.email);
    setPhone(member.phone || '');
    onOpenChange(false);
  };

  if (!canEditMember) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-red-500" />
              <span>Access Denied</span>
            </DialogTitle>
            <DialogDescription>
              You don't have permission to edit this member's information.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isProtectedAccount = member.email === 'atd@iskconbureau.in';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white rounded-xl shadow-xl p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-2xl font-bold mb-1">
              <User className="h-6 w-6 text-primary" />
              <span>Edit Member Information</span>
              {isProtectedAccount && (
                <Shield className="h-4 w-4 text-amber-500" />
              )}
            </DialogTitle>
            <DialogDescription className="mb-4 text-gray-600">
              Update member details.
              {isProtectedAccount && " This is a protected system account."}
              {!canEditEmail && " You can only edit basic information."}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-6" onSubmit={e => { e.preventDefault(); handleSave(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                  disabled={!canEditEmail}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  disabled={!canEditPhone}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Set New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 pt-4 border-t mt-6">
              <Button
                type="submit"
                variant="destructive"
                disabled={loading}
                className="flex-1 flex items-center justify-center"
              >
                <Save className="h-5 w-5 mr-2" />
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 flex items-center justify-center"
              >
                <X className="h-5 w-5 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
