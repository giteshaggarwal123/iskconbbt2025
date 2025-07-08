import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Save, RefreshCw, Users, Clock, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useTranscripts } from '@/hooks/useTranscripts';
import { useAttendance } from '@/hooks/useAttendance';
import { useToast } from '@/hooks/use-toast';
import { useMicrosoftAuth } from '@/hooks/useMicrosoftAuth';

interface MeetingTranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: any;
}

export const MeetingTranscriptDialog: React.FC<MeetingTranscriptDialogProps> = ({ 
  open, 
  onOpenChange, 
  meeting 
}) => {
  const [transcript, setTranscript] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailedInfo, setDetailedInfo] = useState<any>(null);

  const { 
    fetchTranscriptForMeeting, 
    fetchTeamsTranscript, 
    saveTranscript, 
    saveTranscriptToDocuments 
  } = useTranscripts();
  const { autoTrackOnlineAttendance } = useAttendance();
  const { accessToken, isConnected, isExpired, forceRefresh } = useMicrosoftAuth();
  const { toast } = useToast();

  const loadTranscript = async (forceRefresh = false) => {
    if (!meeting) return;

    setLoading(true);
    setError(null);
    setDetailedInfo(null);
    
    try {
      console.log(`Enhanced transcript loading for meeting: ${meeting.title} (ID: ${meeting.id})`);
      console.log('Teams meeting ID:', meeting.teams_meeting_id);
      
      // First check if we have a saved transcript (skip if force refresh)
      if (!forceRefresh) {
        const savedTranscript = await fetchTranscriptForMeeting(meeting.id);
        if (savedTranscript && savedTranscript.transcript_content) {
          console.log('Found saved transcript with content:', savedTranscript);
          setTranscript(savedTranscript);
          setLoading(false);
          return;
        }
      }

      // Enhanced transcript extraction for any meeting type
      if (meeting.teams_meeting_id) {
        console.log(`Starting enhanced Teams transcript extraction for: ${meeting.teams_meeting_id}`);
        
        // Check Microsoft auth status first
        if (!isConnected || isExpired) {
          setError('Microsoft account is not connected or token has expired. Please reconnect in Settings.');
          setLoading(false);
          return;
        }

        if (!accessToken) {
          setError('No Microsoft access token available. Please reconnect your Microsoft account in Settings.');
          setLoading(false);
          return;
        }

        setAutoProcessing(true);
        
        try {
          const teamsData = await fetchTeamsTranscript(meeting.id, meeting.teams_meeting_id);
          console.log('Enhanced Teams data received:', teamsData);

          setDetailedInfo(teamsData); // Store for detailed display
          
          if (teamsData) {
            if (teamsData.success && teamsData.hasContent && teamsData.transcriptContent) {
              console.log('Enhanced processing successful, transcript content found...');
              
              // Auto-track attendance from Teams data if available
              if (teamsData.attendees?.value?.[0]?.attendanceRecords) {
                try {
                  await autoTrackOnlineAttendance(meeting.id, teamsData);
                  console.log('Attendance tracked successfully from enhanced data');
                } catch (attendanceError) {
                  console.warn('Failed to track attendance from enhanced data:', attendanceError);
                }
              }

              // Process and save the enhanced transcript
              const processedTranscript = {
                content: teamsData.transcriptContent,
                summary: 'AI-generated summary will be available soon',
                actionItems: [],
                participants: teamsData.attendees?.value?.[0]?.attendanceRecords || [],
                teamsTranscriptId: teamsData.transcript?.value?.[0]?.id
              };

              const saved = await saveTranscript(meeting.id, processedTranscript);
              if (saved) {
                setTranscript(saved);
                toast({
                  title: "Enhanced Transcript Extracted!",
                  description: "Teams transcript has been successfully extracted using enhanced methods and saved."
                });
              }
            } else if (teamsData.hasRecordings && !teamsData.hasContent) {
              // Special case: recordings found but transcript still processing
              setError('Meeting recording found but transcript is still being processed. This can take up to 24 hours after the meeting ends. The enhanced extraction will continue to monitor for availability.');
            } else if (teamsData.transcript?.value?.length > 0 && !teamsData.hasContent) {
              // Transcript exists but content not ready
              setError('Transcript is available in Teams but content could not be extracted with enhanced methods. This may be due to processing delays or access restrictions.');
            } else if (teamsData.success === false) {
              // Handled error from the enhanced extraction
              setError(teamsData.error || 'Enhanced extraction methods were unable to retrieve transcript from this meeting.');
            } else {
              // No transcript found at all
              const searchInfo = teamsData.foundWith ? ` (Found via: ${teamsData.foundWith})` : '';
              setError(`No transcript found for this meeting in Teams${searchInfo}. Enhanced extraction attempted multiple strategies but found no accessible transcript data.`);
            }
          } else {
            setError('Enhanced extraction failed to connect to Teams or retrieve meeting data.');
          }
        } catch (teamsError: any) {
          console.error('Enhanced Teams extraction error:', teamsError);
          setError(teamsError.message || 'Enhanced extraction methods failed to retrieve transcript from Teams.');
        }
        
        setAutoProcessing(false);
      } else {
        setError('This meeting was not created through Teams integration, so enhanced transcript extraction is not available.');
      }
    } catch (error: any) {
      console.error('Enhanced transcript loading error:', error);
      setError('An unexpected error occurred during enhanced transcript extraction. Please try again.');
      setAutoProcessing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDocuments = async () => {
    if (!transcript || !meeting) return;

    setSaving(true);
    try {
      const success = await saveTranscriptToDocuments(transcript, meeting.title, meeting.end_time);
      if (success) {
        toast({
          title: "Success",
          description: "Transcript has been saved to ISKCON Repository > Meeting Transcripts"
        });
      }
    } catch (error) {
      console.error('Error saving to documents:', error);
      toast({
        title: "Error",
        description: "Failed to save transcript to documents",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!transcript) return;

    const meetingDate = new Date(meeting.end_time || meeting.start_time).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');

    const content = `
Meeting: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}
Duration: ${Math.round((new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / (1000 * 60))} minutes

SUMMARY:
${transcript.summary || 'No summary available'}

PARTICIPANTS:
${transcript.participants?.map((p: any) => `- ${p.identity?.displayName || p.identity?.user?.displayName || p.emailAddress || 'Unknown'}`).join('\n') || 'No participants listed'}

TRANSCRIPT:
${transcript.transcript_content || 'No transcript content available'}

ACTION ITEMS:
${transcript.action_items?.map((item: any, index: number) => `${index + 1}. ${item.text || item}`).join('\n') || 'No action items'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title}_${meetingDate}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleForceRefresh = async () => {
    // First refresh the Microsoft token if needed
    if (isExpired) {
      console.log('Refreshing Microsoft token before transcript fetch...');
      await forceRefresh();
    }
    loadTranscript(true);
  };

  useEffect(() => {
    if (open && meeting) {
      loadTranscript();
    }
  }, [open, meeting]);

  if (!meeting) return null;

  const hasTeamsIntegration = !!meeting.teams_meeting_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Enhanced Meeting Transcript & Notes</span>
          </DialogTitle>
          <DialogDescription>{meeting.title}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{new Date(meeting.start_time).toLocaleDateString()}</span>
              </div>
              {transcript?.participants && (
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{transcript.participants.length} participants</span>
                </div>
              )}
              {hasTeamsIntegration ? (
                <Badge variant="outline" className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Enhanced Teams Integration</span>
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>No Teams Integration</span>
                </Badge>
              )}
              {!isConnected && (
                <Badge variant="destructive" className="flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Microsoft Disconnected</span>
                </Badge>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadTranscript(false)}
                disabled={loading || autoProcessing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(loading || autoProcessing) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {hasTeamsIntegration && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    if (isExpired) await forceRefresh();
                    loadTranscript(true);
                  }}
                  disabled={loading || autoProcessing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${(loading || autoProcessing) ? 'animate-spin' : ''}`} />
                  Enhanced Extract
                </Button>
              )}
              {transcript && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const meetingDate = new Date(meeting.end_time || meeting.start_time).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      }).replace(/\//g, '-');

                      const content = `
Meeting: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}
Duration: ${Math.round((new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / (1000 * 60))} minutes

SUMMARY:
${transcript.summary || 'No summary available'}

PARTICIPANTS:
${transcript.participants?.map((p: any) => `- ${p.identity?.displayName || p.identity?.user?.displayName || p.emailAddress || 'Unknown'}`).join('\n') || 'No participants listed'}

TRANSCRIPT:
${transcript.transcript_content || 'No transcript content available'}

ACTION ITEMS:
${transcript.action_items?.map((item: any, index: number) => `${index + 1}. ${item.text || item}`).join('\n') || 'No action items'}
                      `.trim();

                      const blob = new Blob([content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${meeting.title}_${meetingDate}_transcript.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      if (!transcript || !meeting) return;
                      setSaving(true);
                      try {
                        const success = await saveTranscriptToDocuments(transcript, meeting.title, meeting.end_time);
                        if (success) {
                          toast({
                            title: "Success",
                            description: "Transcript has been saved to ISKCON Repository > Meeting Transcripts"
                          });
                        }
                      } catch (error) {
                        console.error('Error saving to documents:', error);
                        toast({
                          title: "Error",
                          description: "Failed to save transcript to documents",
                          variant: "destructive"
                        });
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save to Repository'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {(loading || autoProcessing) && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">
                {autoProcessing ? 'Running enhanced transcript extraction with multiple strategies...' : 'Loading transcript...'}
              </p>
              {autoProcessing && (
                <div className="text-sm text-gray-500 mt-2 space-y-1">
                  <p>• Searching through online meetings and calendar events</p>
                  <p>• Checking call records and meeting recordings</p>
                  <p>• Attempting multiple transcript extraction methods</p>
                  <p>• Processing various content formats (VTT, plain text, JSON)</p>
                  <p>• Progressive retry with intelligent backoff</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800">Enhanced Transcript Extraction Result</h3>
                  <p className="text-yellow-700 text-sm mt-1">{error}</p>
                  
                  {detailedInfo && (
                    <div className="mt-3 text-xs text-yellow-600 bg-yellow-100 p-2 rounded">
                      <p><strong>Enhanced Extraction Details:</strong></p>
                      {detailedInfo.foundWith && <p>Meeting discovered via: {detailedInfo.foundWith}</p>}
                      {detailedInfo.transcriptMethod && <p>Transcript method used: {detailedInfo.transcriptMethod}</p>}
                      {detailedInfo.hasRecordings && <p>Recordings found: Yes</p>}
                      {detailedInfo.extractionDetails?.strategiesAttempted && (
                        <p>Strategies attempted: {detailedInfo.extractionDetails.strategiesAttempted.join(', ')}</p>
                      )}
                      {detailedInfo.suggestion && (
                        <div className="mt-2">
                          <p><strong>Suggestion:</strong></p>
                          <p>{detailedInfo.suggestion}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-3 text-sm text-yellow-700">
                    <p><strong>Enhanced extraction capabilities:</strong></p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Multiple transcript API endpoints (v1.0 and beta)</li>
                      <li>Advanced meeting discovery across calendar and calls</li>
                      <li>Call records and recording metadata analysis</li>
                      <li>Multiple content format processing (VTT, text, JSON)</li>
                      <li>Progressive retry with intelligent backoff</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && !autoProcessing && !transcript && !error && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No transcript available for this meeting</p>
              {hasTeamsIntegration ? (
                <div className="text-sm mt-2 space-y-1">
                  <p>This meeting has Teams integration but no transcript was found.</p>
                  <p>Try the "Enhanced Extract" button to attempt comprehensive extraction.</p>
                </div>
              ) : (
                <p className="text-sm mt-2">
                  This meeting was not created through Teams integration.
                </p>
              )}
            </div>
          )}

          {transcript && (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-6">
                {transcript.summary && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-gray-700">{transcript.summary}</p>
                    </div>
                  </div>
                )}

                {transcript.participants && transcript.participants.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Participants</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {transcript.participants.map((participant: any, index: number) => (
                        <Badge key={index} variant="outline">
                          {participant.identity?.displayName || 
                           participant.identity?.user?.displayName || 
                           participant.emailAddress || 
                           `Participant ${index + 1}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {transcript.action_items && transcript.action_items.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Action Items</h3>
                    <div className="space-y-2">
                      {transcript.action_items.map((item: any, index: number) => (
                        <div key={index} className="flex items-start space-x-2">
                          <span className="text-sm text-gray-500 mt-1">{index + 1}.</span>
                          <span className="text-sm">{item.text || item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {transcript.transcript_content && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Full Transcript</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                        {transcript.transcript_content}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
