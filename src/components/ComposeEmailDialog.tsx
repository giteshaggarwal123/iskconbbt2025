
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Paperclip, Users, Mail, X } from 'lucide-react';
import { useEmails } from '@/hooks/useEmails';
import { useToast } from '@/hooks/use-toast';

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AttachedFile {
  file: File;
  name: string;
  size: number;
  contentBytes?: string;
  contentType?: string;
}

export const ComposeEmailDialog: React.FC<ComposeEmailDialogProps> = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState({
    to: '',
    template: '',
    subject: '',
    message: '',
  });
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const { sendEmail, sending } = useEmails();
  const { toast } = useToast();

  // File upload constraints
  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png'
  ];

  const handleFileAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (attachedFiles.length + files.length > MAX_FILES) {
      toast({
        title: "Too Many Files",
        description: `Maximum ${MAX_FILES} files allowed`,
        variant: "destructive"
      });
      return;
    }

    setUploadingFiles(true);
    const validFiles: AttachedFile[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        continue;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: File type not supported`);
        continue;
      }

      try {
        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        validFiles.push({
          file,
          name: file.name,
          size: file.size,
          contentBytes: base64Content,
          contentType: file.type
        });
      } catch (error) {
        errors.push(`${file.name}: Failed to process file`);
      }
    }

    if (errors.length > 0) {
      toast({
        title: "File Upload Errors",
        description: errors.join(', '),
        variant: "destructive"
      });
    }

    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
    }

    setUploadingFiles(false);
    // Reset input
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.to.trim() || !formData.subject.trim() || !formData.message.trim()) {
      return;
    }

    const recipients = formData.to.split(',').map(email => email.trim()).filter(Boolean);
    
    await sendEmail({
      subject: formData.subject,
      body: formData.message,
      recipients,
      attachments: attachedFiles.map(file => ({
        name: file.name,
        contentType: file.contentType,
        contentBytes: file.contentBytes
      }))
    });

    // Reset form and close dialog
    setFormData({
      to: '',
      template: '',
      subject: '',
      message: '',
    });
    setAttachedFiles([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Compose Email</span>
          </DialogTitle>
          <DialogDescription>
            Send emails with document attachments and tracking
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="to">Recipients</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="to"
                  value={formData.to}
                  onChange={(e) => setFormData({...formData, to: e.target.value})}
                  placeholder="Enter email addresses (comma separated)"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="template">Template</Label>
              <Select value={formData.template} onValueChange={(value) => setFormData({...formData, template: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting-invitation">Meeting Invitation</SelectItem>
                  <SelectItem value="document-review">Document Review Request</SelectItem>
                  <SelectItem value="voting-reminder">Voting Reminder</SelectItem>
                  <SelectItem value="attendance-followup">Attendance Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              placeholder="Enter email subject"
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              placeholder="Type your message here..."
              rows={8}
              required
            />
          </div>

          {/* File Attachments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>File Attachments</Label>
              <span className="text-xs text-gray-500">
                Max {MAX_FILES} files, 10MB each
              </span>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.xlsx,.txt,.jpg,.jpeg,.png"
                onChange={handleFileAttachment}
                className="hidden"
                id="file-upload"
                disabled={sending || uploadingFiles}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-center">
                  <Paperclip className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to attach files or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supported: PDF, DOCX, PPTX, XLSX, TXT, JPG, PNG
                  </p>
                </div>
              </label>
            </div>

            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Attached Files:</p>
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <Paperclip className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0"
                      type="button"
                      disabled={sending || uploadingFiles}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              {uploadingFiles && (
                <p className="text-sm text-gray-500">Processing files...</p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={sending || uploadingFiles}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
