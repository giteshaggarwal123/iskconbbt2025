
import { supabase } from '@/integrations/supabase/client';

export const handleInvitationAcceptance = async (email: string, userId: string) => {
  try {
    console.log('Processing invitation acceptance for:', email);

    // Check if there's a pending invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('member_invitations')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      console.log('No pending invitation found for:', email);
      return;
    }

    // Update the profile with the actual user ID from auth
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ id: userId })
      .eq('email', email);

    if (updateProfileError) {
      console.error('Error updating profile with auth user ID:', updateProfileError);
      return;
    }

    // Update user roles with the actual user ID
    const { error: updateRoleError } = await supabase
      .from('user_roles')
      .update({ user_id: userId })
      .eq('user_id', invitation.id); // This should match the temporary ID used during invitation

    if (updateRoleError) {
      console.error('Error updating user role with auth user ID:', updateRoleError);
      return;
    }

    // Mark invitation as accepted
    const { error: acceptError } = await supabase
      .from('member_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    if (acceptError) {
      console.error('Error marking invitation as accepted:', acceptError);
    }

    console.log('Invitation acceptance processed successfully');
  } catch (error) {
    console.error('Error handling invitation acceptance:', error);
  }
};
