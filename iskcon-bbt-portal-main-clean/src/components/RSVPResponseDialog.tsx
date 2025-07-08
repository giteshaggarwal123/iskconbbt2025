import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, Users, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useMeetings } from '@/hooks/useMeetings';

interface RSVPResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: any;
}

interface AttendeeResponse {
  id: string;
  user_id: string;
  rsvp_response: 'yes' | 'no' | 'maybe' | null;
  rsvp_submitted_at: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  is_manual: boolean;
}

function normalizeManualAttendees(manual_attendees: any): { email: string, rsvp: 'yes' | 'no' | 'maybe' | null }[] {
  if (!manual_attendees) return [];
  let arr: any[] = [];
  if (typeof manual_attendees === 'string') {
    try {
      arr = JSON.parse(manual_attendees);
    } catch { return []; }
  } else if (Array.isArray(manual_attendees)) {
    arr = manual_attendees;
  } else {
    return [];
  }
  return arr
    .map((a) => {
      if (typeof a === 'string') {
        try {
          const obj = JSON.parse(a);
          if (obj && typeof obj.email === 'string') return { email: obj.email, rsvp: (obj.rsvp === 'yes' || obj.rsvp === 'no' || obj.rsvp === 'maybe') ? obj.rsvp : null };
        } catch { return null; }
        return { email: a, rsvp: null };
      }
      if (a && typeof a.email === 'string') {
        return { email: a.email, rsvp: (a.rsvp === 'yes' || a.rsvp === 'no' || a.rsvp === 'maybe') ? a.rsvp : null };
      }
      return null;
    })
    .filter(Boolean) as { email: string, rsvp: 'yes' | 'no' | 'maybe' | null }[];
}

