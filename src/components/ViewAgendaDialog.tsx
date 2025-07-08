import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Users, MapPin, Video, Calendar, Paperclip, Upload, FileText, Download, Eye, Trash2, X } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DocumentAnalytics } from './DocumentAnalytics';

interface ViewAgendaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: any;
}

interface MeetingFile {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
  download_count: number | null;
  view_count: number | null;
}

export const ViewAgendaDialog: React.FC<ViewAgendaDialogProps> = ({ open, onOpenChange, meeting }) => {
  const [meetingFiles, setMeetingFiles] = useState<MeetingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const now = new Date();
  const isPastMeeting = meeting?.end_time ? isAfter(now, new Date(meeting.end_time)) : false;

  useEffect(() => {
    if (open && meeting) {
      fetchMeetingFiles();
      fetchAttendeesWithProfiles();
    }
  }, [open, meeting]);

  const fetchMeetingFiles = async () => {
    if (!meeting) return;
    
    setLoadingFiles(true);
    try {
      const { data, error } = await supabase
        .from('meeting_attachments')
        .select('*')
        .eq('meeting_id', meeting.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetingFiles(data || []);
    } catch (error) {
      console.error('Error fetching meeting files:', error);
      toast({
        title: "Error",
        description: "Failed to load meeting files",
        variant: "destructive"
      });
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchAttendeesWithProfiles = async () => {
    if (!meeting) return;
    try {
      // Fetch meeting attendees
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('meeting_attendees')
        .select('id, user_id, status')
        .eq('meeting_id', meeting.id);
      if (attendeesError) throw attendeesError;
      if (!attendeesData || attendeesData.length === 0) {
        setAttendees([]);
        return;
      }
      // Fetch profiles
      const userIds = attendeesData.map((a: any) => a.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      if (profilesError) throw profilesError;
      // Merge
      const merged = attendeesData.map((att: any) => {
        const profile = profilesData?.find((p: any) => p.id === att.user_id);
        return {
          ...att,
          full_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '-',
          email: profile?.email || '-',
        };
      });
      setAttendees(merged);
    } catch (error) {
      console.error('Error fetching attendee details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendee names',
        variant: 'destructive',
      });
      setAttendees([]);
    }
  };

  const trackFileView = async (fileId: string) => {
    try {
      console.log('Tracking view for file:', fileId);
      
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Record member-wise analytics
      const { error: analyticsError } = await supabase
        .from('document_analytics')
        .insert({
          document_id: fileId,
          document_type: 'meeting_attachment',
          user_id: user.id,
          action_type: 'view',
          device_type: navigator.platform || 'Unknown',
          user_agent: navigator.userAgent
        });

      if (analyticsError) {
        console.error('Error recording analytics:', analyticsError);
      }

      // Increment view count using the database function
      const { error: viewError } = await supabase.rpc('increment_view_count', {
        table_name: 'meeting_attachments',
        attachment_id: fileId
      });

      if (viewError) {
        console.error('Error incrementing view count:', viewError);
      } else {
        console.log('View count incremented successfully');
      }

    } catch (error) {
      console.error('Error in trackFileView:', error);
    }
  };

  const trackFileDownload = async (fileId: string) => {
    try {
      console.log('Tracking download for file:', fileId);
      
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Record member-wise analytics
      const { error: analyticsError } = await supabase
        .from('document_analytics')
        .insert({
          document_id: fileId,
          document_type: 'meeting_attachment',
          user_id: user.id,
          action_type: 'download',
          device_type: navigator.platform || 'Unknown',
          user_agent: navigator.userAgent
        });

      if (analyticsError) {
        console.error('Error recording analytics:', analyticsError);
      }

      // Increment download count using the database function
      const { error: downloadError } = await supabase.rpc('increment_download_count', {
        table_name: 'meeting_attachments',
        attachment_id: fileId
      });

      if (downloadError) {
        console.error('Error incrementing download count:', downloadError);
      } else {
        console.log('Download count incremented successfully');
      }

    } catch (error) {
      console.error('Error in trackFileDownload:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !meeting || !user) return;

    setUploading(true);
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${meeting.id}/${Date.now()}_${file.name}`;
        
        // First, ensure the bucket exists or create it
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(bucket => bucket.name === 'meeting-attachments');
        
        if (!bucketExists) {
          const { error: bucketError } = await supabase.storage.createBucket('meeting-attachments', {
            public: true,
            allowedMimeTypes: ['*/*'],
            fileSizeLimit: 52428800 // 50MB
          });
          
          if (bucketError) {
            console.error('Error creating bucket:', bucketError);
          }
        }
        
        // Upload file to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('meeting-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save file metadata to database
        const { error: dbError } = await supabase
          .from('meeting_attachments')
          .insert({
            meeting_id: meeting.id,
            name: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Files Uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      });

      fetchMeetingFiles();
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleFileView = async (file: MeetingFile) => {
    try {
      console.log('Attempting to view file:', file.file_path);
      
      // Track the view first
      await trackFileView(file.id);

      // Check if the bucket exists and file is accessible
      const { data: urlData } = supabase.storage
        .from('meeting-attachments')
        .getPublicUrl(file.file_path);

      console.log('Public URL generated:', urlData.publicUrl);

      if (urlData.publicUrl) {
        // Test if the file is accessible by trying to fetch it
        try {
          const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            // File is accessible, open it
            const newWindow = window.open(urlData.publicUrl, '_blank');
            if (!newWindow) {
              toast({
                title: "Popup Blocked",
                description: "Please allow popups to view the file",
                variant: "destructive"
              });
            } else {
              toast({
                title: "File Opened",
                description: "File opened in new tab",
              });
            }
          } else {
            throw new Error('File not accessible via public URL');
          }
        } catch (fetchError) {
          console.log('Public URL not accessible, trying signed URL...');
          
          // Fallback to signed URL
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('meeting-attachments')
            .createSignedUrl(file.file_path, 3600);

          if (!signedUrlError && signedUrlData.signedUrl) {
            const newWindow = window.open(signedUrlData.signedUrl, '_blank');
            if (!newWindow) {
              toast({
                title: "Popup Blocked",
                description: "Please allow popups to view the file",
                variant: "destructive"
              });
            } else {
              toast({
                title: "File Opened",
                description: "File opened in new tab",
              });
            }
          } else {
            throw new Error('Could not generate file access URL');
          }
        }
      } else {
        throw new Error('Could not generate public URL');
      }

      // Refresh the file list to show updated counts
      setTimeout(() => {
        fetchMeetingFiles();
      }, 1000);

    } catch (error: any) {
      console.error('Error viewing file:', error);
      toast({
        title: "View Failed",
        description: "Unable to open file. The file may not exist or the storage is not properly configured.",
        variant: "destructive"
      });
    }
  };

  const handleFileDownload = async (file: MeetingFile) => {
    try {
      // Track the download first
      await trackFileDownload(file.id);

      const { data, error } = await supabase.storage
        .from('meeting-attachments')
        .download(file.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading ${file.name}`,
      });

      // Refresh the file list to show updated counts
      setTimeout(() => {
        fetchMeetingFiles();
      }, 1000);

    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download file",
        variant: "destructive"
      });
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const file = meetingFiles.find(f => f.id === fileId);
      if (!file) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('meeting-attachments')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('meeting_attachments')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast({
        title: "File Deleted",
        description: "File deleted successfully",
      });

      fetchMeetingFiles();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete file",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!meeting) return null;

  const startTime = new Date(meeting.start_time);
  const endTime = new Date(meeting.end_time);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  let durationText = '';
  if (hours > 0) durationText += `${hours}h `;
  if (minutes > 0) durationText += `${minutes}m`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto relative">
        <DialogClose asChild>
          <button
            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-200 focus:outline-none"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{meeting.title}</DialogTitle>
          <DialogDescription>
            Meeting scheduled for {format(startTime, 'MMMM dd, yyyy')} at {format(startTime, 'h:mm a')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Meeting Details</TabsTrigger>
            <TabsTrigger value="attachments" className="relative">
              Attachments
              {meetingFiles.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {meetingFiles.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{durationText.trim() || '0m'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{meeting.attendees?.length || 0} attendees</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{meeting.location || 'No location specified'}</span>
              </div>
              {meeting.meeting_type && (
                <Badge variant="outline">{meeting.meeting_type}</Badge>
              )}
            </div>

            {/* Attendee/member details */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Attendees</h3>
              {attendees.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border rounded-lg">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.map((att: any) => (
                        <tr key={att.user_id} className="border-t">
                          <td className="px-3 py-2">{att.full_name}</td>
                          <td className="px-3 py-2">{att.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-500 italic">No attendees for this meeting.</div>
              )}
            </div>

            {meeting.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Description</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{meeting.description}</p>
              </div>
            )}

            {/* Agenda section */}
            {Array.isArray(meeting.agendas) && meeting.agendas.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Agenda</h3>
                <ol className="list-decimal list-inside bg-gray-50 p-3 rounded-lg">
                  {meeting.agendas.map((agenda: string, idx: number) => (
                    <li key={idx} className="mb-1 text-gray-800">{agenda}</li>
                  ))}
                </ol>
              </div>
            )}

            {meeting.teams_join_url && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Meeting Link</h3>
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <Video className="h-4 w-4 text-blue-600" />
                  <a 
                    href={meeting.teams_join_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Join Microsoft Teams Meeting
                  </a>
                </div>
              </div>
            )}

            {/* Teams Transcript Link */}
            {meeting.teams_meeting_id && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Transcript</h3>
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <Button
                    asChild
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <a
                      href={`https://teams.microsoft.com/l/meetingTranscript/${meeting.teams_meeting_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Transcript in Teams
                    </a>
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Meeting Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Start Time:</span>
                  <div className="font-medium">{format(startTime, 'MMMM dd, yyyy h:mm a')}</div>
                </div>
                <div>
                  <span className="text-gray-500">End Time:</span>
                  <div className="font-medium">{format(endTime, 'MMMM dd, yyyy h:mm a')}</div>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <div className="font-medium">{meeting.status || 'Scheduled'}</div>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <div className="font-medium">{meeting.meeting_type || 'Not specified'}</div>
                </div>
              </div>
            </div>

            {meeting.outlook_event_id && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 text-sm">This meeting has been added to your Outlook calendar</span>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="attachments" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Meeting Attachments</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading || isPastMeeting}
                />
                <Button
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploading || isPastMeeting}
                  className="bg-purple-600 hover:bg-purple-700"
                  style={isPastMeeting ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Attach Files'}
                </Button>
              </div>
            </div>

            {loadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : meetingFiles.length > 0 ? (
              <div className="space-y-3">
                {meetingFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-gray-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatFileSize(file.file_size ?? 0)}</span>
                          <span>{format(new Date(file.created_at), 'MMM dd, yyyy')}</span>
                          <span className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{file.view_count || 0}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Download className="h-3 w-3" />
                            <span>{file.download_count || 0}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFileView(file)}
                        className="h-8 px-2"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <DocumentAnalytics
                        documentId={file.id}
                        documentName={file.name}
                        documentType="meeting_attachment"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFileDownload(file)}
                        className="h-8 px-2"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFileDelete(file.id)}
                        className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Paperclip className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">No files attached to this meeting</p>
                <p className="text-sm text-gray-500">Upload files to share with meeting participants</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
