import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, UserX, AlertTriangle, Clock } from 'lucide-react';
import { Poll, usePolls } from '@/hooks/usePolls';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReopenPollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poll: Poll | null;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const TIME_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
  { value: '1440', label: '24 hours' },
];

export const ReopenPollDialog: React.FC<ReopenPollDialogProps> = ({ open, onOpenChange, poll }) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<string>('30');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const { resetUserVotes, resetAllVotes, refetch } = usePolls();

  useEffect(() => {
    if (open && poll) {
      fetchProfiles();
    }
  }, [open, poll]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleReopenPoll = async () => {
    if (!poll) return;
    
    setLoading(true);
    try {
      // Use the database function to reopen poll with time limit
      const { error } = await supabase.rpc('reopen_poll_with_deadline', {
        poll_id_param: poll.id,
        minutes_param: parseInt(selectedDuration)
      });

      if (error) throw error;

      toast.success(`Poll reopened for ${TIME_OPTIONS.find(opt => opt.value === selectedDuration)?.label}`);
      await refetch();
      onOpenChange(false);
    } catch (error) {
      console.error('Error reopening poll:', error);
      toast.error('Failed to reopen poll');
    } finally {
      setLoading(false);
    }
  };

  const handleResetUserVotes = async () => {
    if (!poll || !selectedUser) return;
    
    setLoading(true);
    await resetUserVotes(poll.id, selectedUser);
    setLoading(false);
    setSelectedUser('');
  };

  const handleResetAllVotes = async () => {
    if (!poll) return;
    
    if (confirm('Are you sure you want to reset ALL votes? This action cannot be undone.')) {
      setLoading(true);
      await resetAllVotes(poll.id);
      setLoading(false);
    }
  };

  if (!poll) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white">
        {/* Close button, absolutely positioned in the top-right corner */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 p-2 rounded hover:bg-gray-100 focus:outline-none z-20"
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>Reopen Poll</span>
          </DialogTitle>
          <DialogDescription>
            Manage poll reopening and vote resets for completed polls
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Poll Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {poll.title}
                <Badge variant="secondary">Completed</Badge>
              </CardTitle>
              {poll.description && (
                <p className="text-sm text-muted-foreground">{poll.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Voters:</span>
                  <span className="ml-2 font-medium">{poll.stats?.total_voters || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Votes Cast:</span>
                  <span className="ml-2 font-medium">{poll.stats?.voted_count || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reopen Poll with Time Duration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Reopen Poll with Time Limit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reopen this completed poll for a specific duration. The poll will automatically close after the selected time.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Select Duration
                  </label>
                  <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reopening duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleReopenPoll}
                  disabled={loading}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {loading ? 'Reopening...' : `Reopen Poll for ${TIME_OPTIONS.find(opt => opt.value === selectedDuration)?.label}`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reset Individual User Votes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Reset Individual User Votes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reset votes for a specific user on this poll. The user will be able to vote again.
              </p>
              <div className="space-y-3">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user to reset votes" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.first_name || profile.last_name 
                          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                          : profile.email || 'Unknown User'
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleResetUserVotes}
                  disabled={!selectedUser || loading}
                  variant="outline"
                  className="w-full"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Reset User Votes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reset All Votes */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <Users className="h-4 w-4" />
                Reset All Votes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Warning</span>
                </div>
                <p className="text-sm text-destructive">
                  This will permanently delete ALL votes for this poll. This action cannot be undone.
                </p>
              </div>
              <Button 
                onClick={handleResetAllVotes}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Reset All Votes
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
