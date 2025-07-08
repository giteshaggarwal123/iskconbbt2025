
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseDocumentViewTrackingProps {
  documentId: string | null;
  userId: string | null;
  isViewing: boolean;
  documentType?: 'document' | 'poll_attachment';
}

export const useDocumentViewTracking = ({ 
  documentId, 
  userId, 
  isViewing,
  documentType = 'document'
}: UseDocumentViewTrackingProps) => {
  const viewStartTimeRef = useRef<Date | null>(null);
  const viewRecordIdRef = useRef<string | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start tracking when viewing begins
  useEffect(() => {
    if (isViewing && documentId && userId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isViewing, documentId, userId]);

  const startTracking = async () => {
    if (!documentId || !userId) return;

    try {
      viewStartTimeRef.current = new Date();
      console.log('Starting document view tracking at:', viewStartTimeRef.current);

      // For poll attachments, we'll track them differently since they don't exist in the documents table
      if (documentType === 'poll_attachment') {
        console.log('Tracking poll attachment view:', documentId);
        // For now, just log the view - we could create a separate table for attachment views later
        return;
      }

      // Create view record only for documents that exist in the documents table
      const { data, error } = await supabase
        .from('document_views')
        .insert({
          document_id: documentId,
          user_id: userId,
          view_started_at: viewStartTimeRef.current.toISOString(),
          time_spent_seconds: 0,
          completion_percentage: 0,
          last_page_viewed: 1
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating view record:', error);
        return;
      }

      viewRecordIdRef.current = data.id;
      console.log('Created view record:', data.id);

      // Start periodic updates every 30 seconds
      updateIntervalRef.current = setInterval(() => {
        updateTimeSpent();
      }, 30000);

    } catch (error) {
      console.error('Error starting tracking:', error);
    }
  };

  const updateTimeSpent = async () => {
    if (!viewStartTimeRef.current || !viewRecordIdRef.current) return;

    try {
      const currentTime = new Date();
      const timeSpentSeconds = Math.floor(
        (currentTime.getTime() - viewStartTimeRef.current.getTime()) / 1000
      );

      console.log('Updating time spent:', timeSpentSeconds, 'seconds');

      await supabase
        .from('document_views')
        .update({
          time_spent_seconds: timeSpentSeconds
        })
        .eq('id', viewRecordIdRef.current);

    } catch (error) {
      console.error('Error updating time spent:', error);
    }
  };

  const stopTracking = async () => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    if (!viewStartTimeRef.current || !viewRecordIdRef.current) return;

    try {
      const endTime = new Date();
      const timeSpentSeconds = Math.floor(
        (endTime.getTime() - viewStartTimeRef.current.getTime()) / 1000
      );

      console.log('Stopping tracking. Total time:', timeSpentSeconds, 'seconds');

      await supabase
        .from('document_views')
        .update({
          view_ended_at: endTime.toISOString(),
          time_spent_seconds: timeSpentSeconds
        })
        .eq('id', viewRecordIdRef.current);

      // Reset
      viewStartTimeRef.current = null;
      viewRecordIdRef.current = null;

    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  };

  return {
    updateTimeSpent
  };
};
