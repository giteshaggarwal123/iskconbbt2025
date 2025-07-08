
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, AlertTriangle, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  roles: string[];
}

interface OwnershipTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetMember: Member;
  currentSuperAdmin: Member;
  onTransferComplete: () => void;
}

export const OwnershipTransferDialog: React.FC<OwnershipTransferDialogProps> = ({
  open,
  onOpenChange,
  targetMember,
  currentSuperAdmin,
  onTransferComplete
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const { toast } = useToast();

  const expectedConfirmation = `TRANSFER OWNERSHIP TO ${targetMember.first_name} ${targetMember.last_name}`;

  const handleTransferOwnership = async () => {
    if (confirmationText !== expectedConfirmation) {
      toast({
        title: "Confirmation Required",
        description: "Please type the exact confirmation text to proceed",
        variant: "destructive"
      });
      return;
    }

    setIsTransferring(true);
    
    try {
      // This would typically call a backend function to:
      // 1. Remove super_admin role from current user
      // 2. Add super_admin role to target user
      // 3. Update any necessary records
      
      console.log('Transferring ownership from', currentSuperAdmin.email, 'to', targetMember.email);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Ownership Transferred Successfully",
        description: `${targetMember.first_name} ${targetMember.last_name} is now the Super Admin. You will be logged out shortly.`
      });
      
      setConfirmationText('');
      onOpenChange(false);
      onTransferComplete();
      
      // Log out current user after transfer
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast({
        title: "Transfer Failed",
        description: "Failed to transfer ownership. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-600">
            <Crown className="h-5 w-5" />
            <span>Transfer Ownership</span>
          </DialogTitle>
          <DialogDescription>
            This action will transfer Super Admin privileges to another member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Warning:</strong> This action cannot be undone. You will lose Super Admin privileges immediately.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Transfer Details:</h4>
            <div className="text-sm space-y-1">
              <p><strong>From:</strong> {currentSuperAdmin.first_name} {currentSuperAdmin.last_name} ({currentSuperAdmin.email})</p>
              <p><strong>To:</strong> {targetMember.first_name} {targetMember.last_name} ({targetMember.email})</p>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmation">
              Type the following to confirm: 
              <code className="bg-gray-200 px-1 rounded text-xs ml-1">
                {expectedConfirmation}
              </code>
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type confirmation text here..."
              className="mt-2"
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button 
              onClick={handleTransferOwnership}
              disabled={confirmationText !== expectedConfirmation || isTransferring}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              {isTransferring ? 'Transferring...' : 'Transfer Ownership'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isTransferring}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
