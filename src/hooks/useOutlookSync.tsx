import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useOutlookSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const syncOutlookMeetings = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to sync meetings",
        variant: "destructive"
      });
      return;
    }

    setSyncing(true);
    
    try {
      console.log('Starting Outlook meetings sync...');
      
      const { data, error } = await supabase.functions.invoke('sync-outlook-meetings', {
        body: { user_id: user.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const { syncedCount, skippedCount, totalFound } = data;
      
      setLastSyncTime(new Date());
      
      if (syncedCount > 0) {
        toast({
          title: "Meetings Synced!",
          description: `Successfully imported ${syncedCount} meeting${syncedCount !== 1 ? 's' : ''} from Outlook. ${skippedCount} already existed.`,
        });
      } else if (totalFound === 0) {
        toast({
          title: "No Meetings Found",
          description: "No upcoming meetings found in your Outlook calendar.",
        });
      }

      console.log(`Sync completed: ${syncedCount} synced, ${skippedCount} skipped, ${totalFound} total`);
      
    } catch (error: any) {
      console.error('Sync failed:', error);
      
      let errorMessage = "Failed to sync meetings from Outlook";
      
      if (error.message?.includes('Microsoft account not connected')) {
        errorMessage = "Microsoft account not connected. Please connect your account in Settings.";
      } else if (error.message?.includes('Failed to fetch meetings')) {
        errorMessage = "Unable to access your Outlook calendar. Please check your Microsoft account connection.";
      }
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  }, [user, toast]);

  const autoSync = useCallback(async () => {
    // Only auto-sync if we haven't synced in the last 5 minutes
    if (lastSyncTime && Date.now() - lastSyncTime.getTime() < 5 * 60 * 1000) {
      return;
    }
    
    await syncOutlookMeetings();
  }, [syncOutlookMeetings, lastSyncTime]);

  // Auto-sync when component mounts and user is available
  useEffect(() => {
    if (user) {
      console.log('Auto-syncing meetings on mount...');
      autoSync();
    }
  }, [user, autoSync]);

  // Auto-sync every 10 minutes when user is active
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      console.log('Auto-syncing meetings (periodic)...');
      autoSync();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [user, autoSync]);

  return {
    syncing,
    lastSyncTime,
    syncOutlookMeetings,
    autoSync
  };
};