export const RSVPResponseDialog: React.FC<RSVPResponseDialogProps> = ({ 
  open, 
  onOpenChange, 
  meeting: initialMeeting 
}) => {
  const [attendeeResponses, setAttendeeResponses] = useState<AttendeeResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const { updateMeeting } = useMeetings();

  const fetchAttendeeResponses = async () => {
    if (!initialMeeting) return;
    setLoading(true);
    try {
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('meeting_attendees')
        .select('id, user_id, rsvp_response, rsvp_submitted_at')
        .eq('meeting_id', initialMeeting.id)
        .order('rsvp_submitted_at', { ascending: false, nullsFirst: false });
      if (attendeesError) throw attendeesError;
      const userIds = attendeesData.map(attendee => attendee.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      if (profilesError) throw profilesError;
      const registeredAttendees = attendeesData.map(attendee => {
        const profile = profilesData?.find(p => p.id === attendee.user_id);
        return {
          ...attendee,
          rsvp_response: attendee.rsvp_response as 'yes' | 'no' | 'maybe' | null,
          profiles: profile ? {
            first_name: profile.first_name || 'Unknown',
            last_name: profile.last_name || 'User',
            email: profile.email || 'No email'
          } : null,
          is_manual: false
        };
      });
      const manualAttendees = normalizeManualAttendees(initialMeeting.manual_attendees).map((a) => ({
        email: a.email,
        rsvp: (a.rsvp === 'yes' || a.rsvp === 'no' || a.rsvp === 'maybe') ? a.rsvp : null
      }));
      const combinedData: AttendeeResponse[] = [
        ...registeredAttendees,
        ...manualAttendees.map((a) => ({
          id: `manual-${a.email}`,
          user_id: '',
          rsvp_response: a.rsvp,
          rsvp_submitted_at: null,
          profiles: {
            first_name: 'External',
            last_name: 'Attendee',
            email: a.email
          },
          is_manual: true
        }))
      ];
      setAttendeeResponses(combinedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load RSVP responses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && initialMeeting) {
      fetchAttendeeResponses();
    }
  }, [open, initialMeeting]);

  useEffect(() => {
    if (!open || !initialMeeting) return;
    const channel = supabase
      .channel(`rsvp-updates-${initialMeeting.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_attendees',
          filter: `meeting_id=eq.${initialMeeting.id}`
        },
        (payload) => {
          fetchAttendeeResponses();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, initialMeeting]);

  let myResponse = attendeeResponses.find(r => r.user_id === user?.id);
  if (!myResponse && user?.email) {
    myResponse = attendeeResponses.find(r => (r.profiles?.email?.toLowerCase() ?? '') === (user.email?.toLowerCase() ?? ''));
  }

  const handleRSVP = async (response: 'yes' | 'no' | 'maybe') => {
    if (!initialMeeting || !user) return;
    setUpdating(true);
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('meeting_attendees')
        .select('id')
        .eq('meeting_id', initialMeeting.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!existing) {
        const { error: insertError } = await supabase
          .from('meeting_attendees')
          .insert({ meeting_id: initialMeeting.id, user_id: user.id, rsvp_response: response, rsvp_submitted_at: new Date().toISOString() });
        if (insertError) throw insertError;
      } else {
        const { error } = await supabase
          .from('meeting_attendees')
          .update({ rsvp_response: response, rsvp_submitted_at: new Date().toISOString() })
          .eq('meeting_id', initialMeeting.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
      toast({ title: 'RSVP Updated', description: `Your response: ${response.charAt(0).toUpperCase() + response.slice(1)}` });
      fetchAttendeeResponses();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update RSVP', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  if (!initialMeeting) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent style={{ zIndex: 20000, position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxHeight: '90vh', overflowY: 'auto', background: 'white' }} className="sm:max-w-[400px] w-full max-w-lg flex flex-col items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 p-2 rounded hover:bg-gray-100 focus:outline-none z-20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 font-semibold">No meeting data found.<br />Please try again.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const responseStats = {
    yes: attendeeResponses.filter(r => !r.is_manual && r.rsvp_response === 'yes').length,
    no: attendeeResponses.filter(r => !r.is_manual && r.rsvp_response === 'no').length,
    maybe: attendeeResponses.filter(r => !r.is_manual && r.rsvp_response === 'maybe').length,
    pending: attendeeResponses.filter(r => !r.is_manual && !r.rsvp_response).length,
    external: attendeeResponses.filter(r => r.is_manual).length
  };

  const getRSVPIcon = (response: 'yes' | 'no' | 'maybe' | null) => {
    switch (response) {
      case 'yes':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'no':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'maybe':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRSVPBadge = (response: 'yes' | 'no' | 'maybe' | null) => {
    switch (response) {
      case 'yes':
        return <Badge className="bg-green-100 text-green-800">Yes</Badge>;
      case 'no':
        return <Badge className="bg-red-100 text-red-800">No</Badge>;
      case 'maybe':
        return <Badge className="bg-yellow-100 text-yellow-800">Maybe</Badge>;
      default:
        return <Badge variant="outline">No Response</Badge>;
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
        className="sm:max-w-[800px] w-full max-w-lg overflow-y-auto relative"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 p-2 rounded hover:bg-gray-100 focus:outline-none z-20"
        >
          <X className="h-5 w-5" />
        </button>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>RSVP Responses</span>
          </DialogTitle>
          <DialogDescription>
            View attendee responses for "{initialMeeting.title}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {myResponse && (
            <Card className="mb-2">
              <CardHeader>
                <CardTitle>Your Response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button
                    variant={myResponse.rsvp_response === 'yes' ? 'default' : 'outline'}
                    onClick={() => handleRSVP('yes')}
                    disabled={updating}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Yes
                  </Button>
                  <Button
                    variant={myResponse.rsvp_response === 'no' ? 'destructive' : 'outline'}
                    onClick={() => handleRSVP('no')}
                    disabled={updating}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> No
                  </Button>
                  <Button
                    variant={myResponse.rsvp_response === 'maybe' ? 'secondary' : 'outline'}
                    onClick={() => handleRSVP('maybe')}
                    disabled={updating}
                  >
                    <Clock className="h-4 w-4 mr-1" /> Maybe
                  </Button>
                  <span className="ml-4">{getRSVPBadge(myResponse.rsvp_response)}</span>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">{responseStats.yes}</span>
                </div>
                <p className="text-sm text-gray-600">Yes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-2xl font-bold text-red-600">{responseStats.no}</span>
                </div>
                <p className="text-sm text-gray-600">No</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="text-2xl font-bold text-yellow-600">{responseStats.maybe}</span>
                </div>
                <p className="text-sm text-gray-600">Maybe</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-2xl font-bold text-gray-600">{responseStats.pending}</span>
                </div>
                <p className="text-sm text-gray-600">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-600">{responseStats.external}</span>
                </div>
                <p className="text-sm text-gray-600">External</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>All Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Submitted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendeeResponses.map((attendee) => (
                    <TableRow key={attendee.id}>
                      <TableCell>
                        {attendee.profiles ? `${attendee.profiles.first_name} ${attendee.profiles.last_name}` : 'External Attendee'}
                      </TableCell>
                      <TableCell>{attendee.profiles?.email || ''}</TableCell>
                      <TableCell>{getRSVPBadge(attendee.rsvp_response)}</TableCell>
                      <TableCell>{attendee.rsvp_submitted_at ? format(new Date(attendee.rsvp_submitted_at), 'PPpp') : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
