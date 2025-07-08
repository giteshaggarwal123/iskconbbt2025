import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  status: 'active' | 'completed' | 'cancelled';
  is_secret: boolean;
  notify_members: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  reopen_deadline?: string;
  sub_polls?: SubPoll[];
  attachments?: PollAttachment[];
  stats?: PollStats;
  hasVoted?: boolean;
  unique_id?: string;
}

export interface SubPoll {
  id: string;
  poll_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

export interface PollAttachment {
  id: string;
  poll_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface PollStats {
  total_voters: number;
  voted_count: number;
  pending_count: number;
  sub_poll_count: number;
}

export interface CreatePollData {
  title: string;
  description: string;
  deadline: string;
  notify_members: boolean;
  subPolls: Array<{ title: string; description: string }>;
  attachment?: File;
  unique_id?: string;
}

export const usePolls = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const pollingPausedRef = useRef(false);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      
      // First, auto-close any reopened polls that have expired
      await autoCloseExpiredPolls();
      
      // Fetch polls with sub_polls and attachments
      const { data: pollsData, error } = await supabase
        .from('polls')
        .select(`
          *,
          unique_id,
          sub_polls (*),
          poll_attachments (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get stats for each poll and transform the data to match our interface
      const pollsWithStats: Poll[] = await Promise.all(
        pollsData.map(async (poll): Promise<Poll> => {
          const { data: stats } = await supabase.rpc('get_poll_stats', {
            poll_id_param: poll.id
          });
          
          return {
            id: poll.id,
            title: poll.title,
            description: poll.description ?? null,
            deadline: poll.deadline ?? null,
            status: poll.status as 'active' | 'completed' | 'cancelled',
            is_secret: poll.is_secret,
            notify_members: poll.notify_members,
            created_by: poll.created_by,
            created_at: poll.created_at,
            updated_at: poll.updated_at,
            reopen_deadline: poll.reopen_deadline ?? undefined,
            sub_polls: poll.sub_polls || [],
            attachments: poll.poll_attachments || [],
            stats: stats?.[0] || { total_voters: 0, voted_count: 0, pending_count: 0, sub_poll_count: 0 },
            unique_id: poll.unique_id ?? undefined
          };
        })
      );

      // For each poll, check if the current user has voted
      if (user) {
        for (const poll of pollsWithStats) {
          const { data: userVotes } = await supabase
            .from('poll_votes')
            .select('id')
            .eq('poll_id', poll.id)
            .eq('user_id', user.id)
            .limit(1);
          poll.hasVoted = !!(userVotes && userVotes.length > 0);
        }
      }
      setPolls(pollsWithStats);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error('Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  };

  const autoCloseExpiredPolls = async () => {
    try {
      // Use the database function to auto-close expired polls
      const { error } = await supabase.rpc('auto_close_reopened_polls');
      if (error) throw error;
    } catch (error) {
      console.error('Error auto-closing expired polls:', error);
    }
  };

  const createPoll = async (pollData: CreatePollData) => {
    if (!user) {
      toast.error('You must be logged in to create a poll');
      return null;
    }

    try {
      // Create the main poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          title: pollData.title,
          description: pollData.description,
          deadline: pollData.deadline,
          notify_members: pollData.notify_members,
          created_by: user.id,
          unique_id: pollData.unique_id
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create sub-polls
      const subPollsToInsert = pollData.subPolls
        .filter(sp => sp.title.trim())
        .map((subPoll, index) => ({
          poll_id: poll.id,
          title: subPoll.title,
          description: subPoll.description,
          order_index: index
        }));

      if (subPollsToInsert.length > 0) {
        const { error: subPollError } = await supabase
          .from('sub_polls')
          .insert(subPollsToInsert);

        if (subPollError) throw subPollError;
      }

      // Handle file upload if attachment exists
      if (pollData.attachment) {
        await uploadPollAttachment(poll.id, pollData.attachment);
      }

      // Send notifications if enabled
      if (pollData.notify_members) {
        await sendPollNotifications(poll.id);
      }

      toast.success('Poll created successfully');
      await fetchPolls(); // Refresh the polls list
      return poll;
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error('Failed to create poll');
      return null;
    }
  };

  const updatePoll = async (pollId: string, updateData: {
    title: string;
    description: string;
    deadline: string;
    subPolls: Array<{ id: string; title: string; description: string }>;
  }) => {
    if (!user) {
      toast.error('You must be logged in to update a poll');
      return false;
    }

    try {
      // Update the main poll
      const { error: pollError } = await supabase
        .from('polls')
        .update({
          title: updateData.title,
          description: updateData.description,
          deadline: updateData.deadline,
          updated_at: new Date().toISOString()
        })
        .eq('id', pollId);

      if (pollError) throw pollError;

      // Update sub-polls
      for (const subPoll of updateData.subPolls) {
        const { error: subPollError } = await supabase
          .from('sub_polls')
          .update({
            title: subPoll.title,
            description: subPoll.description
          })
          .eq('id', subPoll.id);

        if (subPollError) throw subPollError;
      }

      toast.success('Poll updated successfully');
      await fetchPolls(); // Refresh the polls list
      return true;
    } catch (error) {
      console.error('Error updating poll:', error);
      toast.error('Failed to update poll');
      return false;
    }
  };

  const uploadPollAttachment = async (pollId: string, file: File) => {
    if (!user) return null;

    try {
      // Ensure bucket exists
      await ensurePollAttachmentsBucketExists();

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${pollId}/${fileName}`;

      console.log('Uploading file to storage:', filePath);

      // Upload file to storage bucket
      const { error: uploadError } = await supabase.storage
        .from('poll-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('poll-attachments')
        .getPublicUrl(filePath);

      console.log('File uploaded successfully, public URL:', publicUrl);

      // Save attachment record to database
      const { error: dbError } = await supabase
        .from('poll_attachments')
        .insert({
          poll_id: pollId,
          file_name: file.name,
          file_path: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      return filePath;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast.error('Failed to upload attachment');
      return null;
    }
  };

  const ensurePollAttachmentsBucketExists = async () => {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.id === 'poll-attachments');
      
      if (!bucketExists) {
        console.log('Creating poll-attachments bucket...');
        const { error: createError } = await supabase.storage.createBucket('poll-attachments', {
          public: true,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'text/plain'
          ]
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
        } else {
          console.log('Poll-attachments bucket created successfully');
        }
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
    }
  };

  const sendPollNotifications = async (pollId: string) => {
    try {
      // Call edge function to send notifications
      const { error } = await supabase.functions.invoke('send-poll-notifications', {
        body: { pollId, notificationType: 'initial' }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Don't toast error for notifications as poll creation was successful
    }
  };

  const deletePoll = async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;

      toast.success('Poll deleted successfully');
      await fetchPolls();
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast.error('Failed to delete poll');
    }
  };

  const updatePollStatus = async (pollId: string, status: 'active' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('polls')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', pollId);

      if (error) throw error;

      toast.success(`Poll ${status === 'completed' ? 'completed' : status} successfully`);
      await fetchPolls();
    } catch (error) {
      console.error('Error updating poll status:', error);
      toast.error('Failed to update poll status');
    }
  };

