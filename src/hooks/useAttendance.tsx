import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface AttendanceRecord {
  id: string;
  meeting_id: string;
  user_id: string;
  attendance_status: 'present' | 'late' | 'absent' | 'left_early';
  attendance_type: 'physical' | 'online';
  join_time?: string;
  leave_time?: string;
  duration_minutes?: number;
  is_verified: boolean;
  verified_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const useAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAttendanceForMeeting = async (meetingId: string) => {
    if (!meetingId) return [];
    
    try {
      console.log('Fetching attendance for meeting:', meetingId);
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          profiles!attendance_records_user_id_fkey(first_name, last_name, email)
        `)
        .eq('meeting_id', meetingId);

      if (error) {
        console.error('Attendance fetch error:', error);
        return [];
      }

      console.log('Fetched attendance records:', data);
      return data || [];
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      return [];
    }
  };

  const markAttendance = async (attendanceData: {
    meetingId: string;
    userId: string;
    status: 'present' | 'late' | 'absent' | 'left_early';
    type: 'physical' | 'online';
    joinTime?: Date;
    leaveTime?: Date;
    notes?: string;
  }) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to mark attendance",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('Marking attendance:', attendanceData);

      const { error } = await supabase
        .from('attendance_records')
        .upsert({
          meeting_id: attendanceData.meetingId,
          user_id: attendanceData.userId,
          attendance_status: attendanceData.status,
          attendance_type: attendanceData.type,
          join_time: attendanceData.joinTime?.toISOString(),
          leave_time: attendanceData.leaveTime?.toISOString(),
          notes: attendanceData.notes,
          verified_by: user.id,
          is_verified: true
        }, {
          onConflict: 'meeting_id,user_id'
        });

      if (error) {
        console.error('Attendance marking error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Attendance marked successfully"
      });

      // Fetch all attendance after marking
      await fetchAttendance();

      return true;
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive"
      });
      return false;
    }
  };

  const autoTrackOnlineAttendance = async (meetingId: string, teamsData: any) => {
    if (!teamsData?.attendees) return;

    try {
      const attendancePromises = teamsData.attendees.map(async (attendee: any) => {
        // Try to match attendee email with user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', attendee.emailAddress)
          .single();

        if (!profile) return null;

        const joinTime = attendee.joinDateTime ? new Date(attendee.joinDateTime) : null;
        const leaveTime = attendee.leaveDateTime ? new Date(attendee.leaveDateTime) : null;
        
        let status: 'present' | 'late' | 'absent' | 'left_early' = 'present';
        
        // Determine status based on join/leave times
        if (!joinTime) {
          status = 'absent';
        } else if (leaveTime && joinTime) {
          const duration = (leaveTime.getTime() - joinTime.getTime()) / (1000 * 60);
          if (duration < 15) { // Left within 15 minutes
            status = 'left_early';
          }
        }

        return {
          meeting_id: meetingId,
          user_id: profile.id,
          attendance_status: status,
          attendance_type: 'online' as const,
          join_time: joinTime?.toISOString(),
          leave_time: leaveTime?.toISOString(),
          is_verified: true
        };
      });

      const attendanceRecords = (await Promise.all(attendancePromises)).filter(Boolean);

      if (attendanceRecords.length > 0) {
        const { error } = await supabase
          .from('attendance_records')
          .upsert(attendanceRecords);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Auto-tracked attendance for ${attendanceRecords.length} participants`
        });
      }
    } catch (error: any) {
      console.error('Error auto-tracking attendance:', error);
      toast({
        title: "Warning",
        description: "Failed to auto-track some attendance records",
        variant: "destructive"
      });
    }
  };

  const generateAttendanceReport = async (meetingId?: string, startDate?: Date, endDate?: Date) => {
    try {
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          profiles!attendance_records_user_id_fkey(first_name, last_name, email),
          meetings!attendance_records_meeting_id_fkey(title, start_time, meeting_type)
        `);

      if (meetingId) {
        query = query.eq('meeting_id', meetingId);
      }

      if (startDate && endDate) {
        query = query.gte('created_at', startDate.toISOString())
                     .lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) {
        console.error('Report generation error:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      console.error('Error generating report:', error);
      return [];
    }
  };

  // Add a function to fetch all attendance records
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          profiles!attendance_records_user_id_fkey(first_name, last_name, email)
        `);
      if (error) {
        console.error('Attendance fetch error:', error);
        setLoading(false);
        return;
      }
      // Fix: cast attendance_status and attendance_type to correct union types
      const fixedData = (data || []).map((r: any) => ({
        ...r,
        attendance_status: r.attendance_status as 'present' | 'late' | 'absent' | 'left_early',
        attendance_type: r.attendance_type as 'physical' | 'online',
      }));
      setAttendanceRecords(fixedData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
    setLoading(false);
  };

  return {
    attendanceRecords,
    loading,
    fetchAttendanceForMeeting,
    markAttendance,
    autoTrackOnlineAttendance,
    generateAttendanceReport,
    fetchAttendance,
  };
};
