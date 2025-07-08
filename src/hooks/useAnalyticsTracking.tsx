
import { supabase } from '@/integrations/supabase/client';

interface UseAnalyticsTrackingProps {
  documentId: string;
  documentType: 'document' | 'meeting_attachment' | 'poll_attachment';
}

export const useAnalyticsTracking = ({ documentId, documentType }: UseAnalyticsTrackingProps) => {
  const trackView = async () => {
    try {
      console.log('Tracking view for:', documentType, documentId);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        return;
      }

      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Ensure user profile exists first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('User profile not found, creating one...');
        // Create profile if it doesn't exist
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            first_name: user.user_metadata?.first_name || null,
            last_name: user.user_metadata?.last_name || null
          });

        if (createError) {
          console.error('Error creating profile:', createError);
          // Continue anyway as the foreign key constraint might still work
        }
      }

      // Record member-wise analytics
      const { error: analyticsError } = await supabase
        .from('document_analytics')
        .insert({
          document_id: documentId,
          document_type: documentType,
          user_id: user.id,
          action_type: 'view',
          device_type: navigator.platform || 'Unknown',
          user_agent: navigator.userAgent
        });

      if (analyticsError) {
        console.error('Error recording analytics:', analyticsError);
        return;
      }

      if (documentType === 'document') {
        // For regular documents, create a view record in document_views
        const { error } = await supabase
          .from('document_views')
          .insert({
            document_id: documentId,
            user_id: user.id,
            view_started_at: new Date().toISOString(),
            time_spent_seconds: 0,
            completion_percentage: 0,
            last_page_viewed: 1
          });

        if (error) {
          console.error('Error tracking document view:', error);
        }
      } else if (documentType === 'meeting_attachment') {
        // Use the database function to increment view count
        const { error } = await supabase.rpc('increment_view_count', {
          table_name: 'meeting_attachments',
          attachment_id: documentId
        });

        if (error) {
          console.error('Error tracking meeting attachment view:', error);
        } else {
          console.log('Meeting attachment view count incremented successfully');
        }
      } else if (documentType === 'poll_attachment') {
        // Use the database function to increment view count
        const { error } = await supabase.rpc('increment_view_count', {
          table_name: 'poll_attachments',
          attachment_id: documentId
        });

        if (error) {
          console.error('Error tracking poll attachment view:', error);
        } else {
          console.log('Poll attachment view count incremented successfully');
        }
      }

      console.log('View tracked successfully');
    } catch (error) {
      console.error('Error in trackView:', error);
    }
  };

  const trackDownload = async () => {
    try {
      console.log('Tracking download for:', documentType, documentId);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        return;
      }

      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Ensure user profile exists first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('User profile not found, creating one...');
        // Create profile if it doesn't exist
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            first_name: user.user_metadata?.first_name || null,
            last_name: user.user_metadata?.last_name || null
          });

        if (createError) {
          console.error('Error creating profile:', createError);
          // Continue anyway as the foreign key constraint might still work
        }
      }

      // Record member-wise analytics
      const { error: analyticsError } = await supabase
        .from('document_analytics')
        .insert({
          document_id: documentId,
          document_type: documentType,
          user_id: user.id,
          action_type: 'download',
          device_type: navigator.platform || 'Unknown',
          user_agent: navigator.userAgent
        });

      if (analyticsError) {
        console.error('Error recording analytics:', analyticsError);
        return;
      }

      if (documentType === 'meeting_attachment') {
        const { error } = await supabase.rpc('increment_download_count', {
          table_name: 'meeting_attachments',
          attachment_id: documentId
        });

        if (error) {
          console.error('Error tracking meeting attachment download:', error);
        } else {
          console.log('Meeting attachment download count incremented successfully');
        }
      } else if (documentType === 'poll_attachment') {
        const { error } = await supabase.rpc('increment_download_count', {
          table_name: 'poll_attachments',
          attachment_id: documentId
        });

        if (error) {
          console.error('Error tracking poll attachment download:', error);
        } else {
          console.log('Poll attachment download count incremented successfully');
        }
      }

      console.log('Download tracked successfully');
    } catch (error) {
      console.error('Error in trackDownload:', error);
    }
  };

  return {
    trackView,
    trackDownload
  };
};
