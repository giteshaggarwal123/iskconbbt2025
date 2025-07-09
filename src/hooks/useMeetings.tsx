import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface ManualAttendee {
  email: string;
  rsvp: 'yes' | 'no' | 'maybe' | null;
}

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  meeting_type: string | null;
  status: string | null;
  created_by: string;
  created_at: string | null;
  teams_join_url: string | null;
  teams_meeting_id: string | null;
  outlook_event_id: string | null;
  attendees?: { user_id: string; status: string }[];
  attendee_count?: number;
  manual_attendees?: (string | ManualAttendee)[];
  created_by_name?: string;
  agendas?: string[];
}

interface DeletionProgress {
  step: string;
  completed: boolean;
  error?: string;
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

export const useMeetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingMeetings, setDeletingMeetings] = useState<Map<string, DeletionProgress[]>>(new Map());
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, meeting_attendees(user_id)')
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      // Get unique creator IDs
      const creatorIds = Array.from(new Set((data || []).map(m => m.created_by).filter(Boolean)));
      let profilesMap: Record<string, { first_name: string | null, last_name: string | null, email: string | null }> = {};
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', creatorIds);
        if (profiles) {
          for (const p of profiles) {
            profilesMap[p.id] = p;
          }
        }
      }
      // Normalize manual_attendees and attach creator name
      const processedMeetings = (data || []).map(meeting => {
        let created_by_name = meeting.created_by;
        const profile = profilesMap[meeting.created_by];
        if (profile) {
          created_by_name = profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (profile.email || meeting.created_by);
        }
        // Normalize manual_attendees
        let manual_attendees: any[] = [];
        if (Array.isArray((meeting as any).manual_attendees)) {
          manual_attendees = ((meeting as any).manual_attendees as (string | { email: string; rsvp?: string | null })[]).map((a: string | { email: string; rsvp?: string | null }) => {
            if (typeof a === 'string') return { email: a, rsvp: null };
            if (a && typeof a.email === 'string') return { email: a.email, rsvp: a.rsvp || null };
            return null;
          }).filter(Boolean);
        }
        // Calculate attendee_count
        const meeting_attendees = Array.isArray((meeting as any).meeting_attendees) ? (meeting as any).meeting_attendees : [];
        const attendee_count = meeting_attendees.length + (Array.isArray(manual_attendees) ? manual_attendees.length : 0);
        return {
          ...meeting,
          created_by_name,
          manual_attendees,
          meeting_attendees,
          attendee_count,
        };
      });
      // Filter meetings for members: only show if user is creator or attendee
      let filteredMeetings = processedMeetings;
      if (user && user.role !== 'admin' && user.role !== 'super_admin') {
        // Hide duplicate meetings: 0 attendees, created by member, same title/start_time as another meeting
        filteredMeetings = processedMeetings.filter((m, idx, arr) => {
          const isDuplicate =
            m.attendee_count === 0 &&
            m.created_by === user.id &&
            arr.some(
              other =>
                other.id !== m.id &&
                other.title === m.title &&
                other.start_time === m.start_time &&
                other.created_by !== user.id
            );
          if (isDuplicate) return false;
          return m.created_by === user.id ||
            (Array.isArray(m.meeting_attendees) && m.meeting_attendees.some(a => a.user_id === user.id));
        });
      }
      setMeetings(filteredMeetings);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load meetings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();

    const meetingsChannel = supabase
      .channel('meetings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings'
        },
        (payload) => {
          console.log('Meetings table changed:', payload);
          
          if (payload.eventType === 'DELETE') {
            console.log('Meeting deleted from database:', payload.old?.id);
            setMeetings(prev => prev.filter(m => m.id !== payload.old?.id));
            return;
          }
          
          // Automatically refresh when meetings are added/updated
          setTimeout(() => {
            fetchMeetings();
          }, 500);
        }
      )
      .subscribe();

    const attendeesChannel = supabase
      .channel('meeting-attendees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_attendees'
        },
        (payload) => {
          console.log('Meeting attendees changed:', payload);
          setTimeout(() => {
            fetchMeetings();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(meetingsChannel);
      supabase.removeChannel(attendeesChannel);
    };
  }, []);

  const createMeeting = async (meetingData: {
    title: string;
    description?: string;
    date: Date;
    time: string;
    duration: string;
    type: string;
    location: string;
    attendees?: string;
    attachments?: any[];
    rsvpEnabled?: boolean;
    agendas?: string[];
    meeting_id: string; // meeting_id is required
  }) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create meetings",
        variant: "destructive"
      });
      return;
    }

    try {
      const startDateTime = new Date(`${meetingData.date.toISOString().split('T')[0]}T${meetingData.time}`);
      const durationMinutes = durationToMinutes(meetingData.duration);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

      console.log('Creating meeting with data:', {
        title: meetingData.title,
        description: meetingData.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: meetingData.location,
        meeting_type: meetingData.type,
        created_by: user.id
      });

      let meeting;
      let teamsJoinUrl = null;
      let teamsMeetingId = null;
      let teamsCreated = false;

      if (meetingData.type === 'online' || meetingData.type === 'hybrid') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('microsoft_access_token')
          .eq('id', user.id)
          .single();

        if (profile?.microsoft_access_token) {
          const { data: teamsData, error: teamsError } = await supabase.functions.invoke('create-teams-meeting', {
            body: {
              title: meetingData.title,
              description: meetingData.description,
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
              attendees: meetingData.attendees ? meetingData.attendees.split(',').map(email => email.trim()) : []
            }
          });

          if (teamsError) {
            console.error('Teams meeting creation failed:', teamsError);
            toast({
              title: "Teams Meeting Creation Failed",
              description: "Creating regular meeting instead. Connect Microsoft account for Teams integration.",
              variant: "destructive"
            });
          } else if (teamsData?.meeting) {
            teamsJoinUrl = teamsData.meeting.teams_join_url || null;
            teamsMeetingId = teamsData.meeting.teams_meeting_id || null;
            teamsCreated = true;
            toast({
              title: "Teams Meeting Created!",
              description: `"${meetingData.title}" created with Teams link and calendar event`,
            });
          }
        } else {
          toast({
            title: "Microsoft Account Not Connected",
            description: "Connect your Microsoft account in Settings to create Teams meetings automatically",
            variant: "destructive"
          });
        }
      }

      // Separate registered users from manual emails BEFORE insert
      let registeredEmails: string[] = [];
      let manualEmails: string[] = [];
      if (meetingData.attendees) {
        const emails = meetingData.attendees.split(',').map(email => email.trim());
        for (const email of emails) {
          const { data: userProfile } = await supabase.from('profiles').select('id').eq('email', email).single();
          if (userProfile?.id) {
            registeredEmails.push(email);
          } else {
            manualEmails.push(email);
          }
        }
      }

      const manualAttendeesObjs = manualEmails.map(email => ({ email, rsvp: null }));

      // Debug: log the meeting data being inserted
      console.log('Inserting meeting:', {
        meeting_id: meetingData.meeting_id,
        ...meetingData
      });

      const { data: meetingResult, error } = await supabase
        .from('meetings')
        .insert({
          meeting_id: meetingData.meeting_id,
          title: meetingData.title,
          description: meetingData.description,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: meetingData.location,
          meeting_type: meetingData.type,
          status: 'scheduled',
          created_by: user.id,
          manual_attendees: manualAttendeesObjs,
          teams_join_url: teamsJoinUrl,
          teams_meeting_id: teamsMeetingId,
          agendas: meetingData.agendas
        })
        .select()
        .single();

      if (error) throw error;
      meeting = meetingResult;

      if (teamsCreated && meeting && teamsMeetingId) {
        await saveTranscriptReference(meeting.id, teamsMeetingId);
      }

      // Always add the creator as an attendee
      if (user && user.email && !registeredEmails.includes(user.email)) {
        registeredEmails.unshift(user.email);
      }
      // Add registered attendees to meeting_attendees table
      if (registeredEmails.length > 0) {
        await addAttendeesToMeeting(meeting.id, registeredEmails.join(', '));
      }

      // Send invitations to all attendees
      if (meetingData.attendees && meeting) {
        await sendMeetingInvitations(meeting, meetingData.attendees, meetingData.attachments);
      }

      toast({
        title: "Meeting Created",
        description: `"${meetingData.title}" has been scheduled successfully`
      });

      fetchMeetings();
      return meeting;
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create meeting",
        variant: "destructive"
      });
    }
  };

  const sendMeetingInvitations = async (meeting: any, attendeeEmails: string, attachments?: any[]) => {
    try {
      const emails = attendeeEmails.split(',').map(email => email.trim());
      
      let meetingAttachments = [];
      if (attachments && attachments.length > 0) {
        const { data: dbAttachments } = await supabase
          .from('meeting_attachments')
          .select('*')
          .eq('meeting_id', meeting.id);
        
        meetingAttachments = dbAttachments || [];
      }

      const startTime = new Date(meeting.start_time);
      const endTime = new Date(meeting.end_time);
      const meetingDate = startTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timeRange = `${startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })} - ${endTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;

      // Clean, professional email format without icons
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; font-size: 28px; margin: 0; font-weight: 600;">Meeting Invitation</h1>
          </div>
          
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 25px;">
            <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 22px; font-weight: 600;">${meeting.title}</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; vertical-align: top; width: 80px;">
                  <strong style="color: #374151;">Date:</strong>
                </td>
                <td style="padding: 8px 0; color: #1f2937;">
                  ${meetingDate}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; vertical-align: top;">
                  <strong style="color: #374151;">Time:</strong>
                </td>
                <td style="padding: 8px 0; color: #1f2937;">
                  ${timeRange}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; vertical-align: top;">
                  <strong style="color: #374151;">Location:</strong>
                </td>
                <td style="padding: 8px 0; color: #1f2937;">
                  ${meeting.location || 'To be determined'}
                </td>
              </tr>
              ${meeting.teams_join_url ? `
                <tr>
                  <td style="padding: 8px 0; vertical-align: top;">
                    <strong style="color: #374151;">Join Online:</strong>
                  </td>
                  <td style="padding: 8px 0;">
                    <a href="${meeting.teams_join_url}" style="color: #2563eb; text-decoration: none; background-color: #dbeafe; padding: 8px 12px; border-radius: 4px; display: inline-block;">Click to join Teams meeting</a>
                  </td>
                </tr>
              ` : ''}
            </table>
            
            ${meeting.description ? `
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong style="color: #374151; display: block; margin-bottom: 8px;">Description:</strong>
                <p style="margin: 0; color: #4b5563; line-height: 1.5;">${meeting.description}</p>
              </div>
            ` : ''}
          </div>
          
          ${meetingAttachments.length > 0 ? `
            <div style="margin-bottom: 25px; padding: 20px; background-color: #f9fafb; border-radius: 6px;">
              <strong style="color: #374151; display: block; margin-bottom: 12px;">Attachments:</strong>
              <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                ${meetingAttachments.map(att => `<li style="margin-bottom: 4px;">${att.name}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
            <p style="margin: 0; color: #92400e; font-weight: 500;">
              Please mark your calendar and let us know if you cannot attend.
            </p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This invitation was sent automatically by the meeting management system.
            </p>
          </div>
        </div>
      `;

      const { data, error } = await supabase.functions.invoke('send-outlook-email', {
        body: {
          subject: `Meeting Invitation: ${meeting.title}`,
          body: emailBody,
          recipients: emails,
          attachments: meetingAttachments,
          meetingId: meeting.id
        }
      });

      if (error) {
        console.error('Error sending invitations:', error);
        toast({
          title: "Invitation Email Failed",
          description: "Meeting created but email invitations could not be sent",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Invitations Sent",
          description: `Meeting invitations sent to ${emails.length} attendee(s)${meetingAttachments.length > 0 ? ` with ${meetingAttachments.length} attachment(s)` : ''}`,
        });
      }
    } catch (error) {
      console.error('Error sending meeting invitations:', error);
    }
  };

  const addAttendeesToMeeting = async (meetingId: string, attendeeEmails: string) => {
    try {
      const emails = attendeeEmails.split(',').map(email => email.trim());
      for (const email of emails) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (profile) {
          await supabase
            .from('meeting_attendees')
            .insert({
              meeting_id: meetingId,
              user_id: profile.id,
              status: 'pending'
            });
        } else {
          console.warn(`No user profile found for attendee email: ${email}`);
        }
      }
    } catch (error) {
      console.error('Error adding attendees:', error);
    }
  };

  const saveTranscriptReference = async (meetingId: string, teamsMeetingId: string) => {
    try {
      await supabase
        .from('meeting_transcripts')
        .insert({
          meeting_id: meetingId,
          teams_transcript_id: teamsMeetingId,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving transcript reference:', error);
    }
  };

  const deleteMeeting = async (meetingId: string, isSuperAdmin: boolean, isAdmin: boolean) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to delete meetings",
        variant: "destructive"
      });
      return;
    }

    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) {
      toast({
        title: "Meeting Not Found",
        description: "The meeting you're trying to delete was not found",
        variant: "destructive"
      });
      return;
    }

    if (!(meeting.created_by === user.id || isSuperAdmin || isAdmin)) {
      toast({
        title: "Permission Denied",
        description: "You can only delete meetings you created unless you are an admin or super admin",
        variant: "destructive"
      });
      return;
    }

    // Initialize deletion progress
    const progress: DeletionProgress[] = [
      { step: "Preparing deletion", completed: false },
      { step: "Removing from Microsoft Teams", completed: false },
      { step: "Deleting Outlook calendar event", completed: false },
      { step: "Cleaning up attachments", completed: false },
      { step: "Removing attendee records", completed: false },
      { step: "Deleting attendance data", completed: false },
      { step: "Removing transcripts", completed: false },
      { step: "Finalizing deletion", completed: false }
    ];

    setDeletingMeetings(prev => new Map(prev.set(meetingId, [...progress])));

    // Optimistically remove from UI
    setMeetings(prev => prev.filter(m => m.id !== meetingId));

    try {
      console.log(`Starting comprehensive deletion for meeting: ${meetingId}`);

      // Step 1: Preparation
      await updateProgress(meetingId, 0, true);

      // Step 2: Delete from Microsoft Teams
      if (meeting.teams_meeting_id || meeting.outlook_event_id) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('microsoft_access_token')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.microsoft_access_token) {
            // Delete Teams meeting
            if (meeting.teams_meeting_id) {
              console.log(`Deleting Teams meeting: ${meeting.teams_meeting_id}`);
              const teamsResponse = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meeting.teams_meeting_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${profile.microsoft_access_token}` }
              });
              
              if (!teamsResponse.ok && teamsResponse.status !== 404) {
                throw new Error(`Teams deletion failed: ${teamsResponse.statusText}`);
              }
            }
            await updateProgress(meetingId, 1, true);

            // Delete Outlook event
            if (meeting.outlook_event_id) {
              console.log(`Deleting Outlook event: ${meeting.outlook_event_id}`);
              const outlookResponse = await fetch(`https://graph.microsoft.com/v1.0/me/events/${meeting.outlook_event_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${profile.microsoft_access_token}` }
              });
              
              if (!outlookResponse.ok && outlookResponse.status !== 404) {
                throw new Error(`Outlook deletion failed: ${outlookResponse.statusText}`);
              }
            }
            await updateProgress(meetingId, 2, true);
          } else {
            // Skip Microsoft services if no token
            await updateProgress(meetingId, 1, true);
            await updateProgress(meetingId, 2, true);
          }
        } catch (error) {
          console.warn('Microsoft services deletion warning:', error);
          await updateProgress(meetingId, 1, true, `Warning: ${error}`);
          await updateProgress(meetingId, 2, true, `Warning: ${error}`);
        }
      } else {
        await updateProgress(meetingId, 1, true);
        await updateProgress(meetingId, 2, true);
      }

      // Step 3: Delete attachments
      console.log('Deleting meeting attachments...');
      const { error: attachmentsError } = await supabase
        .from('meeting_attachments')
        .delete()
        .eq('meeting_id', meetingId);
      
      if (attachmentsError) {
        console.warn('Attachments deletion warning:', attachmentsError);
        await updateProgress(meetingId, 3, true, `Warning: ${attachmentsError.message}`);
      } else {
        await updateProgress(meetingId, 3, true);
      }

      // Step 4: Delete attendee records
      console.log('Deleting meeting attendees...');
      const { error: attendeesError } = await supabase
        .from('meeting_attendees')
        .delete()
        .eq('meeting_id', meetingId);
      
      if (attendeesError) {
        console.warn('Attendees deletion warning:', attendeesError);
        await updateProgress(meetingId, 4, true, `Warning: ${attendeesError.message}`);
      } else {
        await updateProgress(meetingId, 4, true);
      }

      // Step 5: Delete attendance records
      console.log('Deleting attendance records...');
      const { error: attendanceError } = await supabase
        .from('attendance_records')
        .delete()
        .eq('meeting_id', meetingId);
      
      if (attendanceError) {
        console.warn('Attendance deletion warning:', attendanceError);
        await updateProgress(meetingId, 5, true, `Warning: ${attendanceError.message}`);
      } else {
        await updateProgress(meetingId, 5, true);
      }

      // Step 6: Delete transcripts
      console.log('Deleting meeting transcripts...');
      const { error: transcriptsError } = await supabase
        .from('meeting_transcripts')
        .delete()
        .eq('meeting_id', meetingId);
      
      if (transcriptsError) {
        console.warn('Transcripts deletion warning:', transcriptsError);
        await updateProgress(meetingId, 6, true, `Warning: ${transcriptsError.message}`);
      } else {
        await updateProgress(meetingId, 6, true);
      }

      // Step 7: Delete main meeting record
      console.log('Deleting main meeting record...');
      const { error: meetingError } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (meetingError) {
        console.error('Failed to delete meeting from database:', meetingError);
        // Restore meeting to UI if database deletion fails
        setMeetings(prev => [...prev, meeting].sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        ));
        throw new Error(`Database deletion failed: ${meetingError.message}`);
      }

      await updateProgress(meetingId, 7, true);

      console.log('Meeting successfully deleted from all platforms');
      toast({
        title: "Meeting Deleted Successfully",
        description: `"${meeting.title}" has been permanently removed from all platforms`,
      });

      // Clear deletion progress after success
      setTimeout(() => {
        setDeletingMeetings(prev => {
          const newMap = new Map(prev);
          newMap.delete(meetingId);
          return newMap;
        });
        // Add a delay before re-fetching meetings to ensure backend commit
        setTimeout(() => {
          fetchMeetings();
        }, 1000);
      }, 2000);

    } catch (error: any) {
      console.error('Error in comprehensive meeting deletion:', error);
      
      // Restore meeting to UI on error
      setMeetings(prev => [...prev, meeting].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ));
      
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete meeting completely. Please try again.",
        variant: "destructive"
      });

      // Clear deletion progress after error
      setDeletingMeetings(prev => {
        const newMap = new Map(prev);
        newMap.delete(meetingId);
        return newMap;
      });
    }
  };

  const updateProgress = async (meetingId: string, stepIndex: number, completed: boolean, error?: string) => {
    setDeletingMeetings(prev => {
      const newMap = new Map(prev);
      const currentProgress = newMap.get(meetingId) || [];
      const updatedProgress = [...currentProgress];
      
      if (updatedProgress[stepIndex]) {
        updatedProgress[stepIndex] = { 
          ...updatedProgress[stepIndex], 
          completed, 
          error 
        };
      }
      
      newMap.set(meetingId, updatedProgress);
      return newMap;
    });

    // Small delay to show progress visually
    await new Promise(resolve => setTimeout(resolve, 300));
  };

  const getDeletionProgress = (meetingId: string) => {
    return deletingMeetings.get(meetingId) || [];
  };

  const isDeletingMeeting = (meetingId: string) => {
    return deletingMeetings.has(meetingId);
  };

  const deletePastMeeting = async (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;

    const now = new Date();
    const endTime = new Date(meeting.end_time);

    if (endTime > now) {
      toast({
        title: "Cannot Delete",
        description: "Can only delete past meetings using this function",
        variant: "destructive"
      });
      return;
    }

    await deleteMeeting(meetingId, false, false);
  };

  const autoSaveTranscript = async (meetingId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('microsoft_access_token')
        .eq('id', user?.id)
        .single();

      if (!profile?.microsoft_access_token) return;

      const meeting = meetings.find(m => m.id === meetingId);
      if (!meeting?.teams_meeting_id) return;

      const { data: transcriptData, error } = await supabase.functions.invoke('fetch-teams-transcript', {
        body: {
          meetingId: meeting.teams_meeting_id,
          accessToken: profile.microsoft_access_token
        }
      });

      if (error) throw error;

      if (transcriptData?.transcript) {
        await supabase
          .from('meeting_transcripts')
          .upsert({
            meeting_id: meetingId,
            transcript_content: JSON.stringify(transcriptData.transcript),
            participants: transcriptData.attendees,
            teams_transcript_id: meeting.teams_meeting_id
          });

        const fileName = `${meeting.title}_transcript_${new Date().toISOString().split('T')[0]}.txt`;
        await supabase
          .from('documents')
          .insert({
            name: fileName,
            file_path: `transcripts/${meetingId}/${fileName}`,
            folder: 'Meeting Transcripts',
            uploaded_by: user?.id,
            mime_type: 'text/plain',
            file_size: JSON.stringify(transcriptData.transcript).length
          });

        toast({
          title: "Transcript Saved",
          description: "Meeting transcript has been automatically saved to documents"
        });
      }
    } catch (error: any) {
      console.error('Error auto-saving transcript:', error);
    }
  };

  const updateMeeting = async (meetingId: string, updates: Partial<Meeting>) => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', meetingId)
        .select()
        .single();
      if (error) throw error;
      // Optionally refresh meetings
      await fetchMeetings();
      return data;
    } catch (error) {
      console.error('Error updating meeting:', error);
      toast({ title: 'Error', description: 'Failed to update meeting', variant: 'destructive' });
      return null;
    }
  };

  return {
    meetings,
    loading,
    deletingMeetings: deletingMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    deletePastMeeting,
    fetchMeetings,
    autoSaveTranscript,
    getDeletionProgress,
    isDeletingMeeting
  };
};
