import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, XCircle, MinusCircle, Users, Calendar, Clock, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { Poll } from '@/hooks/usePolls';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface PollResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poll: Poll | null;
}

interface MemberVotingStatus {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  has_voted: boolean;
  voted_at: string | null;
}

interface VoteResults {
  [subPollId: string]: {
    favor: number;
    against: number;
    abstain: number;
    total: number;
  };
}

export const PollResultsDialog: React.FC<PollResultsDialogProps> = ({ open, onOpenChange, poll }) => {
  const [memberStatuses, setMemberStatuses] = useState<MemberVotingStatus[]>([]);
  const [voteResults, setVoteResults] = useState<VoteResults>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [selectedTab, setSelectedTab] = useState(poll?.sub_polls?.[0]?.id || '');
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    if (poll && open) {
      fetchMemberVotingStatus();
      fetchVoteResults();
    }
  }, [poll, open]);

  const fetchMemberVotingStatus = async () => {
    if (!poll) return;
    
    setLoadingMembers(true);
    try {
      // Get all members
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .order('first_name');

      if (profilesError) throw profilesError;

      // Get voting status for each member
      const { data: votes, error: votesError } = await supabase
        .from('poll_votes')
        .select('user_id, voted_at')
        .eq('poll_id', poll.id);

      if (votesError) throw votesError;

      // Create a map of user votes
      const votesMap = new Map();
      votes?.forEach(vote => {
        if (!votesMap.has(vote.user_id)) {
          votesMap.set(vote.user_id, vote.voted_at);
        }
      });

      // Combine profiles with voting status
      const memberStatuses: MemberVotingStatus[] = profiles?.map(profile => ({
        id: profile.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        avatar_url: profile.avatar_url,
        has_voted: votesMap.has(profile.id),
        voted_at: votesMap.get(profile.id) || null
      })) || [];

      setMemberStatuses(memberStatuses);
    } catch (error) {
      console.error('Error fetching member voting status:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchVoteResults = async () => {
    if (!poll) return;
    
    setLoadingResults(true);
    try {
      console.log('Fetching vote results for poll:', poll.id);
      
      // Get all votes for this poll
      const { data: votes, error } = await supabase
        .from('poll_votes')
        .select('sub_poll_id, vote')
        .eq('poll_id', poll.id);

      if (error) throw error;

      console.log('Retrieved votes:', votes);

      // Initialize results object
      const results: VoteResults = {};
      
      // Initialize each sub-poll with zero counts
      poll.sub_polls?.forEach(subPoll => {
        results[subPoll.id] = {
          favor: 0,
          against: 0,
          abstain: 0,
          total: 0
        };
      });

      // Count votes for each sub-poll
      votes?.forEach(vote => {
        if (results[vote.sub_poll_id]) {
          if (vote.vote === 'favor') {
            results[vote.sub_poll_id].favor++;
          } else if (vote.vote === 'against') {
            results[vote.sub_poll_id].against++;
          } else if (vote.vote === 'abstain') {
            results[vote.sub_poll_id].abstain++;
          }
          results[vote.sub_poll_id].total++;
        }
      });

      console.log('Calculated results:', results);
      setVoteResults(results);
    } catch (error) {
      console.error('Error fetching vote results:', error);
    } finally {
      setLoadingResults(false);
    }
  };

  if (!poll) return null;

  const votedMembers = memberStatuses.filter(m => m.has_voted);
  const pendingMembers = memberStatuses.filter(m => !m.has_voted);

  const getVotePercentage = (count: number, total: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  const getWinningOption = (results: { favor: number; against: number; abstain: number; total: number }) => {
    if (results.total === 0) return null;
    
    const max = Math.max(results.favor, results.against, results.abstain);
    if (results.favor === max && results.favor > 0) return 'favor';
    if (results.against === max && results.against > 0) return 'against';
    if (results.abstain === max && results.abstain > 0) return 'abstain';
    return null;
  };

  const getResultBadge = (winningOption: string | null) => {
    if (!winningOption) return <Badge variant="secondary">No Votes</Badge>;
    
    switch (winningOption) {
      case 'favor':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Passed</Badge>;
      case 'against':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'abstain':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><MinusCircle className="h-3 w-3 mr-1" />Abstained</Badge>;
      default:
        return <Badge variant="secondary">No Result</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          zIndex: 20000,
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'white',
        }}
        className="sm:max-w-[700px] w-full max-w-lg overflow-y-auto relative"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 p-2 rounded hover:bg-gray-100 focus:outline-none z-20"
        >
          <XCircle className="h-5 w-5" />
        </button>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Poll Results</span>
          </DialogTitle>
          <DialogDescription>
            View voting results for each question
          </DialogDescription>
        </DialogHeader>
        {/* Compact Poll Overview */}
        <Card className="mb-4">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-base">{poll.title}</CardTitle>
            {poll.description && <p className="text-xs text-muted-foreground mt-1">{poll.description}</p>}
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 items-center py-2 px-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(poll.deadline), 'MMM dd, yyyy HH:mm')}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {poll.stats?.voted_count || 0}/{poll.stats?.total_voters || 0} voted</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Badge variant={poll.status === 'active' ? 'default' : 'secondary'}>{poll.status}</Badge></div>
          </CardContent>
        </Card>
        {/* Tabs for Questions */}
        {poll.sub_polls && poll.sub_polls.length > 0 && (
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-4">
            <TabsList className="flex flex-wrap gap-2 mb-2">
              {poll.sub_polls.map((subPoll, idx) => (
                <TabsTrigger key={subPoll.id} value={subPoll.id} aria-label={`Question ${idx + 1}`}>Q{idx + 1}</TabsTrigger>
              ))}
            </TabsList>
            {poll.sub_polls.map((subPoll, idx) => {
              const results = voteResults[subPoll.id] || { favor: 0, against: 0, abstain: 0, total: 0 };
              const winningOption = getWinningOption(results);
              return (
                <TabsContent key={subPoll.id} value={subPoll.id}>
                  <Card className="mb-4">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Question {idx + 1}: {subPoll.title}</CardTitle>
                        {getResultBadge(winningOption)}
                      </div>
                      {subPoll.description && <p className="text-xs text-muted-foreground mt-1">{subPoll.description}</p>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* For Votes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2"><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-sm font-medium">For</span></div>
                          <span className="text-sm text-muted-foreground">{results.favor} votes ({getVotePercentage(results.favor, results.total)}%)</span>
                        </div>
                        <Progress value={getVotePercentage(results.favor, results.total)} className="h-2" />
                      </div>
                      {/* Against Votes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2"><XCircle className="h-4 w-4 text-red-600" /><span className="text-sm font-medium">Against</span></div>
                          <span className="text-sm text-muted-foreground">{results.against} votes ({getVotePercentage(results.against, results.total)}%)</span>
                        </div>
                        <Progress value={getVotePercentage(results.against, results.total)} className="h-2" />
                      </div>
                      {/* Abstain Votes */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2"><MinusCircle className="h-4 w-4 text-yellow-600" /><span className="text-sm font-medium">Abstain</span></div>
                          <span className="text-sm text-muted-foreground">{results.abstain} votes ({getVotePercentage(results.abstain, results.total)}%)</span>
                        </div>
                        <Progress value={getVotePercentage(results.abstain, results.total)} className="h-2" />
                      </div>
                      {results.total > 0 && (<div className="mt-3 pt-3 border-t"><p className="text-sm text-muted-foreground">Total votes: {results.total}</p></div>)}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
        {/* Collapsible Member Voting Status */}
        <Card className="mb-4">
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer select-none" onClick={() => setShowMembers(v => !v)} aria-label="Toggle Member Voting Status">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-base font-medium">Member Voting Status</span>
              <span className="text-xs text-muted-foreground">({votedMembers.length}/{memberStatuses.length} voted)</span>
            </div>
            <Button size="icon" variant="ghost" aria-label={showMembers ? 'Collapse' : 'Expand'}>
              {showMembers ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </CardHeader>
          {showMembers && (
            <CardContent>
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Voted Members */}
                    <div>
                      <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Voted ({votedMembers.length})
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {votedMembers.length > 0 ? (
                          votedMembers.map((member) => (
                            <div key={member.id} className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar_url || ''} />
                                <AvatarFallback>
                                  {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {member.first_name} {member.last_name}
                                </p>
                                {member.voted_at && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(member.voted_at), 'MMM dd, HH:mm')}
                                  </p>
                                )}
                              </div>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No votes cast yet</p>
                        )}
                      </div>
                    </div>

                    {/* Pending Members */}
                    <div>
                      <h4 className="font-medium text-orange-700 mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Pending ({pendingMembers.length})
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {pendingMembers.length > 0 ? (
                          pendingMembers.map((member) => (
                            <div key={member.id} className="flex items-center space-x-3 p-2 bg-orange-50 rounded-lg">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar_url || ''} />
                                <AvatarFallback>
                                  {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {member.first_name} {member.last_name}
                                </p>
                                <p className="text-xs text-gray-500">{member.email}</p>
                              </div>
                              <Clock className="h-4 w-4 text-orange-600" />
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">All members have voted</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Voting Progress</span>
                      <span>{votedMembers.length}/{memberStatuses.length} members</span>
                    </div>
                    <Progress 
                      value={memberStatuses.length > 0 ? (votedMembers.length / memberStatuses.length) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
        {/* Secret Ballot Notice */}
        {poll.is_secret && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-2">
            <p className="text-sm text-yellow-800">
              <strong>Secret Ballot:</strong> Individual votes are anonymous and cannot be traced back to specific voters. Only participation status is shown above.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
