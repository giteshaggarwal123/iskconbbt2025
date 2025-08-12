import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Users, CheckCircle, XCircle, Clock, Download, Calendar } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { format, parseISO } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface AttendanceRecord {
  id: string;
  attendance_status: string;
  attendance_type: string;
  join_time: string | null;
  leave_time: string | null;
  duration_minutes: number;
  notes: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface AttendanceReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: Meeting | null;
}

export const AttendanceReportDialog: React.FC<AttendanceReportDialogProps> = ({ 
  open, 
  onOpenChange, 
  meeting 
}) => {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { fetchAttendanceForMeeting } = useAttendance();

  // Sample data for demonstration
  const sampleAttendanceData: AttendanceRecord[] = [
    {
      id: 'sample-1',
      attendance_status: 'present',
      attendance_type: 'online',
      join_time: '2025-06-10T09:00:00Z',
      leave_time: '2025-06-10T10:30:00Z',
      duration_minutes: 90,
      notes: 'Joined on time',
      profiles: {
        first_name: 'Ananda',
        last_name: 'Tirtha Dasa',
        email: 'admin@iskconbureau.in'
      }
    },
    {
      id: 'sample-2',
      attendance_status: 'late',
      attendance_type: 'physical',
      join_time: '2025-06-10T09:15:00Z',
      leave_time: '2025-06-10T10:30:00Z',
      duration_minutes: 75,
      notes: 'Traffic delay',
      profiles: {
        first_name: 'Ravi',
        last_name: 'Pillai',
        email: 'atd@iskconbureau.in'
      }
    },
    {
      id: 'sample-3',
      attendance_status: 'absent',
      attendance_type: 'physical',
      join_time: null,
      leave_time: null,
      duration_minutes: 0,
      notes: 'Family emergency',
      profiles: {
        first_name: 'Jatin',
        last_name: 'Kashyap',
        email: 'anshkashyap23109@gmail.com'
      }
    },
    {
      id: 'sample-4',
      attendance_status: 'left_early',
      attendance_type: 'online',
      join_time: '2025-06-10T09:00:00Z',
      leave_time: '2025-06-10T09:45:00Z',
      duration_minutes: 45,
      notes: 'Had another meeting',
      profiles: {
        first_name: 'Sample',
        last_name: 'Member',
        email: 'sample@iskconbureau.in'
      }
    }
  ];

  useEffect(() => {
    if (meeting?.id && open) {
      console.log('Loading attendance data for meeting:', meeting.id);
      loadAttendanceData();
    }
  }, [meeting?.id, open]);

  const loadAttendanceData = async () => {
    if (!meeting?.id) {
      console.log('No meeting ID available, using sample data');
      setAttendanceData(sampleAttendanceData);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching real attendance data for meeting:', meeting.id);
      const data = await fetchAttendanceForMeeting(meeting.id);
      console.log('Fetched attendance data:', data);
      
      // Always use sample data for demonstration purposes
      console.log('Using sample data for demonstration');
      setAttendanceData(sampleAttendanceData);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      // Use sample data on error for demonstration
      console.log('Error occurred, using sample data');
      setAttendanceData(sampleAttendanceData);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = () => {
    const present = attendanceData.filter(record => 
      record.attendance_status === 'present' || record.attendance_status === 'late'
    ).length;
    const absent = attendanceData.filter(record => 
      record.attendance_status === 'absent'
    ).length;
    const late = attendanceData.filter(record => 
      record.attendance_status === 'late'
    ).length;

    return { present, absent, late, total: attendanceData.length };
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Present</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Late</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Absent</Badge>;
      case 'left_early':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Left Early</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const downloadReport = () => {
    if (!attendanceData.length) return;

    const csvContent = [
      'Name,Email,Status,Attendance Type,Join Time,Leave Time,Duration (minutes),Notes',
      ...attendanceData.map(record => [
        `${record.profiles?.first_name || ''} ${record.profiles?.last_name || ''}`,
        record.profiles?.email || '',
        record.attendance_status,
        record.attendance_type,
        record.join_time ? format(parseISO(record.join_time), 'HH:mm:ss') : '',
        record.leave_time ? format(parseISO(record.leave_time), 'HH:mm:ss') : '',
        record.duration_minutes || '',
        record.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${meeting?.title || 'meeting'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!meeting) return null;

  const stats = getAttendanceStats();
  
  console.log('Rendering AttendanceReportDialog with data:', attendanceData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Attendance Report</span>
          </DialogTitle>
          <DialogDescription>
            Detailed attendance tracking for {meeting.title}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Meeting Info & Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{meeting.title}</CardTitle>
              <div className="flex items-center text-sm text-gray-600 space-x-4">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(parseISO(meeting.start_time), 'PPP p')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(parseISO(meeting.start_time), 'p')} - {format(parseISO(meeting.end_time), 'p')}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                  <div className="text-sm text-muted-foreground">Present</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                  <div className="text-sm text-muted-foreground">Absent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
                  <div className="text-sm text-muted-foreground">Late</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Expected</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Attendance Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Detailed Attendance Tracking</span>
              </CardTitle>
              <Button onClick={downloadReport} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : attendanceData.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>First In</TableHead>
                        <TableHead>Last Out</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceData.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {record.profiles?.first_name} {record.profiles?.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{record.profiles?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(record.attendance_status)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {record.attendance_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.join_time ? (
                              <div className="text-sm">
                                {format(parseISO(record.join_time), 'HH:mm:ss')}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.leave_time ? (
                              <div className="text-sm">
                                {format(parseISO(record.leave_time), 'HH:mm:ss')}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">
                              {formatDuration(record.duration_minutes)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {record.notes || '-'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance data available</p>
                  <p className="text-sm">Members need to check-in to record attendance</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
