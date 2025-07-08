import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useMicrosoftAuth } from './useMicrosoftAuth';

export interface Email {
  id: string;
  subject: string;
  from: {
    name: string;
    address: string;
  };
  body: string;
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: string;
}

export const useEmails = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isConnected, isExpired, accessToken, checkAndRefreshToken } = useMicrosoftAuth();

  const fetchEmails = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (!isConnected) {
        toast({
          title: "Microsoft Account Required",
          description: "Please connect your Microsoft account in Settings to view emails",
          variant: "destructive"
        });
        return;
      }

      if (isExpired) {
        // Try to refresh the token
        await checkAndRefreshToken();
        return;
      }

      if (!accessToken) {
        toast({
          title: "Authentication Error",
          description: "Microsoft access token not available. Please reconnect your account.",
          variant: "destructive"
        });
        return;
      }

      // Fetch emails from Microsoft Graph
      const response = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token might be expired, try to refresh
          await checkAndRefreshToken();
          return;
        }
        throw new Error('Failed to fetch emails from Microsoft Graph');
      }

      const data = await response.json();
      
      const formattedEmails: Email[] = data.value.map((email: any) => ({
        id: email.id,
        subject: email.subject || 'No Subject',
        from: {
          name: email.from?.emailAddress?.name || 'Unknown Sender',
          address: email.from?.emailAddress?.address || ''
        },
        body: email.body?.content || '',
        receivedDateTime: email.receivedDateTime,
        isRead: email.isRead,
        hasAttachments: email.hasAttachments,
        importance: email.importance
      }));

      setEmails(formattedEmails);
    } catch (error: any) {
      console.error('Error fetching emails:', error);

      let description = error.message || "Failed to load emails from Outlook";
      if (!isConnected) {
        description = "Please connect your Microsoft account in Settings to view emails.";
      } else if (isExpired) {
        description = "Your Microsoft authentication has expired. Please reconnect your account in Settings.";
      } else if (!accessToken) {
        description = "Microsoft access token not available. Please reconnect your account.";
      }

      toast({
        title: "Error Fetching Emails",
        description,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (emailData: {
    subject: string;
    body: string;
    recipients: string[];
    attachments?: any[];
  }) => {
    if (!user) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-outlook-email', {
        body: emailData
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: "Your email has been sent successfully",
      });

      // Refresh emails after sending
      fetchEmails();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to Send Email",
        description: error.message || "Failed to send email",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (emailId: string) => {
    if (!user || !accessToken) return;

    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${emailId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isRead: true
        })
      });

      if (response.ok) {
        setEmails(prev => prev.map(email => 
          email.id === emailId ? { ...email, isRead: true } : email
        ));
      } else if (response.status === 401) {
        // Token expired, refresh it
        await checkAndRefreshToken();
      }
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  useEffect(() => {
    if (user && isConnected && !isExpired) {
      fetchEmails();
    }
  }, [user, isConnected, isExpired, accessToken]);

  return {
    emails,
    loading,
    sending,
    fetchEmails,
    sendEmail,
    markAsRead
  };
};
