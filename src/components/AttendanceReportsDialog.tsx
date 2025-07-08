
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, TrendingUp, Users, Clock, BarChart3, UserCheck, Target } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks, parseISO } from 'date-fns';

interface AttendanceReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AttendanceReportsDialog: React.FC<AttendanceReportsDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const { generateAttendanceReport } = useAttendance();

  // Generate sample data when no real data is available
  const generateSampleData = () => {
    const sampleMembers = [
      { id: '1', first_name: 'Arjun', last_name: 'Sharma', email: 'arjun.sharma@example.com' },
      { id: '2', first_name: 'Priya', last_name: 'Patel', email: 'priya.patel@example.com' },
      { id: '3', first_name: 'Rahul', last_name: 'Gupta', email: 'rahul.gupta@example.com' },
      { id: '4', first_name: 'Kavita', last_name: 'Singh', email: 'kavita.singh@example.com' },
      { id: '5', first_name: 'Amit', last_name: 'Kumar', email: 'amit.kumar@example.com' },
      { id: '6', first_name: 'Sneha', last_name: 'Joshi', email: 'sneha.joshi@example.com' },
      { id: '7', first_name: 'Vikram', last_name: 'Reddy', email: 'vikram.reddy@example.com' },
      { id: '8', first_name: 'Meera', last_name: 'Nair', email: 'meera.nair@example.com' }
    ];

    const sampleData = [];
    const now = new Date();
    
    // Generate sample attendance records for each member
    sampleMembers.forEach((member, memberIndex) => {
      // Generate 5-8 meetings per member
      const meetingCount = 5 + Math.floor(Math.random() * 4);
      
      for (let i = 0; i < meetingCount; i++) {
        const meetingDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date in last 30 days
        const attendanceTypes = ['present', 'late', 'absent'];
        const attendanceWeights = memberIndex < 3 ? [0.8, 0.15, 0.05] : memberIndex < 6 ? [0.6, 0.25, 0.15] : [0.4, 0.3, 0.3]; // Better attendance for first few members
        
        const randomChoice = Math.random();
        let attendanceStatus = 'present';
        if (randomChoice < attendanceWeights[2]) {
          attendanceStatus = 'absent';
        } else if (randomChoice < attendanceWeights[1] + attendanceWeights[2]) {
          attendanceStatus = 'late';
        }

        sampleData.push({
          id: `${member.id}-${i}`,
          meeting_id: `meeting-${i + 1}`,
          user_id: member.id,
          attendance_status: attendanceStatus,
          duration_minutes: attendanceStatus === 'absent' ? 0 : 45 + Math.floor(Math.random() * 60), // 45-105 minutes
          created_at: meetingDate.toISOString(),
          profiles: member
        });
      }
    });

    return sampleData;
  };

  useEffect(() => {
    if (open) {
      loadReportData();
    }
  }, [open, selectedPeriod]);

  const getDateRange = () => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'current_week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'last_week':
        return { start: startOfWeek(subWeeks(now, 1)), end: endOfWeek(subWeeks(now, 1)) };
      case 'current_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'last_3_months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const data = await generateAttendanceReport(undefined, start, end);
      
      // If no real data, use sample data
      if (!data || data.length === 0) {
        const sampleData = generateSampleData();
        setReportData(sampleData);
      } else {
        setReportData(data);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
      // Fallback to sample data on error
      const sampleData = generateSampleData();
      setReportData(sampleData);
    } finally {
      setLoading(false);
    }
  };

  const getOverallStats = () => {
    if (!reportData.length) return { totalMeetings: 0, avgAttendance: 0, totalMembers: 0, activeMembers: 0 };

    const uniqueMeetings = [...new Set(reportData.map(r => r.meeting_id))];
    const uniqueMembers = [...new Set(reportData.map(r => r.user_id))];
    const activeMembers = [...new Set(reportData.filter(r => r.attendance_status === 'present' || r.attendance_status === 'late').map(r => r.user_id))];

    const totalMeetings = uniqueMeetings.length;
    const avgAttendance = reportData.length > 0 
      ? Math.round((reportData.filter(r => r.attendance_status === 'present' || r.attendance_status === 'late').length / reportData.length) * 100)
      : 0;

    return { 
      totalMeetings, 
      avgAttendance, 
      totalMembers: uniqueMembers.length,
      activeMembers: activeMembers.length
    };
  };

  const getMemberAnalytics = () => {
    const memberStats = reportData.reduce((acc: any, record: any) => {
      const memberKey = record.user_id;
      const memberName = `${record.profiles?.first_name} ${record.profiles?.last_name}`;
      
      if (!acc[memberKey]) {
        acc[memberKey] = {
          name: memberName,
          email: record.profiles?.email,
          totalMeetings: 0,
          attended: 0,
          late: 0,
          absent: 0,
          totalDuration: 0,
          averageDuration: 0,
          attendanceStreak: 0,
          lastAttendance: null
        };
      }
      
      acc[memberKey].totalMeetings++;
      
      switch (record.attendance_status) {
        case 'present':
          acc[memberKey].attended++;
          acc[memberKey].lastAttendance = record.created_at;
          break;
        case 'late':
          acc[memberKey].late++;
          acc[memberKey].lastAttendance = record.created_at;
          break;
        case 'absent':
          acc[memberKey].absent++;
          break;
      }
      
      if (record.duration_minutes) {
        acc[memberKey].totalDuration += record.duration_minutes;
      }
      
      return acc;
    }, {});

    // Calculate average duration and attendance rate for each member
    Object.values(memberStats).forEach((member: any) => {
      if (member.totalMeetings > 0) {
        member.averageDuration = Math.round(member.totalDuration / member.totalMeetings);
        member.attendanceRate = Math.round(((member.attended + member.late) / member.totalMeetings) * 100);
      }
    });

    return Object.values(memberStats).sort((a: any, b: any) => b.attendanceRate - a.attendanceRate);
  };

  const getMemberSummary = () => {
    const memberStats = reportData.reduce((acc: any, record: any) => {
      const memberKey = record.user_id;
      const memberName = `${record.profiles?.first_name} ${record.profiles?.last_name}`;
      
      if (!acc[memberKey]) {
        acc[memberKey] = {
          name: memberName,
          email: record.profiles?.email,
          totalMeetings: 0,
          attended: 0,
          late: 0,
          absent: 0,
          totalDuration: 0
        };
      }
      
      acc[memberKey].totalMeetings++;
      
      switch (record.attendance_status) {
        case 'present':
          acc[memberKey].attended++;
          break;
        case 'late':
          acc[memberKey].late++;
          break;
        case 'absent':
          acc[memberKey].absent++;
          break;
      }
      
      if (record.duration_minutes) {
        acc[memberKey].totalDuration += record.duration_minutes;
      }
      
      return acc;
    }, {});

    return Object.values(memberStats);
  };

  const downloadReport = () => {
    const memberSummary = getMemberSummary();
    const csvContent = [
      'Member,Email,Total Meetings,Attended,Late,Absent,Attendance Rate,Total Duration (hours)',
      ...memberSummary.map((member: any) => [
        member.name,
        member.email,
        member.totalMeetings,
        member.attended,
        member.late,
        member.absent,
        `${Math.round(((member.attended + member.late) / member.totalMeetings) * 100)}%`,
        `${Math.round(member.totalDuration / 60 * 100) / 100}`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_analytics_${selectedPeriod}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = getOverallStats();
  const memberAnalytics = getMemberAnalytics();
  const memberSummary = getMemberSummary();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Attendance Analytics & Reports</span>
          </DialogTitle>
          <DialogDescription>
            Comprehensive attendance analytics with member-wise insights and tracking
            {reportData.length > 0 && reportData[0].profiles?.first_name === 'Arjun' && (
              <span className="text-orange-600 font-medium"> (Sample Data)</span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Period Selection & Download */}
          <div className="flex justify-between items-center">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_week">Current Week</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="current_month">Current Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={downloadReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>

          {/* Dynamic Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.totalMeetings}</div>
                <p className="text-xs text-gray-500">In selected period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Average Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.avgAttendance}%</div>
                <p className="text-xs text-gray-500">Overall attendance rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.totalMembers}</div>
                <p className="text-xs text-gray-500">Registered members</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.activeMembers}</div>
                <p className="text-xs text-gray-500">With attendance records</p>
              </CardContent>
            </Card>
          </div>

          {/* Member Analytics Tabs */}
          <Tabs defaultValue="summary" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Member Summary</TabsTrigger>
              <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
            </TabsList>

            {/* Member Summary Table */}
            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Member Attendance Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : memberSummary.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Total Meetings</TableHead>
                            <TableHead>Present</TableHead>
                            <TableHead>Late</TableHead>
                            <TableHead>Absent</TableHead>
                            <TableHead>Attendance Rate</TableHead>
                            <TableHead>Total Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {memberSummary.map((member: any, index) => {
                            const attendanceRate = Math.round(((member.attended + member.late) / member.totalMeetings) * 100);
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{member.name}</div>
                                    <div className="text-sm text-gray-500">{member.email}</div>
                                  </div>
                                </TableCell>
                                <TableCell>{member.totalMeetings}</TableCell>
                                <TableCell>
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    {member.attended}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                    {member.late}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-red-100 text-red-800 border-red-200">
                                    {member.absent}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={attendanceRate >= 80 ? "default" : attendanceRate >= 60 ? "secondary" : "destructive"}>
                                    {attendanceRate}%
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{Math.round(member.totalDuration / 60 * 100) / 100}h</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No attendance data available for selected period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Detailed Analytics */}
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Detailed Member Analytics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : memberAnalytics.length > 0 ? (
                    <div className="space-y-4">
                      {memberAnalytics.map((member: any, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{member.name}</h3>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                            <Badge 
                              variant={member.attendanceRate >= 80 ? "default" : member.attendanceRate >= 60 ? "secondary" : "destructive"}
                              className="text-sm"
                            >
                              {member.attendanceRate}% Attendance
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">{member.totalMeetings}</div>
                              <div className="text-gray-500">Total Meetings</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">{member.attended}</div>
                              <div className="text-gray-500">Present</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-yellow-600">{member.late}</div>
                              <div className="text-gray-500">Late</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-red-600">{member.absent}</div>
                              <div className="text-gray-500">Absent</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-purple-600">{member.averageDuration}m</div>
                              <div className="text-gray-500">Avg Duration</div>
                            </div>
                          </div>
                          
                          {member.lastAttendance && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center text-sm text-gray-600">
                                <UserCheck className="h-4 w-4 mr-1" />
                                Last attendance: {format(parseISO(member.lastAttendance), 'MMM dd, yyyy')}
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No detailed analytics available for selected period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
