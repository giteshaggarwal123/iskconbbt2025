import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface VoteData {
  subPollId: string;
  vote: 'favor' | 'against' | 'abstain';
}

export interface SubmitVotesData {
  pollId: string;
  votes: VoteData[];
  comment?: string;
}

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T,>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }
  
  throw lastError;
};

export const useVoting = (): {
  submitVotes: (data: SubmitVotesData) => Promise<boolean>;
  getUserVotes: (pollId: string) => Promise<any[] | null>;
  checkVotingEligibility: (pollId: string) => Promise<{ canVote: boolean; reason: string | null }>;
  submitting: boolean;
} => {
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const submitVotes = async (data: SubmitVotesData): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to vote');
      return false;
    }

    try {
      setSubmitting(true);
      console.log('Starting vote submission for user:', user.id, 'poll:', data.pollId);

      const result = await retryWithBackoff(async () => {
        // Check if user has already voted on any of these sub-polls
        const { data: existingVotes, error: checkError } = await supabase
          .from('poll_votes')
          .select('sub_poll_id')
          .eq('user_id', user.id)
          .in('sub_poll_id', data.votes.map(v => v.subPollId));

        if (checkError) {
          console.error('Error checking existing votes:', checkError);
          throw checkError;
        }

        if (existingVotes && existingVotes.length > 0) {
          throw new Error('ALREADY_VOTED');
        }

        // Prepare vote records
        const voteRecords = data.votes.map(vote => ({
          poll_id: data.pollId,
          sub_poll_id: vote.subPollId,
          user_id: user.id,
          vote: vote.vote,
          comment: data.comment || null
        }));

        console.log('Inserting vote records:', voteRecords);

        // Insert all votes
        const { error: insertError } = await supabase
          .from('poll_votes')
          .insert(voteRecords);

        if (insertError) {
          console.error('Error inserting votes:', insertError);
          throw insertError;
        }

        return true;
      });

      console.log('Vote submission successful');
      toast.success('Your votes have been submitted successfully');
      return result;
    } catch (error: any) {
      console.error('Error submitting votes:', error);
      
      if (error.message === 'ALREADY_VOTED') {
        toast.error('You have already voted on some of these questions');
      } else {
        toast.error('Failed to submit votes. Please check your connection and try again.');
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const getUserVotes = async (pollId: string): Promise<any[] | null> => {
    if (!user) return null;

    try {
      console.log('Fetching user votes for poll:', pollId, 'user:', user.id);
      
      const result = await retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('poll_votes')
          .select('*')
          .eq('poll_id', pollId)
          .eq('user_id', user.id);

        if (error) throw error;
        return data;
      });

      console.log('Retrieved user votes:', result);
      return result;
    } catch (error) {
      console.error('Error fetching user votes:', error);
      return null;
    }
  };

  const checkVotingEligibility = async (pollId: string): Promise<{ canVote: boolean; reason: string | null }> => {
    console.log('Checking voting eligibility for poll:', pollId, 'user:', user?.id);
    
    if (!user) {
      console.log('No user found');
      return { canVote: false, reason: 'Not logged in' };
    }

    try {
      const result = await retryWithBackoff(async () => {
        // Check if poll is active
        const { data: poll, error } = await supabase
          .from('polls')
          .select('status, deadline')
          .eq('id', pollId)
          .single();

        if (error) {
          console.error('Error fetching poll:', error);
          throw error;
        }

        console.log('Poll data:', poll);

        if (poll.status !== 'active') {
          return { canVote: false, reason: 'Poll is not active' };
        }

        // Allow voting after deadline: do not block
        // if (new Date(poll.deadline) < new Date()) {
        //   return { canVote: false, reason: 'Poll deadline has passed' };
        // }

        // Check if user has already voted
        const { data: existingVotes, error: voteError } = await supabase
          .from('poll_votes')
          .select('id')
          .eq('poll_id', pollId)
          .eq('user_id', user.id)
          .limit(1);

        if (voteError) {
          console.error('Error checking existing votes:', voteError);
          throw voteError;
        }

        console.log('Existing votes:', existingVotes);

        if (existingVotes && existingVotes.length > 0) {
          return { canVote: false, reason: 'You have already voted on this poll' };
        }

        console.log('User can vote');
        return { canVote: true, reason: null };
      });

      return result;
    } catch (error: any) {
      console.error('Error checking voting eligibility:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('Failed to fetch')) {
        return { canVote: false, reason: 'Network connection error. Please check your internet connection.' };
      }
      
      return { canVote: false, reason: 'Error checking eligibility. Please try again.' };
    }
  };

  return {
    submitVotes,
    getUserVotes,
    checkVotingEligibility,
    submitting
  };
};
