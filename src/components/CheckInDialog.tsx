
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Video, Clock, UserCheck } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/hooks/useAuth';

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: any;
}

export const CheckInDialog: React.FC<CheckInDialogProps> = ({ open, onOpenChange, meeting }) => {
  const [attendanceType, setAttendanceType] = useState<'physical' | 'online'>('physical');
  const [status, setStatus] = useState<'present' | 'late'>('present');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { markAttendance } = useAttendance();
  const { user } = useAuth();

  const handleCheckIn = async () => {
    if (!user || !meeting) return;

    setLoading(true);
    try {
      const success = await markAttendance({
        meetingId: meeting.id,
        userId: user.id,
        status,
        type: attendanceType,
        joinTime: new Date(),
        notes
      });

      if (success) {
        onOpenChange(false);
        setNotes('');
      }
    } catch (error) {
      console.error('Check-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!meeting) return null;

  const isOnlineMeeting = meeting.meeting_type === 'online' || meeting.teams_join_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Check In to Meeting</span>
          </DialogTitle>
          <DialogDescription>{meeting.title}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{new Date(meeting.start_time).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              {isOnlineMeeting ? (
                <Video className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              <span>{meeting.location || 'Online Meeting'}</span>
            </div>
          </div>

          {/* Attendance Type Selection (only for hybrid meetings) */}
          {isOnlineMeeting && meeting.location && (
            <div className="space-y-2">
              <label className="text-sm font-medium">How are you attending?</label>
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

          {/* Status Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Attendance Status</label>
            <div className="flex space-x-2">
              <Button
                variant={status === 'present' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('present')}
                className={status === 'present' ? 'bg-success hover:bg-success/90' : ''}
              >
                On Time
              </Button>
              <Button
                variant={status === 'late' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('late')}
                className={status === 'late' ? 'bg-warning hover:bg-warning/90' : ''}
              >
                Late Arrival
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about your attendance..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCheckIn} 
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              {loading ? 'Checking In...' : 'Check In'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
