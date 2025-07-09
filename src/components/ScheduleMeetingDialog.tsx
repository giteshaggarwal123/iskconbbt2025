import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Video, MapPin, Paperclip, X, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useMeetings } from '@/hooks/useMeetings';
import { useMicrosoftAuth } from '@/hooks/useMicrosoftAuth';
import { AttendeeSelector } from './AttendeeSelector';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean, meetingCreatedOrEdited?: boolean) => void;
  preselectedDate?: Date;
  meetingToEdit?: any;
}

interface MeetingFormData {
  title: string;
  description: string;
  time: string;
  duration: string;
  type: string;
  location: string;
}

interface AttachedFile {
  file: File;
  name: string;
  size: number;
}

// Helper to convert duration string to minutes
function durationToMinutes(duration: string): number {
  switch (duration) {
    case '30min': return 30;
    case '1hour': return 60;
    case '1.5hours': return 90;
    case '2hours': return 120;
    case '3hours': return 180;
    default:
      // fallback: try to parse as minutes
      const n = parseFloat(duration);
      return isNaN(n) ? 60 : n;
  }
}

export const ScheduleMeetingDialog: React.FC<ScheduleMeetingDialogProps> = ({ 
  open, 
  onOpenChange, 
  preselectedDate, 
  meetingToEdit 
}) => {
  const { register, handleSubmit, setValue, watch, reset } = useForm<MeetingFormData>();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agendas, setAgendas] = useState<string[]>(['']);
  // Generate a preview Meeting ID (M-YYYY-NNN)
  const [meetingIdPreview, setMeetingIdPreview] = useState<string>('');
  
  const { createMeeting, updateMeeting } = useMeetings();
  const { isConnected } = useMicrosoftAuth();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const watchType = watch('type');
  const watchTime = watch('time');

  // Set preselected date when dialog opens
  useEffect(() => {
    if (open && preselectedDate) {
      setSelectedDate(preselectedDate);
    }
  }, [open, preselectedDate]);

  // Pre-fill form if editing
  useEffect(() => {
    const fetchAttendeeEmails = async (userIds: string[]) => {
      if (!userIds.length) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      if (error) return userIds; // fallback to IDs if error
      return userIds.map(id => data.find((u: any) => u.id === id)?.email || id);
    };
    if (open && meetingToEdit) {
      setValue('title', meetingToEdit.title || '');
      setValue('description', meetingToEdit.description || '');
      setValue('time', meetingToEdit.start_time ? meetingToEdit.start_time.slice(11, 16) : '');
      // Duration: try to infer from start/end time if not present
      if (meetingToEdit.duration) {
        setValue('duration', meetingToEdit.duration);
      } else if (meetingToEdit.start_time && meetingToEdit.end_time) {
        const start = new Date(meetingToEdit.start_time);
        const end = new Date(meetingToEdit.end_time);
        const mins = Math.round((end.getTime() - start.getTime()) / 60000);
        setValue('duration', mins.toString());
      }
      setValue('type', meetingToEdit.meeting_type || '');
      setValue('location', meetingToEdit.location || '');
      setSelectedDate(meetingToEdit.start_time ? new Date(meetingToEdit.start_time) : undefined);
      setAttachedFiles([]); // Optionally load existing attachments
      setRsvpEnabled(true);
      // Fix: fetch emails for attendee user IDs
      if (meetingToEdit.attendees && meetingToEdit.attendees.length > 0) {
        fetchAttendeeEmails(meetingToEdit.attendees.map((a: any) => a.user_id)).then(emails => {
          // Combine registered attendees with manual attendees (map objects to email)
          const allAttendees = [
            ...emails,
            ...((meetingToEdit.manual_attendees || []).map((a: string | { email: string }) => typeof a === 'string' ? a : a.email))
          ];
          setSelectedAttendees(allAttendees);
        });
      } else {
        // Only manual attendees (map objects to email)
        setSelectedAttendees((meetingToEdit.manual_attendees || []).map((a: string | { email: string }) => typeof a === 'string' ? a : a.email));
      }
    } else if (open && !meetingToEdit) {
      reset();
      setSelectedDate(preselectedDate);
      setSelectedAttendees([]);
      setAttachedFiles([]);
      setRsvpEnabled(true);
    }
  }, [open, meetingToEdit, preselectedDate, reset, setValue]);

  // Enhanced time validation function
  const isTimeInPast = (timeString: string, selectedDate: Date | undefined) => {
    if (!timeString || !selectedDate) return false;
    
    const now = new Date();
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Only check if it's today
    if (selectedDateOnly.getTime() !== today.getTime()) return false;
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const selectedDateTime = new Date();
    selectedDateTime.setHours(hours, minutes, 0, 0);
    
    // Add 5-minute buffer to current time
    const nowWithBuffer = new Date(now.getTime() + 5 * 60 * 1000);
    
    return selectedDateTime <= nowWithBuffer;
  };

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

  const handleDateSelect = (date: Date | undefined) => {
    console.log('Date selected:', date);
    setSelectedDate(date);
    setShowCalendar(false);
    
    // Clear time if switching to today and current time is in past
    if (date && watchTime) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateOnly = new Date(date);
      selectedDateOnly.setHours(0, 0, 0, 0);
      
      if (selectedDateOnly.getTime() === today.getTime() && isTimeInPast(watchTime, date)) {
        setValue('time', '');
        toast({
          title: "Time Reset",
          description: "Selected time was in the past, please choose a future time",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (attachedFiles.length + files.length > MAX_FILES) {
      toast({
        title: "Too Many Files",
        description: `Maximum ${MAX_FILES} files allowed`,
        variant: "destructive"
      });
      return;
    }

    const validFiles: AttachedFile[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: File type not supported`);
        return;
      }

      validFiles.push({
        file,
        name: file.name,
        size: file.size
      });
    });

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

  const uploadMeetingFiles = async (meetingId: string) => {
    if (attachedFiles.length === 0 || !user) return;

    setUploadingFiles(true);
    try {
      for (const attachedFile of attachedFiles) {
        // Upload file to Supabase storage
        const fileExt = attachedFile.file.name.split('.').pop();
        const fileName = `${meetingId}/${Date.now()}_${attachedFile.file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('meeting-attachments')
          .upload(fileName, attachedFile.file);

        if (uploadError) throw uploadError;

        // Save file metadata to database
        const { error: dbError } = await (supabase as any)
          .from('meeting_attachments')
          .insert({
            meeting_id: meetingId,
            name: attachedFile.file.name,
            file_path: uploadData.path,
            file_size: attachedFile.file.size,
            mime_type: attachedFile.file.type,
            uploaded_by: user.id
          });

        if (dbError) throw dbError;
      }

      if (attachedFiles.length > 0) {
        toast({
          title: "Files Uploaded",
          description: `${attachedFiles.length} file(s) uploaded successfully`,
        });
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        title: "File Upload Failed",
        description: error.message || "Failed to upload some files",
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const onSubmit = async (data: MeetingFormData) => {
    if (isSubmitting) return; // Prevent multiple submissions
    try {
      setIsSubmitting(true);
      console.log('Form submission started');
      console.log('Selected date:', selectedDate);
      console.log('Form data:', data);

      if (!selectedDate) {
        toast({
          title: "Date Required",
          description: "Please select a meeting date",
          variant: "destructive"
        });
        return;
      }

      if (!data.time) {
        toast({
          title: "Time Required",
          description: "Please select a meeting time",
          variant: "destructive"
        });
        return;
      }

      if (!user) {
        toast({ title: 'Authentication Required', description: 'Please sign in to create meetings', variant: 'destructive' });
        return;
      }

      const meetingDate = new Date(selectedDate);
      const [hours, minutes] = data.time.split(':').map(Number);
      meetingDate.setHours(hours, minutes, 0, 0);
      const startTimeISO = meetingDate.toISOString();
      const attendeesString = selectedAttendees.join(', ');

      const meetingData = {
        title: data.title,
        description: data.description,
        date: meetingDate,
        location: data.type === 'online'
          ? 'Microsoft Teams Meeting'
          : data.type === 'hybrid'
            ? (data.location ? `${data.location} + Microsoft Teams` : 'Microsoft Teams + Physical Location')
            : data.location,
        attendees: selectedAttendees.join(', '),
        attachments: attachedFiles,
        rsvpEnabled,
        type: data.type,
        agendas,
      };

      console.log('Meeting data being sent:', meetingData);

      if (meetingToEdit) {
        // Edit mode
        // Separate registered users from manual emails
        const registeredEmails: string[] = [];
        const manualEmails: string[] = [];
        
        for (const email of selectedAttendees) {
          const { data: userProfile } = await supabase.from('profiles').select('id').eq('email', email).single();
          if (userProfile?.id) {
            registeredEmails.push(email);
          } else {
            manualEmails.push(email);
          }
        }

        const updated = await updateMeeting(meetingToEdit.id, {
          title: data.title,
          description: data.description,
          start_time: meetingDate.toISOString(),
          end_time: new Date(meetingDate.getTime() + durationToMinutes(data.duration) * 60000).toISOString(),
          meeting_type: data.type,
          location: data.location,
          manual_attendees: manualEmails, // Store manual emails in meetings table
          agendas,
        });
        
        // Update attendees: remove all, add new
        if (updated) {
          // Remove all old attendees
          await supabase.from('meeting_attendees').delete().eq('meeting_id', meetingToEdit.id);
          // Add new attendees (only registered users)
          for (const email of registeredEmails) {
            const { data: userProfile } = await supabase.from('profiles').select('id').eq('email', email).single();
            const userId = userProfile?.id;
            if (userId) {
              await supabase.from('meeting_attendees').insert({ meeting_id: meetingToEdit.id, user_id: userId });
            }
          }
          
          // Send invitations to manual emails
          if (manualEmails.length > 0) {
            try {
              await supabase.functions.invoke('send-outlook-email', {
                body: {
                  subject: `Meeting Invitation: ${data.title}`,
                  body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2>Meeting Invitation</h2>
                      <p><strong>Meeting:</strong> ${data.title}</p>
                      <p><strong>Date:</strong> ${meetingDate.toLocaleDateString()}</p>
                      <p><strong>Time:</strong> ${data.time}</p>
                      <p><strong>Location:</strong> ${data.location}</p>
                      <p><strong>Description:</strong> ${data.description}</p>
                      <br>
                      <p>You have been invited to attend this meeting. Please respond to this email to confirm your attendance.</p>
                    </div>
                  `,
                  recipients: manualEmails
                }
              });
              toast({
                title: "Invitations Sent",
                description: `Invitations sent to ${manualEmails.length} external attendees`,
              });
            } catch (error) {
              console.error('Error sending invitations to manual emails:', error);
              toast({
                title: "Invitation Error",
                description: "Failed to send invitations to external attendees",
                variant: "destructive"
              });
            }
          }
          
          toast({ title: 'Meeting Updated', description: 'Meeting details updated successfully.' });
          reset();
          setSelectedDate(undefined);
          setSelectedAttendees([]);
          setAttachedFiles([]);
          setRsvpEnabled(true);
          onOpenChange(false, true);
        }
        return;
      }

      const meeting = await createMeeting({
        title: data.title,
        description: data.description,
        date: meetingDate,
        time: data.time,
        duration: data.duration,
        type: data.type,
        location: data.location,
        attendees: selectedAttendees.join(', '),
        attachments: attachedFiles,
        rsvpEnabled,
        agendas,
      });

      if (meeting) {
        // Upload files after meeting is created
        if (attachedFiles.length > 0) {
          await uploadMeetingFiles(meeting.id);
        }

        reset();
        setSelectedDate(undefined);
        setSelectedAttendees([]);
        setAttachedFiles([]);
        setRsvpEnabled(true);
        onOpenChange(false, true); // Pass true to indicate meeting was created
      }
    } catch (error: any) {
      console.error('Error submitting meeting:', error);
      toast({
        title: "Meeting Creation Error",
        description: error.message || "Failed to create meeting",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    reset();
    setSelectedDate(undefined);
    setSelectedAttendees([]);
    setAttachedFiles([]);
    setRsvpEnabled(true);
    onOpenChange(false, false); // Pass false to indicate no meeting was created
  };

  // Generate minimum time for today (current time + 5 minutes buffer)
  const getMinTimeForToday = () => {
    if (!selectedDate) return '';
    
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    // Only apply minimum time if it's today
    if (selectedDateOnly.getTime() !== today.getTime()) return '';
    
    // Add 5-minute buffer to current time
    const minTime = new Date(now.getTime() + 5 * 60 * 1000);
    const hours = minTime.getHours().toString().padStart(2, '0');
    const minutes = minTime.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  };

  // Agenda handlers
  const handleAgendaChange = (idx: number, value: string) => {
    setAgendas(agendas => agendas.map((a, i) => i === idx ? value : a));
  };
  const addAgenda = () => setAgendas(agendas => [...agendas, '']);
  const removeAgenda = (idx: number) => setAgendas(agendas => agendas.length > 1 ? agendas.filter((_, i) => i !== idx) : agendas);

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl p-0">
        {/* Close button, absolutely positioned in the top-right corner */}
        <button
          type="button"
          aria-label="Close"
          onClick={handleDialogClose}
          className="absolute top-2 right-2 p-2 rounded hover:bg-gray-100 focus:outline-none z-20"
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="p-6">
          <DialogHeader>
            <DialogTitle>{meetingToEdit ? 'Edit Meeting' : 'Schedule New Meeting'}</DialogTitle>
            <DialogDescription>
              {meetingToEdit ? 'Edit meeting details and attendees.' : 'Create a new meeting with file attachments.'}
              {preselectedDate && !meetingToEdit && (
                <span className="block mt-2 text-primary text-sm font-medium">
                  Creating meeting for {format(preselectedDate, 'MMMM dd, yyyy')}
                </span>
              )}
              {!isConnected && watchType === 'online' && (
                <span className="block mt-2 text-orange-600 text-sm">
                  Connect your Microsoft account in Settings to create Teams meetings automatically.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 mt-4">
            {/* Section: Meeting Details */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="text-lg font-bold mb-4">Meeting Details</h3>
              <div className="mb-4">
                <Label className="font-semibold">Meeting ID</Label>
                <div className="mt-1 px-3 py-2 rounded bg-gray-100 text-blue-700 font-mono text-base border border-blue-200 w-fit">
                  {meetingIdPreview}
                </div>
                <div className="text-xs text-gray-500 mt-1">This ID will be assigned to the meeting upon creation.</div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input 
                    id="title" 
                    {...register('title', { required: true })}
                    placeholder="e.g., Monthly Bureau Meeting"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    {...register('description')}
                    placeholder="Meeting agenda and details..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Agenda(s)</Label>
                  <div className="space-y-2">
                    {agendas.map((agenda, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          value={agenda}
                          onChange={e => handleAgendaChange(idx, e.target.value)}
                          placeholder={`Agenda item #${idx + 1}`}
                          className="flex-1"
                        />
                        {agendas.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeAgenda(idx)} aria-label="Remove agenda">
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addAgenda} className="mt-1">+ Add Agenda</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Date & Time */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="text-lg font-bold mb-4">Date & Time</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="time">Time *</Label>
                  <select
                    id="time"
                    className="w-full border rounded px-3 py-2 text-left bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    value={watchTime || ''}
                    onChange={e => setValue('time', e.target.value)}
                  >
                    <option value="" disabled>Select time</option>
                    {Array.from({ length: 24 * 4 }, (_, i) => {
                      const hour = Math.floor(i / 4);
                      const minute = (i % 4) * 15;
                      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                      return <option key={timeStr} value={timeStr}>{timeStr}</option>;
                    })}
                  </select>
                  {watchTime && isTimeInPast(watchTime, selectedDate) && (
                    <p className="text-sm text-red-500 mt-1">
                      Selected time is in the past. Please choose a time at least 5 minutes from now.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="duration">Duration *</Label>
                  <Select onValueChange={(value) => setValue('duration', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="1.5hours">1.5 hours</SelectItem>
                      <SelectItem value="2hours">2 hours</SelectItem>
                      <SelectItem value="3hours">3 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Meeting Type *</Label>
                  <Select onValueChange={(value) => setValue('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">
                        <div className="flex items-center space-x-2">
                          <Video className="h-4 w-4" />
                          <span>Teams Meeting</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="physical">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>Physical Meeting</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="hybrid">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>Hybrid Meeting</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {watchType && watchType !== 'online' && (
                  <div className="md:col-span-2">
                    <Label htmlFor="location">
                      {watchType === 'hybrid' ? 'Physical Location *' : 'Meeting Location *'}
                    </Label>
                    <Input 
                      id="location" 
                      {...register('location', { required: watchType !== 'online' })}
                      placeholder={watchType === 'hybrid' ? 'Conference room address' : 'Conference room or venue'}
                    />
                  </div>
                )}
                {(watchType === 'online' || watchType === 'hybrid') && (
                  <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Video className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Teams Meeting</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {isConnected 
                        ? 'A Microsoft Teams meeting will be created automatically with a shareable join link and calendar event.'
                        : 'Connect your Microsoft account in Settings to automatically create Teams meetings with calendar integration.'
                      }
                    </p>
                    {/* Show Teams link if available after creation/edit */}
                    {meetingToEdit && (meetingToEdit.teams_join_url || meetingToEdit.teams_joinUrl) && (
                      <div className="mt-2">
                        <a
                          href={meetingToEdit.teams_join_url || meetingToEdit.teams_joinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline font-medium"
                        >
                          Join Teams Meeting
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section: Attendees */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="text-lg font-bold mb-4">Attendees</h3>
              <AttendeeSelector
                selectedAttendees={selectedAttendees}
                onAttendeesChange={setSelectedAttendees}
                placeholder="Select meeting attendees..."
              />
              <p className="text-xs text-gray-400 mt-2">
                Selected attendees will receive calendar invitations and meeting notifications.
              </p>
            </div>

            {/* Section: Attachments */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="text-lg font-bold mb-4">Attachments</h3>
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
                    disabled={isSubmitting || uploadingFiles}
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
                          disabled={isSubmitting || uploadingFiles}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section: RSVP */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="text-lg font-bold mb-4">RSVP</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rsvp"
                  checked={rsvpEnabled}
                  onChange={(e) => setRsvpEnabled(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="rsvp">Enable RSVP (attendees can respond Yes/No/Maybe)</Label>
              </div>
            </div>

            {/* Section: Actions (not sticky) */}
            <div className="flex justify-end gap-2 border-t pt-4 mt-8 bg-white">
              <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isSubmitting || uploadingFiles}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || uploadingFiles} className="w-full">
                {isSubmitting ? 'Creating...' : (meetingToEdit ? 'Save Changes' : 'Create Teams Meeting')}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
