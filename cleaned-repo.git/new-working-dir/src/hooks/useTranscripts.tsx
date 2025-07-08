import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useMicrosoftAuth } from './useMicrosoftAuth';

interface MeetingTranscript {
  id: string;
  meeting_id: string;
  transcript_content?: string;
  summary?: string;
  action_items?: any;
  participants?: any;
  teams_transcript_id?: string;
  created_at: string;
  updated_at: string;
}

export const useTranscripts = () => {
  const [transcripts, setTranscripts] = useState<MeetingTranscript[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { accessToken, isConnected, checkAndRefreshToken } = useMicrosoftAuth();
  const { toast } = useToast();

  const getMeetingTranscriptsFolderId = async () => {
    try {
      // Find the "Meeting Transcripts" folder inside "ISKCON Repository"
      const { data: folders, error } = await supabase
        .from('folders')
        .select('id, name, parent_folder_id')
        .in('name', ['ISKCON Repository', 'Meeting Transcripts']);

      if (error) throw error;

      const iskconRepo = folders?.find(f => f.name === 'ISKCON Repository' && f.parent_folder_id === null);
      const meetingTranscriptsFolder = folders?.find(f => f.name === 'Meeting Transcripts' && f.parent_folder_id === iskconRepo?.id);

      return meetingTranscriptsFolder?.id || null;
    } catch (error) {
      console.error('Error finding Meeting Transcripts folder:', error);
      return null;
    }
  };

  const fetchTranscriptForMeeting = async (meetingId: string) => {
    try {
      console.log(`Fetching saved transcript for meeting: ${meetingId}`);
      const { data, error } = await supabase
        .from('meeting_transcripts')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching transcript:', error);
        throw error;
      }
      
      console.log('Saved transcript found:', !!data, 'Has content:', !!data?.transcript_content);
      return data;
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        // No transcript found, this is expected
        console.log('No saved transcript found for meeting:', meetingId);
        return null;
      }
      console.error('Error fetching transcript:', error);
      return null;
    }
  };

  const fetchTeamsTranscript = async (meetingId: string, teamsId: string) => {
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('No authenticated user found');
    }

    if (!isConnected || !accessToken) {
      console.error('Microsoft account not connected or no access token');
      throw new Error('Microsoft account not connected. Please connect your Microsoft account in Settings.');
    }

    try {
      console.log(`Enhanced Teams transcript extraction for meeting: ${teamsId}`);
      console.log('Using access token:', accessToken ? 'Present' : 'Missing');

      // Ensure we have a fresh token
      await checkAndRefreshToken();

      // Enhanced extraction with multiple retry attempts
      let lastError = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          console.log(`Enhanced extraction attempt ${attempt} for Teams meeting`);
          
          const { data, error } = await supabase.functions.invoke('fetch-teams-transcript', {
            body: {
              meetingId: teamsId,
              accessToken: accessToken
            }
          });

          if (error) {
            console.error(`Enhanced attempt ${attempt} failed:`, error);
            lastError = error;
            
            // Enhanced auth error handling
            if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('expired')) {
              console.log('Token issue detected, refreshing...');
              try {
                await checkAndRefreshToken();
                console.log('Token refreshed for enhanced extraction, retrying...');
                continue;
              } catch (refreshErr) {
                console.error('Token refresh failed during enhanced extraction:', refreshErr);
                throw new Error('Microsoft authentication expired. Please reconnect your Microsoft account in Settings.');
              }
            }
            
            if (attempt === 5) throw error;
            
            // Progressive backoff with longer waits for enhanced extraction
            await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(1.5, attempt - 1)));
            continue;
          }

          console.log('Enhanced Teams transcript response:', {
            success: data?.success,
            hasTranscripts: !!data?.transcript?.value?.length,
            hasRecordings: data?.hasRecordings,
            hasContent: data?.hasContent,
            contentLength: data?.transcriptContent?.length || 0,
            strategiesAttempted: data?.extractionDetails?.strategiesAttempted?.length || 0,
            foundWith: data?.foundWith,
            transcriptMethod: data?.transcriptMethod
          });

          // Enhanced response handling
          if (data?.success === false) {
            throw new Error(data.error || 'Enhanced extraction failed');
          }

          // Success case - transcript content found
          if (data?.success && data?.hasContent && data?.transcriptContent) {
            console.log('Enhanced extraction successful! Content length:', data.transcriptContent.length);
            return data;
          } 
          // Recordings found but no transcript content yet
          else if (data?.success && data?.hasRecordings && !data?.hasContent) {
            throw new Error('Meeting recording found but transcript is still being processed. Transcripts can take up to 24 hours to become available after a meeting ends. Please try again later.');
          }
          // Transcript metadata found but no content
          else if (data?.success && data?.transcript?.value?.length > 0 && !data?.hasContent) {
            throw new Error('Transcript metadata found but content extraction failed. This may be due to transcript processing delays or access restrictions. Please try again in a few minutes.');
          }
          // No transcript or recording found
          else if (data?.success === false || (!data?.transcript?.value?.length && !data?.hasRecordings)) {
            const searchDetails = data?.foundWith ? ` (Meeting found via: ${data.foundWith})` : '';
            throw new Error(`No transcript or recording found for this meeting${searchDetails}. Ensure the meeting was recorded with transcription enabled in Teams.`);
          }
          // Fallback - return whatever data we have
          else {
            console.log('Enhanced extraction returning partial data');
            return data;
          }

        } catch (err: any) {
          console.error(`Enhanced extraction attempt ${attempt} error:`, err);
          lastError = err;
          
          if (attempt === 5) throw err;
          
          // Enhanced retry logic with longer waits
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(1.5, attempt - 1)));
        }
      }

      throw lastError;
    } catch (error: any) {
      console.error('Enhanced Teams transcript extraction error:', error);
      
      let errorMessage = 'Failed to extract Teams transcript using enhanced methods';
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorMessage = 'Microsoft authentication expired. Please reconnect your Microsoft account in Settings.';
      } else if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        errorMessage = 'Meeting not found in Teams. The meeting may not exist or you may not have access to it.';
      } else if (error.message?.includes('403')) {
        errorMessage = 'Access denied. Please ensure you have permission to access this meeting\'s transcript and recordings.';
      } else if (error.message?.includes('processing') || error.message?.includes('24 hours')) {
        errorMessage = error.message; // Pass through processing-related messages
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  };

  const saveTranscript = async (
    meetingId: string,
    transcriptData: {
      content?: string;
      summary?: string;
      actionItems?: any[];
      participants?: any[];
      teamsTranscriptId?: string;
    }
  ) => {
    try {
      console.log(`Saving transcript for meeting: ${meetingId}`);
      console.log('Transcript data length:', transcriptData.content?.length || 0);
      
      const { data, error } = await supabase
        .from('meeting_transcripts')
        .upsert({
          meeting_id: meetingId,
          transcript_content: transcriptData.content,
          summary: transcriptData.summary,
          action_items: transcriptData.actionItems,
          participants: transcriptData.participants,
          teams_transcript_id: transcriptData.teamsTranscriptId
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving transcript:', error);
        throw error;
      }

      console.log('Transcript saved successfully:', data.id);
      return data;
    } catch (error: any) {
      console.error('Error saving transcript:', error);
      throw new Error('Failed to save transcript to database');
    }
  };

  const saveTranscriptToDocuments = async (transcript: MeetingTranscript, meetingTitle: string, meetingEndTime?: string) => {
    if (!user) return false;

    try {
      const meetingTranscriptsFolderId = await getMeetingTranscriptsFolderId();
      
      // Format the date for the filename
      const meetingDate = meetingEndTime 
        ? new Date(meetingEndTime).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/\//g, '-')
        : new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/\//g, '-');
      
      const fileName = `${meetingTitle}_${meetingDate}_transcript.txt`;
      
      const transcriptText = `
Meeting: ${meetingTitle}
Date: ${meetingEndTime ? new Date(meetingEndTime).toLocaleDateString() : new Date().toLocaleDateString()}
Time: ${meetingEndTime ? new Date(meetingEndTime).toLocaleTimeString() : new Date().toLocaleTimeString()}

TRANSCRIPT:
${transcript.transcript_content || 'No transcript content available'}

PARTICIPANTS:
${transcript.participants?.map((p: any) => `- ${p.identity?.displayName || p.identity?.user?.displayName || p.emailAddress || 'Unknown'}`).join('\n') || 'No participants listed'}

SUMMARY:
${transcript.summary || 'No summary available'}

ACTION ITEMS:
${transcript.action_items?.map((item: any, index: number) => `${index + 1}. ${item.text || item}`).join('\n') || 'No action items'}
      `.trim();
      
      const { error } = await supabase
        .from('documents')
        .insert({
          name: fileName,
          file_path: `transcripts/${transcript.meeting_id}/${fileName}`,
          folder_id: meetingTranscriptsFolderId,
          uploaded_by: user.id,
          mime_type: 'text/plain',
          file_size: transcriptText.length
        });

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error('Error saving transcript to documents:', error);
      throw new Error('Failed to save transcript to documents');
    }
  };

  return {
    transcripts,
    loading,
    fetchTranscriptForMeeting,
    fetchTeamsTranscript,
    saveTranscript,
    saveTranscriptToDocuments
  };
};
