
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, Send, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { EmailAttachmentViewer } from './EmailAttachmentViewer';

interface SentMessage {
  id: string;
  subject: string;
  body: string;
  recipients: string[];
  status: string;
  created_at: string;
  sent_at: string | null;
}

export const SentMessagesTab: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSentMessages();
    }
  }, [user]);

  const fetchSentMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching sent messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800"><Mail className="h-3 w-3 mr-1" />Draft</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800"><Send className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const parseAttachmentsFromBody = (body: string) => {
    // Extract attachment information from body if it contains attachment details
    const attachmentMatch = body.match(/Attachments: (.+?)(?:\n|$)/);
    if (!attachmentMatch) return [];

    const attachmentNames = attachmentMatch[1].split(', ').map(name => name.trim());
    return attachmentNames.map(name => ({
      name,
      contentType: getContentTypeFromExtension(name),
      size: undefined // Size not available from body text
    }));
  };

  const getContentTypeFromExtension = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc': return 'application/msword';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'xls': return 'application/vnd.ms-excel';
      case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'ppt': return 'application/vnd.ms-powerpoint';
      case 'txt': return 'text/plain';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      default: return 'application/octet-stream';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Sent Messages</h3>
        <p className="text-sm text-muted-foreground">
          View messages you've sent to the administrator
        </p>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No messages sent</h3>
              <p className="text-sm text-muted-foreground">
                Messages you send to the administrator will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => {
            const attachments = parseAttachmentsFromBody(message.body);
            
            return (
              <Card key={message.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{message.subject}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <span>To: {message.recipients.join(', ')}</span>
                      </div>
                    </div>
                    {getStatusBadge(message.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                  </div>
                  
                  {attachments.length > 0 && (
                    <EmailAttachmentViewer 
                      attachments={attachments}
                      messageSubject={message.subject}
                    />
                  )}
                  
                  {message.sent_at && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Sent: {format(new Date(message.sent_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
