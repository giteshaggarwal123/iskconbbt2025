
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Users, CheckSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface RSVPSelectorProps {
  meeting: any;
  onResponseUpdate?: () => void;
  onViewRSVP?: (meeting: any) => void;
  hideReportButton?: boolean;
}

export const RSVPSelector: React.FC<RSVPSelectorProps> = ({ 
  meeting, 
  onResponseUpdate, 
  onViewRSVP,
  hideReportButton = false
}) => {
  const [currentResponse, setCurrentResponse] = useState<'yes' | 'no' | 'maybe' | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const userRole = useUserRole();

  // Check if meeting is upcoming
  const isUpcomingMeeting = meeting && new Date(meeting.start_time) > new Date();

  useEffect(() => {
    if (meeting && user) {
      fetchCurrentResponse();
    }
  }, [meeting, user]);

  const fetchCurrentResponse = async () => {
    if (!meeting || !user) return;
    
    setLoading(true);
    try {
      console.log('Fetching RSVP response for user:', user.id, 'meeting:', meeting.id);
      
      const { data, error } = await supabase
        .from('meeting_attendees')
        .select('rsvp_response')
        .eq('meeting_id', meeting.id)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching RSVP response:', error);
        throw error;
      }

      if (data) {
        console.log('Found existing RSVP response:', data.rsvp_response);
        setCurrentResponse(data.rsvp_response as 'yes' | 'no' | 'maybe' | null);
      } else {
        console.log('No existing RSVP response found');
        setCurrentResponse(null);
      }
    } catch (error: any) {
      console.error('Error fetching RSVP response:', error);
      // Don't show error to user as this is expected for new attendees
    } finally {
      setLoading(false);
    }
  };

  const handleResponseSubmit = async () => {
    if (!meeting || !user || !currentResponse) {
      console.error('Missing required data for RSVP submission:', { meeting: !!meeting, user: !!user, response: currentResponse });
      return;
    }

    setSubmitting(true);
    try {
      console.log('Submitting RSVP response:', {
        meetingId: meeting.id,
        userId: user.id,
        response: currentResponse
      });

      const now = new Date().toISOString();

      // First, try to update existing attendee record
      const { data: updateData, error: updateError } = await supabase
        .from('meeting_attendees')
        .update({
          rsvp_response: currentResponse,
          rsvp_submitted_at: now
        })
        .eq('meeting_id', meeting.id)
        .eq('user_id', user.id)
        .select();

      if (updateError) {
        console.error('Update failed, trying insert:', updateError);
        
        // If update fails, try to insert new record
        const { data: insertData, error: insertError } = await supabase
          .from('meeting_attendees')
          .insert({
            meeting_id: meeting.id,
            user_id: user.id,
            rsvp_response: currentResponse,
            rsvp_submitted_at: now,
            status: 'pending'
          })
          .select();

        if (insertError) {
          console.error('Insert also failed:', insertError);
          throw insertError;
        }

        console.log('Successfully inserted new RSVP record:', insertData);
      } else {
        console.log('Successfully updated existing RSVP record:', updateData);
      }

      toast({
        title: "RSVP Submitted",
        description: `Your response "${currentResponse}" has been saved successfully.`
      });

      // Notify parent component to refresh data
      if (onResponseUpdate) {
        onResponseUpdate();
      }

      // Refresh the current response to show the latest state
      await fetchCurrentResponse();

    } catch (error: any) {
      console.error('Error submitting RSVP:', error);
      
      let errorMessage = "Failed to submit your RSVP response. Please try again.";
      
      // Provide more specific error messages
      if (error.code === '23505') {
        errorMessage = "You have already submitted an RSVP for this meeting.";
      } else if (error.code === '23503') {
        errorMessage = "There was an issue with the meeting data. Please contact support.";
      } else if (error.message?.includes('permission')) {
        errorMessage = "You don't have permission to RSVP to this meeting. Please contact the organizer.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getResponseBadge = (response: 'yes' | 'no' | 'maybe' | null) => {
    if (!response) return <Badge variant="outline" className="text-xs">No Response</Badge>;
    
    switch (response) {
      case 'yes':
        return <Badge className="bg-green-100 text-green-800 text-xs">Yes</Badge>;
      case 'no':
        return <Badge className="bg-red-100 text-red-800 text-xs">No</Badge>;
      case 'maybe':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Maybe</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  // For past meetings, don't show anything
  if (!isUpcomingMeeting) {
    return null;
  }

  // For upcoming meetings, show full RSVP form
  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base md:text-lg">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 md:h-5 md:w-5" />
              <span>RSVP for this Meeting</span>
            </div>
            
            {/* Mobile: Show View RSVP button in header */}
            <div className="flex md:hidden gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewRSVP?.(meeting)}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs px-2 py-1 h-8"
              >
                <CheckSquare className="h-3 w-3 mr-1" />
                View RSVP
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Current Response Display */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Current Response:</span>
            {getResponseBadge(currentResponse)}
          </div>

          {/* Response Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">Select your response:</Label>
            
            <RadioGroup
              value={currentResponse || ""}
              onValueChange={(value) => setCurrentResponse(value as 'yes' | 'no' | 'maybe')}
              className="space-y-2"
            >
              {/* Yes Option */}
              <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 hover:bg-gray-50 ${
                currentResponse === 'yes' ? 'bg-green-50 border-green-200' : 'border-gray-200'
              }`}>
                <RadioGroupItem value="yes" id="yes" className="flex-shrink-0" />
                <Label htmlFor="yes" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">Yes, I will attend</span>
                </Label>
              </div>

              {/* No Option */}
              <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 hover:bg-gray-50 ${
                currentResponse === 'no' ? 'bg-red-50 border-red-200' : 'border-gray-200'
              }`}>
                <RadioGroupItem value="no" id="no" className="flex-shrink-0" />
                <Label htmlFor="no" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">No, I cannot attend</span>
                </Label>
              </div>

              {/* Maybe Option */}
              <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 hover:bg-gray-50 ${
                currentResponse === 'maybe' ? 'bg-yellow-50 border-yellow-200' : 'border-gray-200'
              }`}>
                <RadioGroupItem value="maybe" id="maybe" className="flex-shrink-0" />
                <Label htmlFor="maybe" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">Maybe, I'm not sure</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleResponseSubmit}
            disabled={!currentResponse || submitting}
            className="w-full h-10 text-sm font-semibold"
            size="default"
          >
            {submitting ? 'Submitting...' : 'Submit RSVP Response'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
