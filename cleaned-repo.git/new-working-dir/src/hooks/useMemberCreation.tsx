import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

type ValidRole = 'super_admin' | 'admin' | 'member' | 'secretary' | 'treasurer';

const isValidRole = (role: string): role is ValidRole => {
  return ['super_admin', 'admin', 'member', 'secretary', 'treasurer'].includes(role);
};

export const useMemberCreation = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { user, session } = useAuth();

  const createMember = async (memberData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: string;
    password: string;
    notes?: string;
  }) => {
    setIsCreating(true);
    try {
      // Log user and session for debugging
      console.log('Current user:', user);
      console.log('Current session:', session);
      if (!user || !session) {
        toast({ title: 'Not authenticated', description: 'You must be logged in as an admin to add members.', variant: 'destructive' });
        return { error: 'Not authenticated' };
      }
      // Call the edge function using the authenticated client
      const { data, error } = await supabase.functions.invoke('create-member', {
        body: memberData
      });
      console.log('Edge function response:', data, error);
      if (error || !data?.success) {
        toast({ title: 'Creation Failed', description: error?.message || data?.error || 'Failed to create member', variant: 'destructive' });
        return { error: error?.message || data?.error };
      }
      toast({ title: 'Member Created', description: 'Member added successfully.' });
      return data;
    } catch (error: any) {
      console.error('Error in createMember:', error);
      toast({ title: 'Creation Failed', description: error.message || 'Failed to create member', variant: 'destructive' });
      return { error: error.message };
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createMember,
    isCreating
  };
};
