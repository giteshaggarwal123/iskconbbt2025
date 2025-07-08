import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Eye, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface DocumentAnalyticsProps {
  documentId: string;
  documentName: string;
  documentType?: 'document' | 'meeting_attachment' | 'poll_attachment';
  buttonClassName?: string;
  iconOnly?: boolean;
}

interface AnalyticsData {
  totalViews: number;
  totalTimeSpent: number;
  memberAnalytics: Array<{ 
    name: string; 
    views: number; 
    timeSpent: number; 
    lastViewed: string;
  }>;
}

export const DocumentAnalytics: React.FC<DocumentAnalyticsProps> = ({ 
  documentId, 
  documentName,
  documentType = 'document',
  buttonClassName = '',
  iconOnly = false
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      console.log('Fetching analytics for:', documentType, documentId);
      
      // First, get current view/download counts from the attachment table
      let currentCounts = { view_count: 0, download_count: 0 };
      
      if (documentType === 'meeting_attachment') {
        const { data: attachmentData } = await supabase
          .from('meeting_attachments')
          .select('view_count, download_count')
          .eq('id', documentId)
          .single();
        
        if (attachmentData) {
          currentCounts = {
            view_count: attachmentData.view_count ?? 0,
            download_count: attachmentData.download_count ?? 0
          };
        }
      } else if (documentType === 'poll_attachment') {
        const { data: attachmentData } = await supabase
          .from('poll_attachments')
          .select('view_count, download_count')
          .eq('id', documentId)
          .single();
        
        if (attachmentData) {
          currentCounts = {
            view_count: attachmentData.view_count ?? 0,
            download_count: attachmentData.download_count ?? 0
          };
        }
      }

      // Fetch member-wise analytics with profile data using LEFT JOIN to include all analytics records
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('document_analytics')
        .select(`
          user_id,
          action_type,
          created_at,
          profiles(
            first_name,
            last_name,
            email
          )
        `)
        .eq('document_id', documentId)
        .eq('document_type', documentType)
        .order('created_at', { ascending: false });

      if (analyticsError) {
        console.error('Error fetching analytics with profiles:', analyticsError);
        throw new Error(`Analytics fetch failed: ${analyticsError.message}`);
      }

      console.log('Analytics data with profiles:', analyticsData);

      // Fetch time spent data for documents only using LEFT JOIN
      let timeSpentData: any[] = [];
      if (documentType === 'document') {
        const { data: timeData, error: timeError } = await supabase
          .from('document_views')
          .select(`
            user_id,
            time_spent_seconds,
            profiles(
              first_name,
              last_name,
              email
            )
          `)
          .eq('document_id', documentId);

        if (timeError) {
          console.error('Error fetching time data:', timeError);
        } else if (timeData) {
          timeSpentData = timeData;
          console.log('Time spent data:', timeSpentData);
        }
      }

      // Process member analytics with better error handling
      const memberStats: { [key: string]: { name: string; views: number; downloads: number; timeSpent: number; lastViewed: string } } = {};
      
      if (analyticsData && analyticsData.length > 0) {
        analyticsData.forEach((record: any) => {
          const userId = record.user_id;
          const profile = record.profiles;
          
          // Create a robust display name from profile data
          let userName = 'Unknown User';
          if (profile && typeof profile === 'object') {
            if (profile.first_name && profile.last_name) {
              userName = `${profile.first_name} ${profile.last_name}`.trim();
            } else if (profile.first_name) {
              userName = profile.first_name;
            } else if (profile.last_name) {
              userName = profile.last_name;
            } else if (profile.email) {
              userName = profile.email.split('@')[0];
            }
          } else {
            // Fallback: try to get profile separately if JOIN failed
            console.warn(`No profile found for user ${userId} in analytics record`);
            userName = `User ${userId.substring(0, 8)}...`;
          }
          
          if (!memberStats[userId]) {
            memberStats[userId] = {
              name: userName,
              views: 0,
              downloads: 0,
              timeSpent: 0,
              lastViewed: record.created_at
            };
          }

          if (record.action_type === 'view') {
            memberStats[userId].views++;
          } else if (record.action_type === 'download') {
            memberStats[userId].downloads++;
          }

          // Update last viewed to the most recent
          if (new Date(record.created_at) > new Date(memberStats[userId].lastViewed)) {
            memberStats[userId].lastViewed = record.created_at;
          }
        });
      }

      // Add time spent data for documents with robust error handling
      if (timeSpentData.length > 0) {
        timeSpentData.forEach((record: any) => {
          const userId = record.user_id;
          const profile = record.profiles;
          
          // Create a robust display name from profile data
          let userName = 'Unknown User';
          if (profile && typeof profile === 'object') {
            if (profile.first_name && profile.last_name) {
              userName = `${profile.first_name} ${profile.last_name}`.trim();
            } else if (profile.first_name) {
              userName = profile.first_name;
            } else if (profile.last_name) {
              userName = profile.last_name;
            } else if (profile.email) {
              userName = profile.email.split('@')[0];
            }
          } else {
            console.warn(`No profile found for user ${userId} in time spent record`);
            userName = `User ${userId.substring(0, 8)}...`;
          }
          
          if (memberStats[userId]) {
            memberStats[userId].timeSpent += record.time_spent_seconds || 0;
          } else {
            // Create entry if user has time spent but no view record in analytics
            memberStats[userId] = {
              name: userName,
              views: 0,
              downloads: 0,
              timeSpent: record.time_spent_seconds || 0,
              lastViewed: new Date().toISOString()
            };
          }
        });
      }

      const memberAnalytics = Object.values(memberStats)
        .sort((a, b) => b.views - a.views);

      // Calculate totals - use current counts from the database
      const totalViews = currentCounts.view_count || 0;
      const totalDownloads = currentCounts.download_count || 0;
      const totalTimeSpent = memberAnalytics.reduce((sum, member) => sum + member.timeSpent, 0);

      setAnalytics({
        totalViews,
        totalTimeSpent,
        memberAnalytics: memberAnalytics.map(member => ({
          name: member.name,
          views: member.views,
          timeSpent: member.timeSpent,
          lastViewed: member.lastViewed
        }))
      });

      console.log('Analytics processed successfully:', {
        totalViews,
        totalDownloads,
        totalTimeSpent,
        memberCount: memberAnalytics.length,
        memberData: memberAnalytics
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics({
        totalViews: 0,
        totalTimeSpent: 0,
        memberAnalytics: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    return `${remainingSeconds}s`;
  };

  const getDocumentTypeLabel = () => {
    switch (documentType) {
      case 'meeting_attachment':
        return 'Meeting Attachment';
      case 'poll_attachment':
        return 'Poll Attachment';
      default:
        return 'Document';
    }
  };

  // Excel export handler
  const handleExportExcel = () => {
    if (!analytics || !analytics.memberAnalytics.length) return;
    const ws = XLSX.utils.json_to_sheet(analytics.memberAnalytics.map(m => ({
      Member: m.name,
      Views: m.views,
      'Time Spent (s)': m.timeSpent,
      'Last Viewed': m.lastViewed
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analytics');
    const fileName = `${documentName.replace(/[^a-zA-Z0-9]/g, '_')}_analytics_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setOpen(true);
            fetchAnalytics();
          }}
          className={buttonClassName}
        >
          <BarChart3 className={iconOnly ? 'h-4 w-4' : 'h-3 w-3 mr-1'} />
          {!iconOnly && 'Analytics'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {getDocumentTypeLabel()} Analytics
          </DialogTitle>
          <DialogDescription>
            Analytics for "{documentName}"
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Total Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalViews}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Times this file has been viewed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Total Time Spent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatTime(analytics.totalTimeSpent)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cumulative viewing time
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Member Analytics Table */}
            {analytics.memberAnalytics.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Member Analytics
                    <Button size="sm" variant="outline" className="ml-auto" onClick={handleExportExcel}>
                      Download Excel
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Individual member viewing activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Time Spent</TableHead>
                        <TableHead>Last Viewed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.memberAnalytics.map((member, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3 text-gray-400" />
                              {member.views}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              {formatTime(member.timeSpent)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(member.lastViewed), 'MMM d, hh:mm a')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No member activity yet</p>
                <p className="text-sm mt-2">Member views and activity will appear here once users interact with this {documentType.replace('_', ' ').toLowerCase()}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Failed to load analytics data</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
