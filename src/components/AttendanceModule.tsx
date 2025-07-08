import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserCheck, Calendar, Download, Eye, CheckCircle, XCircle, Clock, BarChart3, ChevronDown, ChevronUp, Plus, CheckSquare, History } from 'lucide-react';
import { MarkAttendanceDialog } from './MarkAttendanceDialog';
import { AttendanceReportDialog } from './AttendanceReportDialog';  
import { AttendanceReportsDialog } from './AttendanceReportsDialog';
import { RSVPResponseDialog } from './RSVPResponseDialog';
import { useMeetings } from '@/hooks/useMeetings';
import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { useMembers } from '@/hooks/useMembers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { utils as XLSXUtils, writeFile as XLSXWriteFile } from 'xlsx';

// 1. Define types for Meeting, AttendanceRecord, Member
interface Member {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
}

interface AttendanceRecord {
  meeting_id: string;
  user_id: string;
  attendance_status: 'present' | 'absent' | 'late';
  attendance_type?: string;
  join_time?: string | null;
  leave_time?: string | null;
  duration_minutes?: number;
  notes?: string;
  profiles?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
}

interface Meeting {
  id: string;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  attendees?: Member[];
  meeting_attendees?: { user_id: string }[];
  manual_attendees?: { email: string }[];
}

