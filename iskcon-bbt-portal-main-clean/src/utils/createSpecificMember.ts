import { supabase } from '@/integrations/supabase/client';

type ValidRole = 'super_admin' | 'admin' | 'member' | 'secretary' | 'treasurer';

export const createSpecificMember = async () => {
  console.log('Creating specific member: HH Bhakti Rasamrita Swami');

  const memberData = {
    email: 'brs@iskconbureau.in',
    firstName: 'HH Bhakti Rasamrita',
    lastName: 'Swami',
    phone: '', // Optional
    role: 'admin' as ValidRole // Properly type the role
  };

  try {
    // Step 1: Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from('member_invitations')
      .insert({
        email: memberData.email,
        first_name: memberData.firstName,
        last_name: memberData.lastName,
        phone: memberData.phone,
        role: memberData.role,
        invited_by: '6ab3186f-7dae-46b3-8dd5-5256c560658e' // Using system admin UUID instead of 'system'
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Invitation creation error:', invitationError);
      if (invitationError.code === '23505') {
        console.log('Invitation for this email already exists');
        return { success: false, message: 'Invitation already exists' };
      }
      throw invitationError;
    }

    console.log('Invitation created successfully:', invitation);

    // Step 2: Create profile entry for immediate display
    const profileId = crypto.randomUUID();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        email: memberData.email,
        first_name: memberData.firstName,
        last_name: memberData.lastName,
        phone: memberData.phone,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // Clean up invitation if profile creation fails
      await supabase.from('member_invitations').delete().eq('id', invitation.id);
      
      if (profileError.code === '23505') {
        console.log('Profile with this email already exists');
        return { success: false, message: 'Member already exists' };
      }
      throw profileError;
    }

    console.log('Profile created successfully:', profile);

    // Step 3: Create user role entry - Fix the typing issue
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: profileId,
        role: memberData.role,
      });

    if (roleError) {
      console.error('Role creation error:', roleError);
      
      // Clean up profile and invitation if role creation fails
      await supabase.from('profiles').delete().eq('id', profileId);
      await supabase.from('member_invitations').delete().eq('id', invitation.id);
      
      throw roleError;
    }

    console.log('Member created successfully with invitation approach');
    
    return { 
      success: true, 
      message: 'Member created successfully. They can now sign up using their email.',
      profile: profile
    };

  } catch (error: any) {
    console.error('Error creating member:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to create member' 
    };
  }
};