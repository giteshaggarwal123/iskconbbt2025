import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, FileText, Mail, Vote, ExternalLink, Play, Video, MapPin, Users } from 'lucide-react';
import { useMeetings } from '@/hooks/useMeetings';
import { useDocuments } from '@/hooks/useDocuments';
import { useEmails } from '@/hooks/useEmails';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { MicrosoftConnectionStatus } from './MicrosoftConnectionStatus';
import { DocumentViewer } from './DocumentViewer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ViewAgendaDialog } from './ViewAgendaDialog';

interface Poll {
  id: string;
  title: string;
  description: string;
  status: string;
  deadline: string;
  created_at: string;
}

export const Dashboard: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const { meetings, loading: meetingsLoading } = useMeetings();
  const { documents, loading: documentsLoading } = useDocuments();
  const { emails, loading: emailsLoading } = useEmails();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showAgendaDialog, setShowAgendaDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  // Fetch active polls (show only 2)
  useEffect(() => {
    const fetchActivePolls = async () => {
      try {
        const { data, error } = await supabase
          .from('polls')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(2);
        if (error) throw error;
        setPolls((data || []).map(p => ({ ...p, description: p.description ?? '' })));
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load polls', variant: 'destructive' });
      }
    };
    if (user) fetchActivePolls();
  }, [user, toast]);

  // Only 2 items per section
  const upcomingMeetings = meetings
    .filter(m => new Date(m.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 2);
  const recentDocuments = documents
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 2);
  const recentEmails = emails
    .sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime())
    .slice(0, 2);
  const sortedPolls = polls
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 2);

  // User name
  const userName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user?.email?.split('@')[0] || 'User';

  // Actions
  const handleJoinMeeting = (meeting: any) => {
    if (meeting.teams_join_url) {
      window.open(meeting.teams_join_url, '_blank');
    } else {
      toast({ title: 'No Teams Link', description: 'No Teams link available', variant: 'destructive' });
    }
  };
  const handleOpenDocument = (doc: any) => {
    if (doc) {
      setSelectedDocument(doc);
      setIsDocumentViewerOpen(true);
    }
  };
  const handleCloseDocumentViewer = () => {
    setIsDocumentViewerOpen(false);
    setSelectedDocument(null);
  };
  const handleOpenEmail = (email: any) => {
    if (email?.id) {
      window.open(`https://outlook.office.com/mail/inbox/id/${email.id}`, '_blank');
    }
  };
  const handleVoteNow = (poll: Poll) => {
    if (poll && new Date(poll.deadline) > new Date()) {
      navigate('/voting');
    }
  };
  const handleViewMore = (module: string) => navigate(`/${module}`);
  const isPastDeadline = (deadline: string) => new Date(deadline) < new Date();
  const getEmailPreview = (htmlBody: string, maxLength: number = 80) => {
    if (!htmlBody) return 'No preview available';
    const textContent = htmlBody.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
    return textContent.length > maxLength ? textContent.substring(0, maxLength) + '...' : textContent;
  };
  const handleOpenAgenda = (meeting: any) => {
    setSelectedMeeting(meeting);
    setShowAgendaDialog(true);
  };
  const handleCloseAgenda = () => {
    setShowAgendaDialog(false);
    setSelectedMeeting(null);
  };

  // Defensive helpers
  const safe = (val: any, fallback: string = '') => (val === undefined || val === null ? fallback : val);

  // Loading
  if (meetingsLoading || documentsLoading || emailsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getMeetingTypeIcon = (meeting: any) => {
    if (meeting.meeting_type === 'online') return <Video className="h-4 w-4 text-blue-600 mr-1" />;
    if (meeting.meeting_type === 'physical') return <MapPin className="h-4 w-4 text-green-600 mr-1" />;
    if (meeting.meeting_type === 'hybrid') return <Users className="h-4 w-4 text-purple-600 mr-1" />;
    return null;
  };

  const getJoinButton = (meeting: any) => {
    if (meeting.meeting_type === 'online' && meeting.teams_join_url) {
      return <Button size="sm" className="bg-blue-600 text-white h-6 w-6 p-0 ml-2" onClick={e => { e.stopPropagation(); handleJoinMeeting(meeting); }} title="Join Online"><Video className="h-3 w-3" /></Button>;
    }
    if (meeting.meeting_type === 'physical' && meeting.location) {
      return <Button size="sm" className="bg-green-600 text-white h-6 w-6 p-0 ml-2" onClick={e => { e.stopPropagation(); window.open(`https://maps.google.com/?q=${encodeURIComponent(meeting.location)}`,'_blank'); }} title="View Location"><MapPin className="h-3 w-3" /></Button>;
    }
    if (meeting.meeting_type === 'hybrid') {
      return <div className="flex gap-1 ml-2">
        {meeting.teams_join_url && <Button size="sm" className="bg-blue-600 text-white h-6 w-6 p-0" onClick={e => { e.stopPropagation(); handleJoinMeeting(meeting); }} title="Join Online"><Video className="h-3 w-3" /></Button>}
        {meeting.location && <Button size="sm" className="bg-green-600 text-white h-6 w-6 p-0" onClick={e => { e.stopPropagation(); window.open(`https://maps.google.com/?q=${encodeURIComponent(meeting.location)}`,'_blank'); }} title="View Location"><MapPin className="h-3 w-3" /></Button>}
      </div>;
    }
    return null;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 py-6 space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Welcome, {userName}</h1>
        <p className="text-sm text-muted-foreground">Here's a quick overview of your activity.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Emails */}
        <Card className="h-full min-h-[220px] flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Mail className="h-5 w-5 text-red-600" />
            <CardTitle className="text-base">Recent Emails</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex-1 flex flex-col justify-between">
            {recentEmails.length > 0 ? recentEmails.map(email => (
              <div key={email.id} className="mb-2 p-2 rounded hover:bg-muted/50 flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm truncate">{safe(email.subject, 'No Subject')}</span>
                  <Button size="sm" variant="outline" onClick={() => handleOpenEmail(email)} disabled={!email.id} className="h-6 w-6 p-0"><ExternalLink className="h-3 w-3" /></Button>
                </div>
                <span className="text-xs text-muted-foreground">{getEmailPreview(safe(email.body))}</span>
              </div>
            )) : <div className="text-center text-muted-foreground py-4">No emails found</div>}
            <Button variant="ghost" className="w-full mt-2" onClick={() => handleViewMore('email')}>View More</Button>
          </CardContent>
        </Card>
        {/* Meetings */}
        <Card className="h-full min-h-[220px] flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Upcoming Meetings</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex-1 flex flex-col justify-between">
            {upcomingMeetings.length > 0 ? upcomingMeetings.map(meeting => (
              <div key={meeting.id} className="mb-2 p-2 rounded hover:bg-muted/50 flex flex-col cursor-pointer group" onClick={() => handleOpenAgenda(meeting)}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm truncate flex items-center">
                    {getMeetingTypeIcon(meeting)}
                    {safe(meeting.title, 'Untitled')}
                  </span>
                  {getJoinButton(meeting)}
                </div>
                <span className="text-xs text-muted-foreground">{meeting.start_time ? new Date(meeting.start_time).toLocaleString() : ''}</span>
              </div>
            )) : <div className="text-center text-muted-foreground py-4">No upcoming meetings</div>}
            <Button variant="ghost" className="w-full mt-2" onClick={() => handleViewMore('meetings')}>View More</Button>
          </CardContent>
        </Card>
        {/* Documents */}
        <Card className="h-full min-h-[220px] flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base">Recent Documents</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex-1 flex flex-col justify-between">
            {recentDocuments.length > 0 ? recentDocuments.map(doc => (
              <div key={doc.id} className="mb-2 p-2 rounded hover:bg-muted/50 flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm truncate">{safe(doc.name, 'Untitled')}</span>
                  <Button size="sm" variant="outline" onClick={() => handleOpenDocument(doc)} disabled={!doc.id} className="h-6 w-6 p-0"><ExternalLink className="h-3 w-3" /></Button>
                </div>
                <span className="text-xs text-muted-foreground">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</span>
              </div>
            )) : <div className="text-center text-muted-foreground py-4">No documents uploaded</div>}
            <Button variant="ghost" className="w-full mt-2" onClick={() => handleViewMore('documents')}>View More</Button>
          </CardContent>
        </Card>
        {/* Polls */}
        <Card className="h-full min-h-[220px] flex flex-col justify-between">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Vote className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base">Active Polls</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex-1 flex flex-col justify-between">
            {sortedPolls.length > 0 ? sortedPolls.map(poll => (
              <div key={poll.id} className="mb-2 p-2 rounded hover:bg-muted/50 flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm truncate">{safe(poll.title, 'Untitled')}</span>
                  {!isPastDeadline(poll.deadline) && <Button size="sm" className="bg-purple-600 text-white h-6 w-6 p-0" onClick={() => handleVoteNow(poll)}><Vote className="h-3 w-3" /></Button>}
                </div>
                <span className="text-xs text-muted-foreground">Deadline: {poll.deadline ? new Date(poll.deadline).toLocaleDateString() : ''}</span>
              </div>
            )) : <div className="text-center text-muted-foreground py-4">No active polls</div>}
            <Button variant="ghost" className="w-full mt-2" onClick={() => handleViewMore('voting')}>View More</Button>
          </CardContent>
        </Card>
      </div>
      <ViewAgendaDialog open={showAgendaDialog} onOpenChange={setShowAgendaDialog} meeting={selectedMeeting} />
      <DocumentViewer isOpen={isDocumentViewerOpen} onClose={handleCloseDocumentViewer} document={selectedDocument} documentType="document" />
    </div>
  );
};