export const AttendanceModule: React.FC = () => {
  // State
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showReportsDialog, setShowReportsDialog] = useState(false);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberHistory, setShowMemberHistory] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [dataWarning, setDataWarning] = React.useState<string | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailsMeeting, setDetailsMeeting] = useState<Meeting | null>(null);
  const [editAttendanceRecord, setEditAttendanceRecord] = useState<any>(null);
  const [showEditAttendanceDialog, setShowEditAttendanceDialog] = useState(false);
  const [showMandatoryAttendanceDialog, setShowMandatoryAttendanceDialog] = useState(false);
  const [pendingAttendanceMeetings, setPendingAttendanceMeetings] = useState<Meeting[]>([]);
  const [currentPendingMeeting, setCurrentPendingMeeting] = useState<Meeting | null>(null);

  // Hooks
  const { meetings = [], loading: meetingsLoading, fetchMeetings } = useMeetings() as { meetings: Meeting[]; loading: boolean; fetchMeetings: () => void };
  const { attendanceRecords = [], loading: attendanceLoading, markAttendance, fetchAttendance } = useAttendance() as { attendanceRecords: AttendanceRecord[]; loading: boolean; markAttendance: any; fetchAttendance: any };
  const { user } = useAuth() as { user: Member | null };
  const userRole = useUserRole();
  const { toast } = useToast();
  const { members } = useMembers() as { members: Member[] };

  // Refresh meetings if needed
  React.useEffect(() => {
    if (!meetingsLoading && meetings.length === 0) fetchMeetings();
  }, [meetingsLoading, meetings.length, fetchMeetings]);

  // Fetch all attendance records on mount
  useEffect(() => {
    if (typeof fetchAttendance === 'function') {
      fetchAttendance();
    }
  }, []);

  // Check for unmarked attendance on mount (for meetings in the past 24 hours)
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const pending = meetings.filter(meeting => {
      if (!meeting.start_time) return false;
      const start = new Date(meeting.start_time);
      // Only meetings in the past 24 hours
      if (start < yesterday || start > now) return false;
      // Check if user has attendance record
      const hasAttendance = attendanceRecords.some(r => r.meeting_id === meeting.id && r.user_id === user.id);
      return !hasAttendance;
    });
    if (pending.length > 0) {
      setPendingAttendanceMeetings(pending);
      setCurrentPendingMeeting(pending[0]);
      setShowMandatoryAttendanceDialog(true);
    }
  }, [meetings, attendanceRecords, user]);

  // Statistics
  const statistics = useMemo(() => {
    let invalidMeetingFound = false;
    if (!user || meetingsLoading || attendanceLoading) return {
        thisMonthAttended: 0,
        attendanceRate: 0,
        pendingCheckIns: 0
      };
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const thisMonthMeetings = meetings.filter(meeting => {
      if (!meeting.start_time) { invalidMeetingFound = true; return false; }
      try {
        const meetingDate = parseISO(meeting.start_time);
        return meetingDate >= monthStart && meetingDate <= monthEnd && meetingDate <= now;
      } catch { invalidMeetingFound = true; return false; }
    });
    const userAttendanceThisMonth = attendanceRecords.filter(record => 
      record.user_id === user.id && 
      record.attendance_status === 'present' &&
      thisMonthMeetings.some(meeting => meeting.id === record.meeting_id)
    );
    const totalMeetingsThisMonth = thisMonthMeetings.length;
    const attendedMeetings = userAttendanceThisMonth.length;
    const attendanceRate = totalMeetingsThisMonth > 0 ? Math.round((attendedMeetings / totalMeetingsThisMonth) * 100) : 0;
    const pendingCheckIns = meetings.filter(meeting => {
      if (!meeting.start_time || !meeting.end_time) { invalidMeetingFound = true; return false; }
      try {
        const start = parseISO(meeting.start_time);
        const end = parseISO(meeting.end_time);
        const hourBefore = new Date(start.getTime() - 60 * 60 * 1000);
        const canCheckIn = now >= hourBefore && now <= end;
        const hasAttendance = attendanceRecords.some(record => 
          record.meeting_id === meeting.id && record.user_id === user.id
        );
        return canCheckIn && !hasAttendance;
      } catch { invalidMeetingFound = true; return false; }
    }).length;
    if (invalidMeetingFound) setDataWarning('Some meetings have invalid or missing date data and were skipped.');
    else setDataWarning(null);
    return {
      thisMonthAttended: attendedMeetings,
      attendanceRate,
      pendingCheckIns
    };
  }, [meetings, attendanceRecords, user, meetingsLoading, attendanceLoading]);

  // Defensive helpers
  const safeName = (first: string | null | undefined, last: string | null | undefined, email: string) => {
    const name = `${first || ''} ${last || ''}`.trim();
    return name || email || 'Unknown';
  };
  const safeTitle = (title: string | null | undefined) => title || 'Untitled';
  const safeDate = (date: string | null | undefined) => date ? new Date(date).toLocaleDateString() : '-';

  // Member Attendance Summary
  const memberAttendance = members.map(member => {
    const attended = attendanceRecords.filter(r => r.user_id === member.id && r.attendance_status === 'present');
    const totalMeetings = meetings.length;
    const attendedCount = attended.length;
    const attendancePercent = totalMeetings > 0 ? Math.round((attendedCount / totalMeetings) * 100) : 0;
    const lastAttended = attended.length > 0 ?
      meetings.find(m => m.id === attended[attended.length - 1].meeting_id)?.start_time : null;
    return {
      id: member.id,
      name: safeName(member.first_name, member.last_name, member.email),
      email: member.email,
      totalMeetings,
      attendedCount,
      attendancePercent,
      lastAttended,
    };
  });

  const sortedMemberAttendance = [...memberAttendance].sort((a, b) => a.name.localeCompare(b.name));

  // Meeting Attendance Details
  const meetingAttendance = meetings.map(meeting => {
    // Internal attendees (registered members)
    const internalAttendees = Array.isArray(meeting.meeting_attendees)
      ? meeting.meeting_attendees.map((a: any) => ({
          user_id: a.user_id,
          email: members.find(m => m.id === a.user_id)?.email || a.user_id,
          full_name: members.find(m => m.id === a.user_id)
            ? safeName(members.find(m => m.id === a.user_id)?.first_name, members.find(m => m.id === a.user_id)?.last_name, members.find(m => m.id === a.user_id)?.email)
            : a.user_id,
          isManual: false,
        }))
      : [];
    // External attendees (manual)
    const manualAttendees = Array.isArray(meeting.manual_attendees)
      ? meeting.manual_attendees.map((a: any) => ({
          user_id: typeof a === 'string' ? a : a.email,
          email: typeof a === 'string' ? a : a.email,
          full_name: typeof a === 'string' ? a : a.email,
          isManual: true,
        }))
      : [];
    // Combine all attendees
    const allAttendees = [...internalAttendees, ...manualAttendees];
    // Map to attendance records
    const records = allAttendees.map(att => {
      const record = attendanceRecords.find(r => r.meeting_id === meeting.id && (r.user_id === att.user_id || r.user_id === att.email));
      return {
        ...att,
        attendance_status: record ? record.attendance_status : null,
        attendance_type: record ? record.attendance_type : null,
        notes: record ? record.notes : '',
      };
    });
    const present = records.filter(r => r.attendance_status === 'present');
    return {
      id: meeting.id || '',
      name: safeTitle(meeting.title ?? ''),
      date: meeting.start_time,
      totalInvited: allAttendees.length,
      totalPresent: present.length,
      attendees: records,
      meeting,
    };
  });

  // Helper to check if user is admin/super admin
  const isAdmin = userRole.isAdmin || userRole.isSuperAdmin;

  // Filter member attendance for regular members
  const filteredMemberAttendance = isAdmin
    ? sortedMemberAttendance
    : sortedMemberAttendance.filter(m => m.id === user?.id);

  // Handler for marking attendance in the popup
  const handleMandatoryAttendanceSubmit = async (status: string, notes: string) => {
    if (!currentPendingMeeting || !user) return;
    await markAttendance({
      meetingId: currentPendingMeeting.id,
      userId: user.id,
      status,
      type: 'physical', // or allow user to select
      notes,
    });
    // Remove this meeting from pending list
    const nextPending = pendingAttendanceMeetings.filter(m => m.id !== currentPendingMeeting.id);
    setPendingAttendanceMeetings(nextPending);
    if (nextPending.length > 0) {
      setCurrentPendingMeeting(nextPending[0]);
    } else {
      setShowMandatoryAttendanceDialog(false);
    }
  };

  // Loading state
  if (meetingsLoading || attendanceLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-muted-foreground">Loading attendance data...</div>
      </div>
    );
  }

  // Empty state
  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <BarChart3 className="w-10 h-10 text-muted-foreground" />
        <div className="text-lg font-semibold">No meetings found</div>
        <div className="text-muted-foreground">Meetings will appear here once scheduled.</div>
      </div>
    );
  }

  // Add a function to export member attendance as Excel
  const exportMemberAttendance = () => {
    if (!selectedMember) return;
    const rows = meetings.map(meeting => {
      const record = attendanceRecords.find(r => r.user_id === selectedMember.id && r.meeting_id === meeting.id);
      return {
        Meeting: safeTitle(meeting.title ?? ''),
        Date: safeDate(meeting.start_time),
        Status: record ? record.attendance_status : 'absent',
        Type: record ? record.attendance_type : '',
        Notes: record ? record.notes : '',
      };
    });
    const ws = XLSXUtils.json_to_sheet(rows);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'Attendance');
    XLSXWriteFile(wb, `${selectedMember.first_name || ''}_${selectedMember.last_name || ''}_attendance.xlsx`);
  };

  // Add this function to export a single meeting's attendance
  const exportMeetingAttendance = (meetingObj: any) => {
    if (!meetingObj) return;
    const rows = meetingObj.attendees.map((a: any) => ({
      Meeting: meetingObj.name,
      Date: safeDate(meetingObj.date),
      Name: a.full_name,
      Email: a.email,
      Status: a.attendance_status || 'absent',
      Type: a.attendance_type || '',
      Notes: a.notes || '',
    }));
    const ws = XLSXUtils.json_to_sheet(rows);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'Attendance');
    XLSXWriteFile(wb, `${meetingObj.name.replace(/\s+/g, '_')}_attendance.xlsx`);
  };

  // Add this function to export all meetings' attendance
  const exportAllMeetingsAttendance = () => {
    const allRows = meetingAttendance.flatMap((meetingObj: any) =>
      meetingObj.attendees.map((a: any) => ({
        Meeting: meetingObj.name,
        Date: safeDate(meetingObj.date),
        Name: a.full_name,
        Email: a.email,
        Status: a.attendance_status || 'absent',
        Type: a.attendance_type || '',
        Notes: a.notes || '',
      }))
    );
    const ws = XLSXUtils.json_to_sheet(allRows);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'All Attendance');
    XLSXWriteFile(wb, `all_meetings_attendance.xlsx`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      {dataWarning && <div className="mb-4 text-sm text-yellow-700 bg-yellow-100 rounded px-3 py-2">{dataWarning}</div>}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="members">Member Attendance</TabsTrigger>
          <TabsTrigger value="meetings">Meeting Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <div className="grid gap-4">
            {filteredMemberAttendance.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-8">
                <div className="text-muted-foreground">No members found.</div>
              </Card>
            ) : filteredMemberAttendance.map((m) => (
              <Card key={m.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
                    <CardTitle className="text-lg">{m.name}</CardTitle>
                    <CardDescription>{m.email}</CardDescription>
          </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline">{m.attendancePercent}%</Badge>
                    <Button size="icon" variant="ghost" aria-label="Expand Member" onClick={() => setExpandedMember(expandedMember === m.id ? null : m.id)}>
                      {expandedMember === m.id ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
            </CardHeader>
                {expandedMember === m.id && (
            <CardContent>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-4">
                        <div><span className="font-semibold">Total Meetings:</span> {m.totalMeetings}</div>
                        <div><span className="font-semibold">Attended:</span> {m.attendedCount}</div>
                        <div><span className="font-semibold">Last Attended:</span> {safeDate(m.lastAttended)}</div>
                      </div>
                      <Button size="sm" variant="outline" aria-label="View Attendance History" onClick={() => { const memberObj = members.find(mem => mem.id === m.id); setSelectedMember(memberObj ? memberObj : null); setShowMemberHistory(true); }}>
                        View Attendance History
                        </Button>
                    </div>
                  </CardContent>
                )}
                </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="meetings">
          <div className="flex justify-end mb-2">
            <Button size="sm" variant="outline" onClick={exportAllMeetingsAttendance}>
              Download All Meetings Attendance (Excel)
            </Button>
          </div>
          <div className="grid gap-4">
            {meetingAttendance.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-8">
                <div className="text-muted-foreground">No meetings found.</div>
              </Card>
            ) : meetingAttendance.map((m) => (
              <Card key={m.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{m.name}</CardTitle>
                    <CardDescription>Date: {safeDate(m.date)}</CardDescription>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline">{m.totalPresent}/{m.totalInvited} Present</Badge>
                    <Button size="sm" variant="outline" onClick={() => exportMeetingAttendance(m)}>
                      Download Excel
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Details" onClick={() => { setDetailsMeeting(m.meeting); setShowDetailsDialog(true); }}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Eye />
                          </TooltipTrigger>
                          <TooltipContent>Details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Button>
                  </div>
                </CardHeader>
                {expandedMeeting === m.id && (
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-4 flex-wrap">
                        {userRole.canMarkAttendanceOnly && (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedMeeting(m.meeting); setShowMarkDialog(true); }}>Mark Attendance</Button>
                        )}
                          </div>
                      <div className="mt-2">
                        <div className="font-semibold mb-1">Attendees</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr>
                                <th scope="col" className="px-2 py-1 text-left">Name</th>
                                <th scope="col" className="px-2 py-1 text-left">Email</th>
                                <th scope="col" className="px-2 py-1">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m.attendees.map((a, i) => (
                                <tr key={i}>
                                  <td className="px-2 py-1">{a.full_name}</td>
                                  <td className="px-2 py-1">{a.email}</td>
                                  <td className="px-2 py-1 text-center">
                                    {a.attendance_status === 'present' ? (
                                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full">Present</span>
                                    ) : (
                                      <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full">Absent</span>
                                    )}
                                    {isAdmin && (
                                      <Button size="sm" variant="ghost" className="ml-2 px-2 py-0.5 text-xs" onClick={() => { setEditAttendanceRecord({ ...a, meetingId: m.id, attendance_status: a.attendance_status || 'present', attendance_type: a.attendance_type || 'physical', notes: a.notes || '' }); setShowEditAttendanceDialog(true); }}>Edit</Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      </div>
                    </CardContent>
                )}
              </Card>
            ))}
          </div>
          </TabsContent>
        </Tabs>
      {/* Dialogs */}
      <MarkAttendanceDialog open={showMarkDialog} onOpenChange={setShowMarkDialog} />
      <AttendanceReportsDialog open={showReportsDialog} onOpenChange={setShowReportsDialog} />
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-xl min-w-[350px] w-full max-h-[70vh] flex flex-col overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>
              Meeting Details: {detailsMeeting ? safeTitle(detailsMeeting.title) : ''}
            </DialogTitle>
          </DialogHeader>
          {detailsMeeting && (
            <>
              <div className="mb-2 text-sm text-muted-foreground">Date: {safeDate(detailsMeeting.start_time)}</div>
              {/* Attendee List */}
              <div className="mb-4">
                <div className="font-semibold mb-1">Attendees</div>
                <div className="overflow-x-auto rounded border">
                  {/* Responsive table */}
                  {(() => {
                    // Find the meetingAttendance object for this meeting
                    const meetingAtt = meetingAttendance.find(m => m.id === detailsMeeting.id);
                    if (!meetingAtt || meetingAtt.attendees.length === 0) {
                      return <div className="text-muted-foreground p-2">No attendees found.</div>;
                    }
                    return (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr>
                            <th scope="col" className="px-2 py-1 text-left">Name</th>
                            <th scope="col" className="px-2 py-1 text-left">Email</th>
                            <th scope="col" className="px-2 py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meetingAtt.attendees.map((a, i) => (
                            <tr key={i}>
                              <td className="px-2 py-1 whitespace-nowrap">{a.full_name}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{a.email}</td>
                              <td className="px-2 py-1 text-center">
                                {a.attendance_status === 'present' ? (
                                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full">Present</span>
                                ) : a.attendance_status === 'late' ? (
                                  <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Late</span>
                                ) : a.attendance_status === 'absent' ? (
                                  <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full">Absent</span>
                                ) : (
                                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded-full">Not Marked</span>
                                )}
                                {isAdmin && (
                                  <Button size="sm" variant="ghost" className="ml-2 px-2 py-0.5 text-xs" onClick={() => { setEditAttendanceRecord({ ...a, meetingId: detailsMeeting.id, attendance_status: a.attendance_status || 'present', attendance_type: a.attendance_type || 'physical', notes: a.notes || '' }); setShowEditAttendanceDialog(true); }}>Edit</Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
          <div className="flex justify-end mt-4">
            <DialogClose asChild>
              <Button size="sm" variant="ghost">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      {/* Member Attendance History Modal */}
      <Dialog open={showMemberHistory} onOpenChange={setShowMemberHistory}>
        <DialogContent className="max-w-xl min-w-[350px] w-full max-h-[70vh] flex flex-col overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>
              Attendance History for {selectedMember ? safeName(selectedMember.first_name, selectedMember.last_name, selectedMember.email) : ''}
            </DialogTitle>
            {selectedMember && (
              <Button size="sm" variant="outline" className="ml-2" onClick={exportMemberAttendance}>Download Excel</Button>
            )}
          </DialogHeader>
          <div className="overflow-x-auto max-h-[50vh] px-2 rounded border">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Meeting</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedMember && meetings.map((meeting, i) => {
                  const record = attendanceRecords.find(r => r.user_id === selectedMember.id && r.meeting_id === meeting.id);
                  return (
                    <tr key={i}>
                      <td className="px-4 py-2 whitespace-nowrap">{safeTitle(meeting.title)}</td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">{safeDate(meeting.start_time)}</td>
                      <td className="px-4 py-2 text-center">
                        {record && record.attendance_status === 'present' ? (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full">Present</span>
                        ) : record && record.attendance_status === 'late' ? (
                          <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Late</span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full">Absent</span>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-2 px-2 py-0.5 text-xs"
                            onClick={() => {
                              setEditAttendanceRecord(
                                record
                                  ? { ...record, meetingId: meeting.id }
                                  : {
                                      meetingId: meeting.id,
                                      user_id: selectedMember.id,
                                      attendance_status: 'absent',
                                      attendance_type: 'physical',
                                      notes: '',
                                    }
                              );
                              setShowEditAttendanceDialog(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4">
            <DialogClose asChild>
              <Button size="sm" variant="ghost">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      {showEditAttendanceDialog && editAttendanceRecord && (
        <Dialog open={showEditAttendanceDialog} onOpenChange={setShowEditAttendanceDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Attendance</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await markAttendance({
                  meetingId: editAttendanceRecord.meetingId,
                  userId: editAttendanceRecord.user_id,
                  status: editAttendanceRecord.attendance_status,
                  type: editAttendanceRecord.attendance_type || 'physical',
                  notes: editAttendanceRecord.notes || '',
                });
                setShowEditAttendanceDialog(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block mb-1 font-medium">Status</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={editAttendanceRecord.attendance_status}
                  onChange={e => setEditAttendanceRecord((rec: any) => ({ ...rec, attendance_status: e.target.value }))}
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Type</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={editAttendanceRecord.attendance_type || 'physical'}
                  onChange={e => setEditAttendanceRecord((rec: any) => ({ ...rec, attendance_type: e.target.value }))}
                >
                  <option value="physical">Physical</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Notes</label>
                <textarea
                  className="w-full border rounded px-2 py-1"
                  value={editAttendanceRecord.notes || ''}
                  onChange={e => setEditAttendanceRecord((rec: any) => ({ ...rec, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditAttendanceDialog(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {/* Mandatory Attendance Dialog */}
      {showMandatoryAttendanceDialog && currentPendingMeeting && (
        <Dialog open={showMandatoryAttendanceDialog} onOpenChange={() => {}}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Your Attendance</DialogTitle>
              <DialogDescription>
                Please mark your attendance for the meeting: <b>{safeTitle(currentPendingMeeting.title)}</b> on {safeDate(currentPendingMeeting.start_time)} before proceeding.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const status = (form.elements.namedItem('status') as HTMLSelectElement).value;
                const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
                await handleMandatoryAttendanceSubmit(status, notes);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block mb-1 font-medium">Status</label>
                <select name="status" className="w-full border rounded px-2 py-1">
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Notes</label>
                <textarea name="notes" className="w-full border rounded px-2 py-1" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
