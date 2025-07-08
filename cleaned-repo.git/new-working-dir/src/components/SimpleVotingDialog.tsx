import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Vote, Clock, Users, AlertCircle, ThumbsUp, ThumbsDown, Minus, CheckCircle, RefreshCw } from 'lucide-react';
import { useVoting } from '@/hooks/useVoting';
import { Poll, PollAttachment } from '@/hooks/usePolls';
import { format, differenceInSeconds, formatDuration, intervalToDuration, isBefore } from 'date-fns';
import { toast } from 'sonner';
import { PollAttachments } from './PollAttachments';
import { DocumentViewer } from './DocumentViewer';

interface SimpleVotingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poll: Poll | null;
}

interface VoteSelections {
  [questionId: string]: 'favor' | 'against' | 'abstain';
}

export const SimpleVotingDialog: React.FC<SimpleVotingDialogProps> = ({ open, onOpenChange, poll }) => {
  const [comment, setComment] = useState('');
  const [voteSelections, setVoteSelections] = useState<VoteSelections>({});
  const [eligibility, setEligibility] = useState<{ canVote: boolean; reason: string | null }>({ canVote: true, reason: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  const { submitVotes, checkVotingEligibility, getUserVotes } = useVoting();

  // Reset state when dialog opens/closes or poll changes
  useEffect(() => {
    if (poll && open) {
      console.log('Dialog opened for poll:', poll.id);
      initializeDialog();
    } else if (!open) {
      // Reset when dialog closes
      resetState();
    }
  }, [poll, open]);

  useEffect(() => {
    if (!poll?.deadline) return;
    const update = () => {
      const now = new Date();
      const deadline = new Date(poll.deadline);
      if (isBefore(deadline, now)) {
        setTimeLeft('Poll closed');
        return;
      }
      const duration = intervalToDuration({ start: now, end: deadline });
      setTimeLeft(formatDuration(duration, { format: ['days', 'hours', 'minutes', 'seconds'] }) + ' left');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [poll?.deadline]);

  const resetState = () => {
    setVoteSelections({});
    setComment('');
    setEligibility({ canVote: true, reason: null });
    setIsSubmitting(false);
    setIsLoading(false);
  };

  const initializeDialog = async () => {
    if (!poll) return;
    
    setIsLoading(true);
    setVoteSelections({});
    setComment('');
    setIsSubmitting(false);
    
    try {
      console.log('Checking eligibility for poll:', poll.id);
      
      // Check if user can vote
      const eligibilityResult = await checkVotingEligibility(poll.id);
      console.log('Eligibility result:', eligibilityResult);
      setEligibility(eligibilityResult);
      
      // If user can't vote, check if they have existing votes to display
      if (!eligibilityResult.canVote) {
        console.log('User cannot vote, checking for existing votes');
        const existingVotes = await getUserVotes(poll.id);
        if (existingVotes && existingVotes.length > 0) {
          console.log('Found existing votes:', existingVotes);
          const voteMap: VoteSelections = {};
          existingVotes.forEach(vote => {
            voteMap[vote.sub_poll_id] = vote.vote as 'favor' | 'against' | 'abstain';
          });
          setVoteSelections(voteMap);
          
          // Set comment from first vote that has one
          const voteWithComment = existingVotes.find(vote => vote.comment);
          if (voteWithComment) {
            setComment(voteWithComment.comment || '');
          }
        }
      }
    } catch (error) {
      console.error('Error initializing dialog:', error);
      toast.error('Failed to load voting data');
      setEligibility({ canVote: false, reason: 'Failed to load voting data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoteSelection = (subPollId: string, vote: 'favor' | 'against' | 'abstain') => {
    console.log('Vote selection changed:', { subPollId, vote });
    
    setVoteSelections(prev => {
      const newSelections = {
        ...prev,
        [subPollId]: vote
      };
      console.log('Updated vote selections:', newSelections);
      return newSelections;
    });
  };

  const allQuestionsAnswered = poll?.sub_polls?.every(subPoll => 
    voteSelections.hasOwnProperty(subPoll.id)
  ) || false;

  const handleSubmit = async () => {
    if (!poll || !allQuestionsAnswered || isSubmitting) {
      console.log('Submit blocked:', { poll: !!poll, allQuestionsAnswered, isSubmitting });
      if (!allQuestionsAnswered) {
        toast.error('Please answer all questions before submitting');
      }
      return;
    }

    console.log('Starting vote submission for poll:', poll.id);
    console.log('Vote selections:', voteSelections);
    console.log('Comment:', comment);

    setIsSubmitting(true);

    try {
      const votes = Object.entries(voteSelections).map(([subPollId, vote]) => ({
        subPollId,
        vote
      }));
      
      console.log('Formatted votes for submission:', votes);
      
      const success = await submitVotes({
        pollId: poll.id,
        votes: votes,
        comment: comment.trim() || undefined
      });

      console.log('Vote submission result:', success);

      if (success) {
        toast.success('Your votes have been submitted successfully!');
        onOpenChange(false);
        resetState();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('An error occurred while submitting votes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    console.log('Retrying initialization');
    initializeDialog();
  };

  const handleViewDocument = (attachment: PollAttachment) => {
    // Convert PollAttachment to the format expected by DocumentViewer
    const documentForViewer = {
      id: attachment.id,
      name: attachment.file_name,
      file_path: attachment.file_path,
      file_size: attachment.file_size,
      mime_type: attachment.mime_type,
      uploaded_by: attachment.uploaded_by,
      created_at: attachment.created_at
    };
    setSelectedDocument(documentForViewer);
    setIsDocumentViewerOpen(true);
  };

  const handleCloseDocumentViewer = () => {
    setIsDocumentViewerOpen(false);
    setSelectedDocument(null);
  };

  if (!poll) return null;

  const voteOptions = [
    {
      value: 'favor',
      label: 'In Favour',
      icon: ThumbsUp,
      color: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700',
      selectedColor: 'bg-green-100 border-green-400 ring-2 ring-green-200'
    },
    {
      value: 'against',
      label: 'Against',
      icon: ThumbsDown,
      color: 'bg-red-50 border-red-200 hover:bg-red-100 text-red-700',
      selectedColor: 'bg-red-100 border-red-400 ring-2 ring-red-200'
    },
    {
      value: 'abstain',
      label: 'Abstain',
      icon: Minus,
      color: 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700',
      selectedColor: 'bg-gray-100 border-gray-400 ring-2 ring-gray-200'
    }
  ];

  const answeredCount = Object.keys(voteSelections).length;
  const totalQuestions = poll.sub_polls?.length || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Vote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{poll.title}</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  {poll.description}
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Deadline: {format(new Date(poll.deadline), 'MMM dd, yyyy HH:mm')}</span>
                <span className="ml-2 font-semibold text-primary">{timeLeft}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{poll.stats?.total_voters || 0} eligible voters</span>
              </div>
              <Badge variant={poll.status === 'active' ? 'default' : 'secondary'}>
                {poll.status}
              </Badge>
              {poll.is_secret && (
                <Badge variant="outline">Secret Ballot</Badge>
              )}
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-gray-600">Loading voting data...</p>
              </div>
            </div>
          ) : !eligibility.canVote && eligibility.reason?.includes('Network') ? (
            <div className="flex items-center justify-center py-12">
              <Card className="max-w-md mx-auto text-center">
                <CardContent className="p-8">
                  <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-700 mb-2">Connection Error</h3>
                  <p className="text-gray-600 mb-4">{eligibility.reason}</p>
                  <Button onClick={handleRetry} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : !eligibility.canVote && !eligibility.reason?.includes('already voted') ? (
            <div className="flex items-center justify-center py-12">
              <Card className="max-w-md mx-auto text-center">
                <CardContent className="p-8">
                  <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-700 mb-2">Cannot Vote</h3>
                  <p className="text-gray-600">{eligibility.reason}</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Poll Attachments Section - Show before questions */}
              {poll?.attachments && poll.attachments.length > 0 && (
                <PollAttachments 
                  attachments={poll.attachments} 
                  onViewDocument={handleViewDocument}
                />
              )}

              {/* Questions List */}
              <div className="space-y-6">
                {poll.sub_polls?.map((question, index) => (
                  <Card key={question.id} className="border-2">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">
                              Question {index + 1}: {question.title}
                            </h3>
                            {question.description && (
                              <p className="text-gray-600 text-sm mb-4">{question.description}</p>
                            )}
                          </div>
                          {voteSelections[question.id] && (
                            <CheckCircle className="h-5 w-5 text-green-600 ml-4 flex-shrink-0" />
                          )}
                        </div>

                        {/* Vote Options */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {voteOptions.map((option) => {
                            const isSelected = voteSelections[question.id] === option.value;
                            const Icon = option.icon;
                            
                            return (
                              <button
                                key={option.value}
                                onClick={() => eligibility.canVote && handleVoteSelection(question.id, option.value as 'favor' | 'against' | 'abstain')}
                                disabled={!eligibility.canVote}
                                className={`p-4 border-2 rounded-lg transition-all duration-200 text-left ${
                                  isSelected ? option.selectedColor : option.color
                                } ${!eligibility.canVote ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Icon className="h-5 w-5" />
                                  <span className="font-medium">{option.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {eligibility.canVote && (
                <>
                  {/* Progress Summary */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-900">
                          Progress: {answeredCount} of {totalQuestions} questions answered
                        </span>
                        <Badge variant={allQuestionsAnswered ? "default" : "secondary"}>
                          {allQuestionsAnswered ? "Ready to Submit" : "In Progress"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comment Section */}
                  <Card>
                    <CardContent className="p-6">
                      <Label className="text-base font-medium mb-3 block">
                        Additional Comments (Optional)
                      </Label>
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your thoughts about this vote..."
                        rows={3}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>

                  {/* Submit Section */}
                  <div className="space-y-4 pt-4 border-t">
                    {!allQuestionsAnswered && (
                      <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 text-amber-800">
                            <AlertCircle className="h-5 w-5" />
                            <p className="text-sm font-medium">
                              Please answer all {totalQuestions} questions before submitting your vote.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex gap-3 justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => onOpenChange(false)} 
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSubmit}
                        disabled={!allQuestionsAnswered || isSubmitting}
                        className="min-w-[150px]"
                      >
                        <Vote className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Submitting...' : 'Submit All Votes'}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Show submitted votes for reference */}
              {!eligibility.canVote && eligibility.reason?.includes('already voted') && Object.keys(voteSelections).length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Your Submitted Votes</h3>
                    <p className="text-sm text-gray-500">Below are the votes you previously submitted</p>
                  </div>
                  
                  {comment && (
                    <Card>
                      <CardContent className="p-6">
                        <Label className="text-base font-medium mb-3 block">
                          Your Comment
                        </Label>
                        <div className="bg-gray-100 p-3 rounded border text-gray-700">
                          {comment}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Viewer Modal */}
      <DocumentViewer
        isOpen={isDocumentViewerOpen}
        onClose={handleCloseDocumentViewer}
        document={selectedDocument}
        documentType="poll_attachment"
      />
    </>
  );
};
