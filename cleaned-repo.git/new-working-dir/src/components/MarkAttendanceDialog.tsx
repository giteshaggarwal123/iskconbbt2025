import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Calendar, Clock, MapPin, Video } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { useMeetings } from '@/hooks/useMeetings';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface MarkAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MarkAttendanceDialog: React.FC<MarkAttendanceDialogProps> = ({ open, onOpenChange }) => {
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'late' | 'absent'>('present');
  const [attendanceType, setAttendanceType] = useState<'physical' | 'online'>('physical');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const { markAttendance, attendanceRecords = [] } = useAttendance();
  const { meetings } = useMeetings();
  const { user } = useAuth();

  // Filter meetings: only those the user is a part of and has not yet marked attendance
  const availableMeetings = meetings.filter(meeting => {
    if (!user) return false;
    // Check if user is an attendee (either in attendees or manual_attendees)
    const isAttendee = (Array.isArray(meeting.attendees) && meeting.attendees.some((a: any) => a.user_id === user.id)) ||
      (Array.isArray(meeting.manual_attendees) && meeting.manual_attendees.some((a: any) => a.email === user.email));
    // Check if attendance is already marked
    const hasMarked = attendanceRecords.some(r => r.meeting_id === meeting.id && r.user_id === user.id);
    return isAttendee && !hasMarked;
  });

  const selectedMeetingData = meetings.find(m => m.id === selectedMeeting);

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setSelectedMeeting('');
      setSelectedMember('');
      setAttendanceStatus('present');
      setAttendanceType('physical');
      setNotes('');
    }
  }, [open]);

  const handleMarkAttendance = async () => {
    if (!selectedMeeting || !user) {
      return;
    }
    setLoading(true);
    try {
      const success = await markAttendance({
        meetingId: selectedMeeting,
        userId: user.id,
        status: attendanceStatus,
        type: attendanceType,
        joinTime: attendanceStatus !== 'absent' ? new Date() : undefined,
        notes
      });
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMeetingBadge = (meeting: any) => {
    const now = new Date();
    const start = new Date(meeting.start_time);
    const end = new Date(meeting.end_time);
    
    if (now >= start && now <= end) {
      return <Badge className="bg-green-500 text-white">Live</Badge>;
    } else if (now < start) {
      return <Badge className="bg-blue-500 text-white">Upcoming</Badge>;
    } else {
      return <Badge variant="secondary">Completed</Badge>;
    }
  };

  const formatMeetingDisplay = (meeting: any) => {
    const start = new Date(meeting.start_time);
    return {
      date: format(start, 'MMM dd, yyyy'),
      time: format(start, 'h:mm a'),
      isOnline: meeting.meeting_type === 'online' || meeting.teams_join_url
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Mark Attendance</span>
          </DialogTitle>
          <DialogDescription>Record attendance for a meeting</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Meeting Selection */}
          <div className="space-y-2">
            <Label htmlFor="meeting">Select Meeting</Label>
            <Select value={selectedMeeting} onValueChange={setSelectedMeeting}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a meeting" />
              </SelectTrigger>
              <SelectContent>
                {availableMeetings.map((meeting) => {
                  const displayInfo = formatMeetingDisplay(meeting);
                  return (
                    <SelectItem key={meeting.id} value={meeting.id}>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-medium">{meeting.title}</div>
                          <div className="text-sm text-gray-500 flex items-center space-x-2">
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{displayInfo.date}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{displayInfo.time}</span>
                            </span>
                            {displayInfo.isOnline ? (
                              <Video className="h-3 w-3" />
                            ) : (
                              <MapPin className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedMeetingData && (
              <div className="flex items-center space-x-2 mt-2">
                {getMeetingBadge(selectedMeetingData)}
                <span className="text-sm text-gray-500">
                  {selectedMeetingData.location || 'Online Meeting'}
                </span>
              </div>
            )}
          </div>

          {/* Attendance Type (only for hybrid meetings) */}
          {selectedMeetingData && selectedMeetingData.meeting_type === 'hybrid' && (
            <div className="space-y-2">
              <Label>Attendance Type</Label>
              <div className="flex space-x-2">
                <Button
                  variant={attendanceType === 'physical' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAttendanceType('physical')}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  In Person
                </Button>
                <Button
                  variant={attendanceType === 'online' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAttendanceType('online')}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Online
                </Button>
              </div>
            </div>
          )}

          {/* Attendance Status */}
          <div className="space-y-2">
            <Label>Attendance Status</Label>
            <div className="flex space-x-2">
              <Button
                variant={attendanceStatus === 'present' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAttendanceStatus('present')}
                className={attendanceStatus === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
              >
                Present
              </Button>
              <Button
                variant={attendanceStatus === 'late' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAttendanceStatus('late')}
                className={attendanceStatus === 'late' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
              >
                Late
              </Button>
              <Button
                variant={attendanceStatus === 'absent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAttendanceStatus('absent')}
                className={attendanceStatus === 'absent' ? 'bg-red-500 hover:bg-red-600' : ''}
              >
                Absent
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about the attendance..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMarkAttendance} 
              disabled={loading || !selectedMeeting}
              className="bg-primary hover:bg-primary/90"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              {loading ? 'Recording...' : 'Mark Attendance'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