  const downloadAttachment = async (filePath: string, fileName: string) => {
    try {
      console.log('Downloading attachment:', { filePath, fileName });
      
      // If it's already a public URL, download directly
      if (filePath.includes('supabase.co/storage') || filePath.includes('/storage/v1/object/public/')) {
        console.log('Using direct download from public URL');
        const a = document.createElement('a');
        a.href = filePath;
        a.download = fileName;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`Download started: ${fileName}`);
        return;
      }

      // For legacy paths, try to construct public URL
      console.log('Constructing public URL for legacy path');
      const { data: { publicUrl } } = supabase.storage
        .from('poll-attachments')
        .getPublicUrl(filePath);
      
      console.log('Constructed public URL:', publicUrl);
      const a = document.createElement('a');
      a.href = publicUrl;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Download started: ${fileName}`);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment');
    }
  };

  const resetUserVotes = async (pollId: string, userId: string) => {
    try {
      const { error } = await supabase.rpc('reset_user_poll_votes', {
        poll_id_param: pollId,
        user_id_param: userId
      });

      if (error) throw error;

      toast.success('User votes reset successfully');
      await fetchPolls();
    } catch (error) {
      console.error('Error resetting user votes:', error);
      toast.error('Failed to reset user votes');
    }
  };

  const resetAllVotes = async (pollId: string) => {
    try {
      const { error } = await supabase.rpc('reset_all_poll_votes', {
        poll_id_param: pollId
      });

      if (error) throw error;

      toast.success('All votes reset successfully');
      await fetchPolls();
    } catch (error) {
      console.error('Error resetting all votes:', error);
      toast.error('Failed to reset all votes');
    }
  };

  const setPollingPaused = (paused: boolean) => {
    pollingPausedRef.current = paused;
  };

  useEffect(() => {
    fetchPolls();
    const interval = setInterval(() => {
      if (!pollingPausedRef.current) {
        fetchPolls();
      }
    }, 30 * 1000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  return {
    polls,
    loading,
    createPoll,
    updatePoll,
    deletePoll,
    updatePollStatus,
    downloadAttachment,
    resetUserVotes,
    resetAllVotes,
    refetch: fetchPolls,
    setPollingPaused
  };
};
