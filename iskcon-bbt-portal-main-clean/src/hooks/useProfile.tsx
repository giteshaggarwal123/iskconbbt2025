import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  created_at?: string | null;
  is_suspended?: boolean | null;
  microsoft_access_token?: string | null;
  microsoft_refresh_token?: string | null;
  microsoft_token_expires_at?: string | null;
}

export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const fetchProfile = useCallback(async () => {
    if (!user || fetchingRef.current) {
      setLoading(false);
      return;
    }

    // Throttle requests - don't fetch more than once every 2 seconds
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 2000) {
      return;
    }

    try {
      fetchingRef.current = true;
      lastFetchTimeRef.current = now;
      setLoading(true);
      console.log('Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        
        if (error.message.includes('row-level security')) {
          console.log('User may not have access to their profile yet, creating...');
          await createProfileIfNeeded();
          return;
        }
        
        throw error;
      }

      if (data) {
        console.log('Profile fetched successfully:', data);
        setProfile(data);
      } else {
        console.log('No profile found, creating...');
        await createProfileIfNeeded();
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Profile Error",
        description: "Failed to load profile information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user, toast]);

  const createProfileIfNeeded = async () => {
    if (!user || fetchingRef.current) return;

    try {
      const newProfile = {
        id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        phone: user.phone || '',
        avatar_url: '',
        updated_at: new Date().toISOString()
      };

      console.log('Creating profile:', newProfile);

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        
        if (createError.message.includes('row-level security')) {
          console.log('RLS prevented profile creation, profile might already exist');
          setTimeout(() => fetchProfile(), 2000);
          return;
        }
        
        throw createError;
      }
      
      console.log('Profile created successfully:', createdProfile);
      setProfile(createdProfile);
    } catch (error: any) {
      console.error('Error creating profile:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return { error: 'No user or profile found' };

    try {
      console.log('Updating profile with:', updates);
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        
        if (error.message.includes('row-level security')) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to make this update",
            variant: "destructive"
          });
          return { error };
        }
        
        throw error;
      }

      console.log('Profile updated successfully:', data);
      setProfile(data);
      
      // Dispatch events with slight delay to ensure all components are ready
      setTimeout(() => {
        const eventDetail = { profile: data, userId: user.id };
        console.log('Dispatching profile update from useProfile:', eventDetail);
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: eventDetail }));
      }, 100);

      toast({
        title: "Profile Updated",
        description: "Your information has been saved successfully",
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
      return { error };
    }
  };

  const refreshProfile = useCallback(() => {
    console.log('Forcing profile refresh');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id, refreshTrigger]);

  // Listen for profile updates from other components - but throttle the responses
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('useProfile received profile update event:', event.detail);
      if (event.detail.userId === user?.id) {
        // Debounce the fetch to prevent rapid consecutive calls
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchProfile();
        }, 1000);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
      clearTimeout(timeoutId);
    };
  }, [user?.id]);

  return {
    profile,
    loading,
    updateProfile,
    refreshProfile,
    fetchProfile
  };
};
