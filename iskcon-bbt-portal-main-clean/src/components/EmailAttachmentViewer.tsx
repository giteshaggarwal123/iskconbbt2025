
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, File, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailAttachment {
  name: string;
  contentBytes?: string;
  contentType?: string;
  size?: number;
}

interface EmailAttachmentViewerProps {
  attachments: EmailAttachment[];
  messageSubject: string;
}

export const EmailAttachmentViewer: React.FC<EmailAttachmentViewerProps> = ({
  attachments,
  messageSubject
}) => {
  const { toast } = useToast();

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType?: string) => {
    if (!contentType) return <File className="h-4 w-4" />;
    
    if (contentType.includes('image')) return <File className="h-4 w-4 text-blue-500" />;
    if (contentType.includes('pdf')) return <File className="h-4 w-4 text-red-500" />;
    if (contentType.includes('word') || contentType.includes('document')) return <File className="h-4 w-4 text-blue-600" />;
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return <File className="h-4 w-4 text-green-600" />;
    if (contentType.includes('powerpoint') || contentType.includes('presentation')) return <File className="h-4 w-4 text-orange-600" />;
    
    return <File className="h-4 w-4" />;
  };

  const handleDownload = (attachment: EmailAttachment) => {
    try {
      if (!attachment.contentBytes) {
        toast({
          title: "Download Failed",
          description: "Attachment content not available",
          variant: "destructive"
        });
        return;
      }

      // Convert base64 to blob
      const byteCharacters = atob(attachment.contentBytes);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: attachment.contentType || 'application/octet-stream' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading "${attachment.name}"`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download attachment",
        variant: "destructive"
      });
    }
  };

  const handleView = (attachment: EmailAttachment) => {
    try {
      if (!attachment.contentBytes) {
        toast({
          title: "View Failed",
          description: "Attachment content not available",
          variant: "destructive"
        });
        return;
      }

      // Convert base64 to blob
      const byteCharacters = atob(attachment.contentBytes);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: attachment.contentType || 'application/octet-stream' });

      // Create blob URL and open in new tab
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      toast({
        title: "Opening File",
        description: `Opening "${attachment.name}" in new tab`
      });
    } catch (error) {
      console.error('View error:', error);
      toast({
        title: "View Failed",
        description: "Failed to open attachment",
        variant: "destructive"
      });
    }
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Attachments ({attachments.length}):</h4>
      <div className="space-y-2">
        {attachments.map((attachment, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {getFileIcon(attachment.contentType)}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{attachment.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {attachment.contentType?.split('/')[1] || 'file'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleView(attachment)}
                className="h-8 px-2"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(attachment)}
                className="h-8 px-2"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
