import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Users, Video, FileText, Plus, Trash2, UserCheck, CheckSquare, RefreshCw, ChevronLeft, Pencil } from 'lucide-react';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { ViewAgendaDialog } from './ViewAgendaDialog';
import { ManageAttendeesDialog } from './ManageAttendeesDialog';
import { CheckInDialog } from './CheckInDialog';
import { RSVPResponseDialog } from './RSVPResponseDialog';
import { MeetingTranscriptDialog } from './MeetingTranscriptDialog';
import { useMeetings } from '@/hooks/useMeetings';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useOutlookSync } from '@/hooks/useOutlookSync';
import { format, compareAsc, compareDesc } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsMobile } from '@/hooks/use-mobile';
import { SearchInput } from '@/components/ui/input';
import { useProfile } from '@/hooks/useProfile';
import { useLocation } from 'react-router-dom';

// Define meeting type interface
interface Meeting {
  id: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  created_at?: string;
  created_by?: string;
  created_by_name?: string;
  meeting_id?: string;
  meeting_type?: string;
  teams_join_url?: string;
  teams_meeting_id?: string;
  outlook_event_id?: string;
  attendee_count?: number;
  attendees?: any[];
  rsvp_enabled?: boolean;
}

export const MeetingsModule: React.FC = () => {
  // State management
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showAgendaDialog, setShowAgendaDialog] = useState(false);
  const [showAttendeesDialog, setShowAttendeesDialog] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);

  // Hooks - initialize in proper order
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { userRole, isSuperAdmin, isAdmin, canDeleteMeetings, canScheduleMeetings } = useUserRole();
  const { profile } = useProfile();
  const { syncing, lastSyncTime, syncOutlookMeetings } = useOutlookSync();
  
  // Initialize meetings hook last to ensure all dependencies are ready
  const { 
    meetings, 
    loading, 
    deletingMeetings, 
    createMeeting, 
    deleteMeeting, 
    fetchMeetings,
    getDeletionProgress,
    isDeletingMeeting
  } = useMeetings();

  // Get highlight meeting ID from location state
  const highlightMeetingId = location.state?.highlightMeetingId;

  // Helper functions
  const safe = (val: string | undefined | null, fallback: string = '') => {
    return (val === undefined || val === null ? fallback : val);
  };

  const safeDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return new Date(0);
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  // Effects
  useEffect(() => {
    if (highlightMeetingId) {
      setHighlighted(highlightMeetingId);
      const el = document.getElementById(`meeting-card-${highlightMeetingId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const timeout = setTimeout(() => setHighlighted(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [highlightMeetingId]);

  useEffect(() => {
    if (!syncing && lastSyncTime) {
      const timeoutId = setTimeout(() => {
        fetchMeetings();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [syncing, lastSyncTime, fetchMeetings]);

  useEffect(() => {
    if (expandedMeetingId && isDeletingMeeting(expandedMeetingId)) {
      setExpandedMeetingId(null);
    }
  }, [expandedMeetingId, isDeletingMeeting]);

  // Data processing
  const now = new Date();
  
  // Safe meetings processing with null checks
  const processedMeetings = useMemo(() => {
    if (!meetings || !Array.isArray(meetings)) {
      return [];
    }

    // Remove duplicates and filter out invalid meetings
    const validMeetings = meetings.filter((meeting: Meeting) => meeting && meeting.id);
    
    const uniqueMeetings = validMeetings.reduce((acc: Meeting[], meeting: Meeting) => {
      if (!meeting) return acc;
      
      const isDuplicate = acc.some((existing: Meeting) => 
        existing && meeting.outlook_event_id && existing.outlook_event_id === meeting.outlook_event_id ||
        existing && meeting.teams_meeting_id && existing.teams_meeting_id === meeting.teams_meeting_id ||
        existing && existing.id === meeting.id
      );
      
      if (!isDuplicate) {
        acc.push(meeting);
      }
      
      return acc;
    }, [] as Meeting[]);

    return uniqueMeetings;
  }, [meetings]);

  // Filtered meetings based on status and search
  const filteredMeetings = useMemo(() => {
    if (!processedMeetings || processedMeetings.length === 0) {
      return [];
    }

    let list = processedMeetings;

    // Apply status filter
    if (statusFilter === 'upcoming') {
      list = list.filter((meeting: Meeting) => {
        if (!meeting || !meeting.start_time) return false;
        return safeDate(meeting.start_time) >= now;
      });
    } else if (statusFilter === 'past') {
      list = list.filter((meeting: Meeting) => {
        if (!meeting || !meeting.start_time) return false;
        return safeDate(meeting.start_time) < now;
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      list = list.filter((meeting: Meeting) => {
        if (!meeting || !meeting.title) return false;
        return meeting.title.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Sort meetings
    if (statusFilter === 'upcoming') {
      return list.sort((a: Meeting, b: Meeting) => {
        if (!a || !b || !a.start_time || !b.start_time) return 0;
        return compareAsc(safeDate(a.start_time), safeDate(b.start_time));
      });
    } else {
      return list.sort((a: Meeting, b: Meeting) => {
        if (!a || !b || !a.start_time || !b.start_time) return 0;
        return compareDesc(safeDate(a.start_time), safeDate(b.start_time));
      });
    }
  }, [processedMeetings, statusFilter, searchTerm, now]);

  // Event handlers
  const toggleExpand = (id: string) => {
    setExpandedMeetingId(expandedMeetingId === id ? null : id);
  };

  const handleViewAgenda = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowAgendaDialog(true);
  };

  const handleViewTranscript = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowTranscriptDialog(true);
  };

  const handleCheckIn = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowCheckInDialog(true);
  };

  const handleViewRSVP = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowRSVPDialog(true);
  };

  const handleDeleteMeeting = async (meetingId: string, meetingTitle: string) => {
    if (!canDeleteMeetings) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete meetings",
        variant: "destructive"
      });
      return;
    }

    if (isDeletingMeeting(meetingId)) {
      toast({
        title: "Already Deleting",
        description: "This meeting is already being deleted",
        variant: "destructive"
      });
      return;
    }

    await deleteMeeting(meetingId, isSuperAdmin, isAdmin);
  };

  const handleScheduleMeetingClose = (meetingCreated: boolean) => {
    setShowScheduleDialog(false);
    setPreselectedDate(undefined);
    
    if (meetingCreated) {
      setTimeout(() => {
        fetchMeetings();
      }, 500);
    }
  };

  const handleManualSync = async () => {
    if (syncing) return;
    if (!profile?.microsoft_access_token) {
      toast({
        title: "Microsoft Account Required",
        description: "Please connect your Microsoft account in Settings to sync meetings.",
        variant: "destructive"
      });
      return;
    }
    await syncOutlookMeetings();
  };

  const formatMeetingTime = (startTime: string, endTime: string) => {
    const start = safeDate(startTime);
    const end = safeDate(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    let durationText = '';
    if (hours > 0) durationText += `${hours}h `;
    if (minutes > 0) durationText += `${minutes}m`;
    
    return {
      date: format(start, 'MMM dd, yyyy'),
      time: format(start, 'h:mm a'),
      duration: durationText.trim() || '0m'
    };
  };

  const isLiveMeeting = (meeting: Meeting) => {
    if (!meeting.start_time || !meeting.end_time) return false;
    const now = new Date();
    const start = safeDate(meeting.start_time);
    const end = safeDate(meeting.end_time);
    return now >= start && now <= end;
  };

  const canCheckIn = (meeting: Meeting) => {
    if (!meeting.start_time || !meeting.end_time) return false;
    const now = new Date();
    const start = safeDate(meeting.start_time);
    const end = safeDate(meeting.end_time);
    const hourBeforeStart = new Date(start.getTime() - 60 * 60 * 1000);
    return now >= hourBeforeStart && now <= end;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No meetings state
  if (!processedMeetings || processedMeetings.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center text-muted-foreground">
          <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
          <p className="text-sm">Create your first meeting or sync with Outlook to get started.</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="max-w-5xl mx-auto px-4 space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex gap-2">
          <Button 
            variant={statusFilter === 'all' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={statusFilter === 'past' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setStatusFilter('past')}
          >
            Past
          </Button>
          <Button 
            variant={statusFilter === 'upcoming' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setStatusFilter('upcoming')}
          >
            Upcoming
          </Button>
        </div>
        
        <div className="relative w-full max-w-xs flex gap-2 items-center">
          <SearchInput
            type="text"
            placeholder="Search meetings..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full"
          />
          
          {profile?.microsoft_access_token && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={syncing}
              className="min-w-[120px] flex items-center gap-2"
            >
              <RefreshCw className={syncing ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
              {syncing ? 'Syncing...' : 'Sync Outlook'}
            </Button>
          )}
        </div>
      </div>

      {/* Meeting List */}
      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No meetings found matching your criteria.
          </div>
        ) : (
          filteredMeetings.map((meeting: Meeting) => {
            if (!meeting) return null;
            
            const timeInfo = formatMeetingTime(
              safe(meeting.start_time, ''), 
              safe(meeting.end_time, '')
            );
            const isPast = meeting.start_time ? safeDate(meeting.start_time) < now : false;
            const isLive = !isPast && isLiveMeeting(meeting);
            const canDoCheckIn = !isPast && canCheckIn(meeting);
            const attendeeCount = typeof meeting.attendee_count === 'number' 
              ? meeting.attendee_count 
              : (Array.isArray(meeting.attendees) ? meeting.attendees.length : 0);
            const isDeleting = isDeletingMeeting(meeting.id);
            const expanded = expandedMeetingId === meeting.id;
            const canDeleteThisMeeting = canDeleteMeetings && (
              userRole === 'super_admin' || 
              userRole === 'admin' || 
              meeting.created_by === user?.id
            );

            return (
              <Card 
                key={meeting.id} 
                className={`w-full hover:shadow-md transition-shadow relative ${
                  isDeleting ? 'opacity-50 pointer-events-none' : ''
                } ${highlighted === meeting.id ? 'ring-2 ring-primary' : ''}`} 
                id={`meeting-card-${meeting.id}`}
              >
                {isDeleting && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
                
                <CardHeader 
                  className="pb-4 flex flex-row items-center gap-4 cursor-pointer" 
                  onClick={() => toggleExpand(meeting.id)}
                >
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex flex-wrap items-center gap-2">
                      <span className="break-words leading-tight">
                        {safe(meeting.title, 'Untitled')}
                      </span>
                      {meeting.meeting_id && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-xs border border-blue-300">
                          {meeting.meeting_id}
                        </span>
                      )}
                      {isLive && (
                        <Badge className="bg-red-500 text-white animate-pulse shrink-0">
                          LIVE
                        </Badge>
                      )}
                      {meeting.meeting_type && (
                        <Badge className="bg-gray-200 text-gray-800 shrink-0 capitalize">
                          {meeting.meeting_type}
                        </Badge>
                      )}
                      {meeting.teams_join_url && (
                        <Badge className="bg-blue-500 text-white shrink-0">
                          Teams
                        </Badge>
                      )}
                      {isPast && (
                        <Badge className="bg-gray-100 text-gray-800" variant="secondary">
                          Completed
                        </Badge>
                      )}
                    </CardTitle>
                    
                    {meeting.created_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        Created: {format(new Date(meeting.created_at), 'MMM dd, yyyy, h:mm a')}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 text-gray-600 mt-1">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">
                        {timeInfo.date} at {timeInfo.time}
                      </span>
                      <span className="text-xs text-gray-500">({timeInfo.duration})</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-gray-600 mt-1">
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{attendeeCount} attendees</span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">
                      Created by: {meeting.created_by_name || meeting.created_by}
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={e => { 
                      e.stopPropagation(); 
                      toggleExpand(meeting.id); 
                    }}
                  >
                    {expanded ? (
                      <ChevronLeft className="h-5 w-5" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                  </Button>
                </CardHeader>
                
                {expanded && (
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {meeting.teams_join_url && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          asChild 
                          disabled={isDeleting} 
                          className="bg-blue-600 hover:bg-blue-700 text-white min-h-[40px]"
                        >
                          <a href={meeting.teams_join_url} target="_blank" rel="noopener noreferrer">
                            <Video className="h-4 w-4 mr-2" /> Join Teams Meeting
                          </a>
                        </Button>
                      )}
                      
                      {canDoCheckIn && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCheckIn(meeting)} 
                          disabled={isDeleting} 
                          className="bg-green-50 hover:bg-green-100 text-green-700 min-h-[40px]"
                        >
                          <UserCheck className="h-4 w-4 mr-2" /> Check In
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewAgenda(meeting)} 
                        className="min-h-[40px]"
                      >
                        <FileText className="h-4 w-4 mr-2" /> Agenda
                      </Button>
                      
                      {meeting.teams_meeting_id ? (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="min-h-[40px]"
                        >
                          <a
                            href={`https://teams.microsoft.com/l/meetingTranscript/${meeting.teams_meeting_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="h-4 w-4 mr-2" /> Transcript
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTranscript(meeting)} 
                          className="min-h-[40px]"
                        >
                          <FileText className="h-4 w-4 mr-2" /> Transcript
                        </Button>
                      )}
                      
                      {meeting.rsvp_enabled && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewRSVP(meeting)} 
                          className="min-h-[40px]"
                        >
                          <CheckSquare className="h-4 w-4 mr-2" /> RSVP
                        </Button>
                      )}
                      
                      {canDeleteThisMeeting && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              disabled={isDeleting} 
                              className="min-h-[40px]"
                            >
                              {isDeleting ? (
                                <span className="flex items-center">
                                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                                  Deleting...
                                </span>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Meeting Everywhere?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the meeting from the portal, Outlook, Teams, and all related data (attendees, attachments, transcripts). Are you sure you want to proceed?
                                <br />
                                <span className="text-xs text-red-600 font-semibold">
                                  If your Microsoft connection is missing or expired, the meeting may not be deleted from Outlook/Teams. You may be prompted to reconnect.
                                </span>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteMeeting(meeting.id, meeting.title)} 
                                disabled={isDeleting}
                              >
                                Yes, Delete Everywhere
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      
                      {(userRole === 'admin' || userRole === 'super_admin') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setEditMeeting(meeting)} 
                          className="min-h-[40px]"
                        >
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-2" style={{ whiteSpace: 'pre-line' }}>
                      {safe(meeting.description, 'No description provided')}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Floating Action Button for Scheduling */}
      {canScheduleMeetings && (
        <Button 
          onClick={() => setShowScheduleDialog(true)} 
          className="fixed bottom-8 right-8 z-50 rounded-full shadow-lg bg-[#8E1616] hover:bg-[#7A1414] text-white w-16 h-16 flex items-center justify-center text-3xl"
        >
          <Plus className="h-8 w-8" />
        </Button>
      )}

      {/* Dialogs */}
      {canScheduleMeetings && (
        <ScheduleMeetingDialog 
          open={showScheduleDialog} 
          onOpenChange={handleScheduleMeetingClose}
          preselectedDate={preselectedDate}
        />
      )}
      
      <ViewAgendaDialog 
        open={showAgendaDialog} 
        onOpenChange={setShowAgendaDialog}
        meeting={selectedMeeting}
      />
      
      <ManageAttendeesDialog 
        open={showAttendeesDialog} 
        onOpenChange={setShowAttendeesDialog}
        meeting={selectedMeeting}
      />
      
      <CheckInDialog
        open={showCheckInDialog}
        onOpenChange={setShowCheckInDialog}
        meeting={selectedMeeting}
      />
      
      <RSVPResponseDialog
        open={showRSVPDialog}
        onOpenChange={setShowRSVPDialog}
        meeting={selectedMeeting}
      />
      
      <MeetingTranscriptDialog
        open={showTranscriptDialog}
        onOpenChange={setShowTranscriptDialog}
        meeting={selectedMeeting}
      />
      
      <ScheduleMeetingDialog
        open={!!editMeeting}
        onOpenChange={(open, edited) => {
          setEditMeeting(open ? editMeeting : null);
          if (edited) {
            setTimeout(() => {
              fetchMeetings();
            }, 1000);
          }
        }}
        meetingToEdit={editMeeting}
      />
    </div>
  );
};

export default MeetingsModule;
