import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, Clock, Users, Video, FileText, Plus, Trash2, UserCheck, ExternalLink, Copy, CheckSquare, AlertTriangle, RefreshCw, ChevronLeft, X, Pencil } from 'lucide-react';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { ViewAgendaDialog } from './ViewAgendaDialog';
import { ManageAttendeesDialog } from './ManageAttendeesDialog';
import { CheckInDialog } from './CheckInDialog';
import { CalendarView } from './CalendarView';
import { RSVPResponseDialog } from './RSVPResponseDialog';
import { MeetingDeletionProgress } from './MeetingDeletionProgress';
import { MeetingTranscriptDialog } from './MeetingTranscriptDialog';
import { useMeetings } from '@/hooks/useMeetings';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAutoTranscript } from '@/hooks/useAutoTranscript';
import { useOutlookSync } from '@/hooks/useOutlookSync';
import { format, parseISO, compareAsc, compareDesc } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { RSVPSelector } from './RSVPSelector';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input, SearchInput } from '@/components/ui/input';
import { useProfile } from '@/hooks/useProfile';
import { useLocation } from 'react-router-dom';

export const MeetingsModule: React.FC = () => {
  const location = useLocation();
  const highlightMeetingId = location.state?.highlightMeetingId;
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showAgendaDialog, setShowAgendaDialog] = useState(false);
  const [showAttendeesDialog, setShowAttendeesDialog] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [showDeletionProgress, setShowDeletionProgress] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [editMeeting, setEditMeeting] = useState<any>(null);
  
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
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Add Outlook sync functionality
  const { syncing, lastSyncTime, syncOutlookMeetings } = useOutlookSync();
  
  // Add auto-transcript functionality
  useAutoTranscript();

  const { userRole, isSuperAdmin, isAdmin, canDeleteMeetings, canScheduleMeetings } = useUserRole();

  const { profile } = useProfile();

  // Auto-refresh meetings when sync completes - but prevent infinite loops
  useEffect(() => {
    if (!syncing && lastSyncTime) {
      console.log('Refreshing meetings after sync...');
      // Add a small delay to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        fetchMeetings();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [syncing, lastSyncTime]);

  // Filter and sort meetings properly by date and time
  const now = new Date();
  
  // Remove duplicates by outlook_event_id and teams_meeting_id to prevent duplicate display
  const uniqueMeetings = meetings.reduce((acc, meeting) => {
    const isDuplicate = acc.some(existing => 
      (meeting.outlook_event_id && existing.outlook_event_id === meeting.outlook_event_id) ||
      (meeting.teams_meeting_id && existing.teams_meeting_id === meeting.teams_meeting_id) ||
      existing.id === meeting.id
    );
    
    if (!isDuplicate) {
      acc.push(meeting);
    }
    
    return acc;
  }, [] as any[]);
  
  // Upcoming meetings: start time is in the future, sorted by nearest first
  const upcomingMeetings = uniqueMeetings
    .filter(meeting => {
      const startTime = safeDate(meeting.start_time);
      return startTime >= now;
    })
    .sort((a, b) => compareAsc(safeDate(a.start_time), safeDate(b.start_time)));
  
  // Past meetings: start time is in the past, sorted by most recent first
  const pastMeetings = uniqueMeetings
    .filter(meeting => {
      const startTime = safeDate(meeting.start_time);
      return startTime < now;
    })
    .sort((a, b) => compareDesc(safeDate(a.start_time), safeDate(b.start_time)));

  // Unified, filtered meeting list
  const filteredMeetings = useMemo(() => {
    let list = uniqueMeetings;
    if (statusFilter === 'upcoming') {
      list = list.filter(meeting => safeDate(meeting.start_time) >= now);
      if (searchTerm.trim()) {
        list = list.filter(meeting => meeting.title?.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      // Upcoming: soonest first
      return list.sort((a, b) => compareAsc(safeDate(a.start_time), safeDate(b.start_time)));
    } else if (statusFilter === 'past') {
      list = list.filter(meeting => safeDate(meeting.start_time) < now);
      if (searchTerm.trim()) {
        list = list.filter(meeting => meeting.title?.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      // Past: most recent first
      return list.sort((a, b) => compareDesc(safeDate(a.start_time), safeDate(b.start_time)));
    } else {
      // All: most recent first
      if (searchTerm.trim()) {
        list = list.filter(meeting => meeting.title?.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return list.sort((a, b) => compareDesc(safeDate(a.start_time), safeDate(b.start_time)));
    }
  }, [uniqueMeetings, statusFilter, searchTerm, now]);

  // Expanded card state
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const toggleExpand = (id: string) => setExpandedMeetingId(expandedMeetingId === id ? null : id);

  const handleViewAgenda = (meeting: any) => {
    setSelectedMeeting(meeting);
    setShowAgendaDialog(true);
  };

  const handleViewTranscript = (meeting: any) => {
    setSelectedMeeting(meeting);
    setShowTranscriptDialog(true);
  };

  const handleCheckIn = (meeting: any) => {
    setSelectedMeeting(meeting);
    setShowCheckInDialog(true);
  };

  const handleViewRSVP = (meeting: any) => {
    console.log('RSVP button clicked for meeting:', meeting);
    setSelectedMeeting(meeting);
    setShowRSVPDialog(true);
  };

  const handleDeleteMeeting = async (meetingId: string, meetingTitle: string) => {
    // Check if user role allows deletion (admin check)
    if (!canDeleteMeetings) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete meetings",
        variant: "destructive"
      });
      return;
    }

    // Check if meeting is currently being deleted
    if (isDeletingMeeting(meetingId)) {
      toast({
        title: "Already Deleting",
        description: "This meeting is already being deleted",
        variant: "destructive"
      });
      return;
    }
    
    // Show progress dialog
    setShowDeletionProgress(meetingId);
    await deleteMeeting(meetingId, isSuperAdmin, isAdmin);
  };

  const handleCopyJoinUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Teams meeting link copied to clipboard"
    });
  };

  const handleJoinNow = (meeting: any) => {
    if (meeting.teams_join_url) {
      // Allow super admins and admins to join anytime
      if (userRole === 'super_admin' || userRole === 'admin') {
        window.open(meeting.teams_join_url, '_blank', 'noopener,noreferrer');
        return;
      }

      // For regular users, check if it's too early
      const now = new Date();
      const start = safeDate(meeting.start_time);
      const hourBeforeStart = new Date(start.getTime() - 60 * 60 * 1000);
      
      if (now < hourBeforeStart) {
        toast({
          title: "Too Early",
          description: "You can join the meeting up to 1 hour before the start time",
          variant: "destructive"
        });
        return;
      }

      window.open(meeting.teams_join_url, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "No Join Link",
        description: "This meeting doesn't have a Teams join link",
        variant: "destructive"
      });
    }
  };

  const handleScheduleMeetingClose = (meetingCreated: boolean) => {
    setShowScheduleDialog(false);
    setPreselectedDate(undefined);
    
    // Auto-refresh if a meeting was created, but with debounce
    if (meetingCreated) {
      setTimeout(() => {
        fetchMeetings();
      }, 500);
    }
  };

  const handleCalendarDateClick = (date: Date) => {
    setPreselectedDate(date);
    setShowScheduleDialog(true);
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

  const isLiveMeeting = (meeting: any) => {
    const now = new Date();
    const start = safeDate(meeting.start_time);
    const end = safeDate(meeting.end_time);
    return now >= start && now <= end;
  };

  const canCheckIn = (meeting: any) => {
    const now = new Date();
    const start = safeDate(meeting.start_time);
    const end = safeDate(meeting.end_time);
    const hourBeforeStart = new Date(start.getTime() - 60 * 60 * 1000);
    return now >= hourBeforeStart && now <= end;
  };

  const handleRSVPUpdate = () => {
    // Refresh meetings data when RSVP is updated, but with debounce
    setTimeout(() => {
      fetchMeetings();
    }, 500);
  };

  // Manual sync handler with debounce to prevent multiple calls
  const handleManualSync = async () => {
    if (syncing) return; // Prevent multiple simultaneous sync calls
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

  // 5. Collapse expanded card if deleted
  useEffect(() => {
    if (expandedMeetingId && isDeletingMeeting(expandedMeetingId)) {
      setExpandedMeetingId(null);
    }
  }, [expandedMeetingId, isDeletingMeeting]);

  // 1. Get current user id for permission checks
  const userId = user?.id;

  // Defensive helpers
  const safe = (val: any, fallback: string = '') => (val === undefined || val === null ? fallback : val);
  const safeDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return new Date(0); // fallback to epoch
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  try {
    // UI
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }
    if (!Array.isArray(meetings) || meetings.length === 0) {
      return <div className="text-center text-muted-foreground py-12">No meetings found.</div>;
    }

    React.useEffect(() => {
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

    return (
      <div className="max-w-5xl mx-auto px-0 space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex gap-2">
            <Button variant={statusFilter === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('all')}>All</Button>
            <Button variant={statusFilter === 'past' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('past')}>Past</Button>
            <Button variant={statusFilter === 'upcoming' ? 'default' : 'ghost'} size="sm" onClick={() => setStatusFilter('upcoming')}>Upcoming</Button>
          </div>
          <div className="relative w-full max-w-xs flex gap-2 items-center">
            <SearchInput
              type="text"
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full"
            />
            {/* Manual Sync Button: Only show if Microsoft account is connected */}
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
          {filteredMeetings.length === 0 && (
            <div className="text-center text-muted-foreground py-12">No meetings found.</div>
          )}
          {filteredMeetings.map(meeting => {
            const timeInfo = formatMeetingTime(safe(meeting.start_time, ''), safe(meeting.end_time, ''));
            const isPast = meeting.start_time ? safeDate(meeting.start_time) < now : false;
            const isLive = !isPast && isLiveMeeting(meeting);
            const canDoCheckIn = !isPast && canCheckIn(meeting);
            const attendeeCount = typeof meeting.attendee_count === 'number' ? meeting.attendee_count : (Array.isArray(meeting.attendees) ? meeting.attendees.length : 0);
            const isDeleting = isDeletingMeeting(meeting.id);
            const expanded = expandedMeetingId === meeting.id;
            // 1. Only allow delete if user is creator or super_admin/admin
            const canDeleteThisMeeting = canDeleteMeetings && (userRole === 'super_admin' || userRole === 'admin' || meeting.created_by === userId);
            return (
              <Card key={meeting.id} className={`w-full hover:shadow-md transition-shadow relative ${isDeleting ? 'opacity-50 pointer-events-none' : ''} ${highlighted === meeting.id ? 'blink-highlight' : ''}`} id={`meeting-card-${meeting.id}`}> 
                {/* 6. Show overlay spinner if deleting */}
                {isDeleting && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
                <CardHeader className="pb-4 flex flex-row items-center gap-4 cursor-pointer" onClick={() => toggleExpand(meeting.id)}>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex flex-wrap items-center gap-2">
                      <span className="break-words leading-tight">{safe(meeting.title, 'Untitled')}</span>
                      {meeting.meeting_id && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-xs border border-blue-300">{meeting.meeting_id}</span>
                      )}
                      {isLive && <Badge className="bg-red-500 text-white animate-pulse shrink-0">LIVE</Badge>}
                      {meeting.meeting_type && (
                        <Badge className="bg-gray-200 text-gray-800 shrink-0 capitalize">{meeting.meeting_type}</Badge>
                      )}
                      {meeting.teams_join_url && <Badge className="bg-blue-500 text-white shrink-0">Teams</Badge>}
                      {isPast && <Badge className="bg-gray-100 text-gray-800" variant="secondary">Completed</Badge>}
                    </CardTitle>
                    {meeting.created_at && (
                      <div className="text-xs text-gray-500 mt-1">Created: {format(new Date(meeting.created_at), 'MMM dd, yyyy, h:mm a')}</div>
                    )}
                    <div className="flex items-center space-x-2 text-gray-600 mt-1">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">{timeInfo.date} at {timeInfo.time}</span>
                      <span className="text-xs text-gray-500">({timeInfo.duration})</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600 mt-1">
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{attendeeCount} attendees</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Created by: {meeting.created_by_name || meeting.created_by}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); toggleExpand(meeting.id); }}>
                    {expanded ? <ChevronLeft className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  </Button>
                </CardHeader>
                {expanded && (
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {/* 3. Only show join button if teams_join_url exists */}
                      {/* Show Teams join button for both online and hybrid meetings if link is present */}
                      {meeting.teams_join_url && (
                        <Button variant="default" size="sm" asChild disabled={isDeleting} className="bg-blue-600 hover:bg-blue-700 text-white min-h-[40px]">
                          <a href={meeting.teams_join_url} target="_blank" rel="noopener noreferrer">
                            <Video className="h-4 w-4 mr-2" /> Join Teams Meeting
                          </a>
                        </Button>
                      )}
                      {canDoCheckIn && (
                        <Button variant="outline" size="sm" onClick={() => handleCheckIn(meeting)} disabled={isDeleting} className="bg-green-50 hover:bg-green-100 text-green-700 min-h-[40px]">
                          <UserCheck className="h-4 w-4 mr-2" /> Check In
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleViewAgenda(meeting)} className="min-h-[40px]">
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
                      {/* RSVP button only if enabled */}
                      {meeting.rsvp_enabled && (
                        <Button variant="outline" size="sm" onClick={() => handleViewRSVP(meeting)} className="min-h-[40px]">
                          <CheckSquare className="h-4 w-4 mr-2" /> RSVP
                        </Button>
                      )}
                      {/* 1. Only show delete if allowed */}
                      {canDeleteThisMeeting && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isDeleting} className="min-h-[40px]">
                              {isDeleting ? (
                                <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Deleting...</span>
                              ) : (
                                <><Trash2 className="h-4 w-4 mr-2" /> Delete</>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Meeting Everywhere?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the meeting from the portal, Outlook, Teams, and all related data (attendees, attachments, transcripts). Are you sure you want to proceed?
                                <br />
                                <span className="text-xs text-red-600 font-semibold">If your Microsoft connection is missing or expired, the meeting may not be deleted from Outlook/Teams. You may be prompted to reconnect.</span>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteMeeting(meeting.id, meeting.title)} disabled={isDeleting}>
                                Yes, Delete Everywhere
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {/* Edit button for admins/superadmins */}
                      {(userRole === 'admin' || userRole === 'super_admin') && (
                        <Button variant="outline" size="sm" onClick={() => setEditMeeting(meeting)} className="min-h-[40px]">
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2" style={{ whiteSpace: 'pre-line' }}>{safe(meeting.description, 'No description provided')}</div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Floating Action Button for Scheduling */}
        {canScheduleMeetings && (
          <Button onClick={() => setShowScheduleDialog(true)} className="fixed bottom-8 right-8 z-50 rounded-full shadow-lg bg-[#8E1616] hover:bg-[#7A1414] text-white w-16 h-16 flex items-center justify-center text-3xl">
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
              // Add a small delay to ensure database update is complete
              setTimeout(() => {
                fetchMeetings();
              }, 1000);
            }
          }}
          meetingToEdit={editMeeting}
        />
      </div>
    );
  } catch (err) {
    console.error('MeetingsModule render error:', err);
    return <div className="text-center text-red-600 py-12">An error occurred while loading meetings. Please try again later.</div>;
  }
};

export default MeetingsModule;
