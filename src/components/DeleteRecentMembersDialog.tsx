import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeleteRecentMembersDialogProps {
  onMembersDeleted?: () => void;
}

export const DeleteRecentMembersDialog: React.FC<DeleteRecentMembersDialogProps> = ({
  onMembersDeleted
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { toast } = useToast();

  const handleDeleteRecentMembers = async () => {
    if (confirmText !== 'DELETE RECENT') {
      toast({
        title: "Confirmation Required",
        description: "Please type 'DELETE RECENT' to confirm",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get today's date for filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      console.log('Deleting members created after:', todayISO);

      // First, get the members created today (excluding protected accounts)
      const { data: recentMembers, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .gte('created_at', todayISO)
        .not('email', 'eq', 'atd@iskconbureau.in')
        .not('email', 'eq', 'admin@iskconbureau.in')
        .not('email', 'eq', 'anshkashyap23109@gmail.com');

      if (fetchError) {
        console.error('Error fetching recent members:', fetchError);
        throw fetchError;
      }

      console.log('Found recent members to delete:', recentMembers);

      if (!recentMembers || recentMembers.length === 0) {
        toast({
          title: "No Recent Members",
          description: "No members created today were found to delete",
        });
        setLoading(false);
        return;
      }

      // Delete user roles first for these members
      const memberIds = recentMembers.map(m => m.id);
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .in('user_id', memberIds);

      if (rolesError) {
        console.error('Error deleting user roles:', rolesError);
        // Continue anyway, profile deletion is more important
      }

      // Delete profiles
      const { error: profilesError } = await supabase
        .from('profiles')
        .delete()
        .in('id', memberIds);

      if (profilesError) {
        console.error('Error deleting profiles:', profilesError);
        throw profilesError;
      }

      toast({
        title: "Recent Members Deleted",
        description: `Successfully deleted ${recentMembers.length} recently created members`
      });

      if (onMembersDeleted) {
        onMembersDeleted();
      }

      setConfirmText('');
    } catch (error: any) {
      console.error('Error deleting recent members:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete recent members",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Recent Members
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Recently Created Members</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete all members created today (excluding protected system accounts).
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <Label htmlFor="confirm-text">
            Type "DELETE RECENT" to confirm this action:
          </Label>
          <Input
            id="confirm-text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE RECENT"
            className="mt-2"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText('')}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteRecentMembers}
            disabled={loading || confirmText !== 'DELETE RECENT'}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Deleting...' : 'Delete Recent Members'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
