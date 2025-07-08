import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Paperclip, ExternalLink, Calendar, User, Copy } from 'lucide-react';
import { Email } from '@/hooks/useEmails';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EmailDetailViewProps {
  email: Email;
  onBack: () => void;
  onOpenInOutlook: (email: Email) => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  email,
  onBack,
  onOpenInOutlook
}) => {
  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getImportanceBadge = (importance: string) => {
    if (importance === 'high') {
      return <Badge variant="destructive" className="text-xs">High Priority</Badge>;
    }
    return null;
  };

  // Clean and format email body
  const formatEmailBody = (body: string) => {
    // Remove HTML tags and decode HTML entities
    const cleanText = body
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    return cleanText;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Mock data for CC and BCC - in real implementation, this would come from the email object
  const ccRecipients: string[] = []; // email.cc || []
  const bccRecipients: string[] = []; // email.bcc || []

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2"
          aria-label="Back to Inbox"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inbox
        </Button>
        
        <Button
          variant="outline"
          onClick={() => onOpenInOutlook(email)}
          className="flex items-center gap-2 ml-auto"
          aria-label="Open in Outlook"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <ExternalLink className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Open in Outlook</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Button>
      </div>

      {/* Email Content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {/* Email Header */}
        <div className="border-b border-gray-100 p-6">
          <div className="space-y-4">
            {/* Subject and Priority */}
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl font-semibold text-gray-900 flex-1">
                {email.subject || 'No Subject'}
              </h1>
              {getImportanceBadge(email.importance)}
            </div>

            {/* Email Recipients Section - Outlook Style */}
            <div className="space-y-2">
              {/* From */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-12">From:</span>
                    <span className="font-medium text-gray-900">{email.from?.name || 'Unknown Sender'}</span>
                    <span className="text-sm text-gray-600">&lt;{email.from?.address || ''}&gt;</span>
                    <button 
                      onClick={() => copyToClipboard(email.from?.address || '')}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                      title="Copy email address"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* To Section */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-white">TO</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-12">To:</span>
                    <span className="text-sm text-gray-900">Me</span>
                    <button 
                      onClick={() => copyToClipboard('current-user@email.com')}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                      title="Copy email address"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* CC Section - Only show if there are CC recipients */}
              {ccRecipients.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-white">CC</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 w-12">Cc:</span>
                      <span className="text-sm text-gray-900">{ccRecipients.join(', ')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* BCC Section - Only show if there are BCC recipients */}
              {bccRecipients.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-white">BCC</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 w-12">Bcc:</span>
                      <span className="text-sm text-gray-900">{bccRecipients.join(', ')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Date and Time */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-200 mt-4">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Sent: {formatFullDate(email.receivedDateTime || '')}
                </span>
                {email.hasAttachments && (
                  <div className="flex items-center gap-1 ml-4">
                    <Paperclip className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Has attachments</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Email Body - Outlook-like styling */}
        <div className="p-6">
          {formatEmailBody(email.body) ? (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                {formatEmailBody(email.body)}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
              <p className="text-gray-500 italic">This email has no content.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Message ID: {email.id.substring(0, 20)}...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
