import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Paperclip, Search, RefreshCw, ExternalLink, Circle } from 'lucide-react';
import { useEmails, Email } from '@/hooks/useEmails';
import { EmailDetailView } from './EmailDetailView';

export const EmailModule: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const { emails, loading, fetchEmails, markAsRead, sendEmail, sending } = useEmails();

  const EMAIL_LIMIT = 25;

  const filteredEmails = emails.filter(email => 
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.from.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.from.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Limit to first 25 emails
  const displayedEmails = filteredEmails.slice(0, EMAIL_LIMIT);
  const hasMoreEmails = filteredEmails.length > EMAIL_LIMIT;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString('en-US', {
        weekday: 'short'
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getImportanceBadge = (importance: string) => {
    if (importance === 'high') {
      return <Badge variant="destructive" className="text-xs">High Priority</Badge>;
    }
    return null;
  };

  const handleOpenInOutlook = (email: Email) => {
    const outlookUrl = `https://outlook.office.com/mail/inbox/id/${email.id}`;
    window.open(outlookUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenOutlookInbox = () => {
    const outlookUrl = 'https://outlook.office.com/mail/inbox';
    window.open(outlookUrl, '_blank', 'noopener,noreferrer');
  };

  const handleEmailClick = async (email: Email) => {
    // Mark as read and show full email
    await markAsRead(email.id);
    setSelectedEmail(email);
  };

  const handleBackToInbox = () => {
    setSelectedEmail(null);
  };

  // If an email is selected, show the detail view
  if (selectedEmail) {
    return (
      <EmailDetailView
        email={selectedEmail}
        onBack={handleBackToInbox}
        onOpenInOutlook={handleOpenInOutlook}
      />
    );
  }

  // Otherwise show the email list view
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Email</h1>
        <p className="text-sm text-gray-600">Manage your communications</p>
      </div>

      {/* Search and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search emails by subject, sender, or address"
              className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchEmails} 
          disabled={loading}
          className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
          aria-label="Refresh Email List"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Email List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Email Count Header */}
        {!loading && displayedEmails.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {displayedEmails.length} of {filteredEmails.length} emails
              {hasMoreEmails && ` (${filteredEmails.length - EMAIL_LIMIT} more available)`}
            </p>
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-500">Loading emails...</p>
            </div>
          </div>
        ) : displayedEmails.length > 0 ? (
          <div className="divide-y divide-gray-100 text-sm">
            <div className="overflow-x-auto">
              {displayedEmails.map((email, index) => (
                <div
                  key={email.id || index}
                  className={`group hover:bg-gray-50 transition-colors cursor-pointer ${
                    !email.isRead ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => handleEmailClick(email)}
                >
                  <div className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Email content */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Unread indicator */}
                        {!email.isRead && (
                          <Circle className="h-2 w-2 fill-blue-500 text-blue-500 mt-2 flex-shrink-0" />
                        )}
                        
                        {/* Email details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm truncate ${
                              !email.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                            }`}>
                              {email.from?.name || 'Unknown Sender'}
                            </span>
                            {email.hasAttachments && (
                              <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            )}
                            {getImportanceBadge(email.importance)}
                          </div>
                          
                          <div className="mb-1">
                            <span className={`text-sm ${
                              !email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'
                            } line-clamp-1`}>
                              {email.subject || 'No Subject'}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {email.body.replace(/<[^>]*>/g, '').substring(0, 100)}
                            {email.body.replace(/<[^>]*>/g, '').length > 100 ? '...' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Right side - Date and actions */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-500 min-w-fit">
                          {formatDate(email.receivedDateTime || '')}
                        </span>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInOutlook(email);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-3 text-blue-600 hover:bg-blue-100"
                          aria-label="Open in Outlook"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">
                  {searchTerm ? 'No emails found' : 'No emails'}
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : emails.length === 0 
                      ? 'Connect your Microsoft account in Settings to view emails'
                      : 'All caught up! No new emails to show.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View More in Outlook Button */}
      {hasMoreEmails && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={handleOpenOutlookInbox}
            className="text-blue-600 hover:bg-blue-100"
          >
            View More in Outlook
          </Button>
        </div>
      )}
    </div>
  );
};
